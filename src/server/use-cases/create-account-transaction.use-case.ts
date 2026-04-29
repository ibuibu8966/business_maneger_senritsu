import { prisma } from "@/lib/prisma"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { recomputeBalanceAfter } from "@/lib/recompute-balance-after"
import type { AccountTransactionDTO, AccountTransactionTypeDTO } from "@/types/dto"
import type { AccountTransactionType } from "@/generated/prisma/client"
import { BALANCE_DELTA } from "@/lib/balance-delta"

const includeRelations = {
  account: { select: { id: true, name: true } },
  fromAccount: { select: { id: true, name: true } },
  toAccount: { select: { id: true, name: true } },
}

const TYPE_LABELS: Record<string, string> = {
  INITIAL: "初期残高",
  DEPOSIT: "純入金",
  WITHDRAWAL: "純出金",
  INVESTMENT: "出資",
  TRANSFER: "振替",
  LEND: "貸出",
  BORROW: "借入",
  REPAYMENT_RECEIVE: "返済受取",
  REPAYMENT_PAY: "返済支払",
  INTEREST_RECEIVE: "利息受取",
  INTEREST_PAY: "利息支払",
  GAIN: "運用益",
  LOSS: "運用損",
  REVENUE: "売上",
  MISC_EXPENSE: "雑費",
  MISC_INCOME: "雑収入",
}

function toDTO(r: {
  id: string
  account: { id: string; name: string }
  type: AccountTransactionType
  amount: number
  date: Date
  fromAccount: { id: string; name: string } | null
  toAccount: { id: string; name: string } | null
  counterparty: string
  linkedTransactionId: string | null
  linkedTransferId: string | null
  lendingId: string | null
  lendingPaymentId: string | null
  direction: string | null
  memo: string
  editedBy: string
  tags: string[]
  isArchived: boolean
  balanceAfter: number
  createdAt: Date
}): AccountTransactionDTO {
  return {
    id: r.id,
    accountId: r.account.id,
    accountName: r.account.name,
    type: r.type.toLowerCase() as AccountTransactionTypeDTO,
    categoryName: TYPE_LABELS[r.type] ?? r.type,
    amount: r.amount,
    date: r.date.toISOString().split("T")[0],
    fromAccountId: r.fromAccount?.id ?? null,
    fromAccountName: r.fromAccount?.name ?? null,
    toAccountId: r.toAccount?.id ?? null,
    toAccountName: r.toAccount?.name ?? null,
    counterparty: r.counterparty,
    linkedTransactionId: r.linkedTransactionId,
    linkedTransferId: r.linkedTransferId,
    lendingId: r.lendingId,
    lendingPaymentId: r.lendingPaymentId,
    direction: r.direction,
    memo: r.memo,
    editedBy: r.editedBy,
    tags: r.tags,
    isArchived: r.isArchived,
    balanceAfter: r.balanceAfter,
    createdAt: r.createdAt.toISOString(),
  }
}

export class CreateAccountTransaction {
  static async execute(data: {
    accountId: string
    type: AccountTransactionTypeDTO
    amount: number
    date: string
    fromAccountId?: string | null
    toAccountId?: string | null
    counterparty?: string
    memo?: string
    editedBy?: string
    tags?: string[]
    businessId?: string
    categoryId?: string
  }): Promise<AccountTransactionDTO> {
    const dbType = data.type.toUpperCase() as AccountTransactionType

    return await prisma.$transaction(async (tx) => {
      // === 振替の場合: 2レコード作成 ===
      if (dbType === "TRANSFER" && data.fromAccountId && data.toAccountId) {
        const rFrom = await tx.accountTransaction.create({
          data: {
            accountId: data.fromAccountId,
            type: dbType,
            amount: data.amount,
            date: new Date(data.date),
            fromAccountId: data.fromAccountId,
            toAccountId: data.toAccountId,
            counterparty: data.counterparty ?? "",
            direction: "out",
            memo: data.memo ?? "",
            editedBy: data.editedBy ?? "",
            tags: data.tags ?? [],
          },
          include: includeRelations,
        })

        // 振替先レコード（linkedTransactionId + linkedTransferId で振替元と紐づけ）
        const rTo = await tx.accountTransaction.create({
          data: {
            accountId: data.toAccountId,
            type: dbType,
            amount: data.amount,
            date: new Date(data.date),
            fromAccountId: data.fromAccountId,
            toAccountId: data.toAccountId,
            counterparty: data.counterparty ?? "",
            linkedTransactionId: rFrom.id,
            linkedTransferId: rFrom.id,
            direction: "in",
            memo: data.memo ?? "",
            editedBy: data.editedBy ?? "",
            tags: data.tags ?? [],
          },
        })

        // 振替元にも linkedTransferId を設定（相互参照）
        await tx.accountTransaction.update({
          where: { id: rFrom.id },
          data: { linkedTransferId: rTo.id },
        })

        // 残高更新（振替元: -, 振替先: +）
        await tx.account.update({
          where: { id: data.fromAccountId },
          data: { balance: { increment: -data.amount } },
        })
        await tx.account.update({
          where: { id: data.toAccountId },
          data: { balance: { increment: data.amount } },
        })

        // 両口座の時点残高を再計算
        await recomputeBalanceAfter(tx, data.fromAccountId)
        await recomputeBalanceAfter(tx, data.toAccountId)

        // recompute後の最新値を取得
        const refreshed = await tx.accountTransaction.findUniqueOrThrow({
          where: { id: rFrom.id },
          include: includeRelations,
        })
        const transferResult = toDTO(refreshed)

        try {
          await AuditLogRepository.create({
            action: "CREATE",
            entityType: "AccountTransaction",
            entityId: transferResult.id,
            entityName: `${transferResult.categoryName} ¥${transferResult.amount}`,
            changes: {},
            userId: data.editedBy ?? "system",
            userName: data.editedBy ?? "system",
          })
        } catch { /* audit log failure should not break main operation */ }

        return transferResult
      }

      // === 振替以外: 1レコード作成 ===
      const r = await tx.accountTransaction.create({
        data: {
          accountId: data.accountId,
          type: dbType,
          amount: data.amount,
          date: new Date(data.date),
          fromAccountId: null,
          toAccountId: null,
          counterparty: data.counterparty ?? "",
          memo: data.memo ?? "",
          editedBy: data.editedBy ?? "",
          tags: data.tags ?? [],
        },
        include: includeRelations,
      })

      // 残高を更新
      const delta = BALANCE_DELTA[dbType]
      if (delta !== 0) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { increment: delta * data.amount } },
        })
      }

      // 時点残高を再計算
      await recomputeBalanceAfter(tx, data.accountId)

      // recompute後の最新値を取得
      const refreshed = await tx.accountTransaction.findUniqueOrThrow({
        where: { id: r.id },
        include: includeRelations,
      })
      const result = toDTO(refreshed)

      try {
        await AuditLogRepository.create({
          action: "CREATE",
          entityType: "AccountTransaction",
          entityId: result.id,
          entityName: `${result.categoryName} ¥${result.amount}`,
          changes: {},
          userId: data.editedBy ?? "system",
          userName: data.editedBy ?? "system",
        })
      } catch { /* audit log failure should not break main operation */ }

      return result
    })
  }
}
