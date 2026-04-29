import { prisma } from "@/lib/prisma"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { recomputeBalanceAfter } from "@/lib/recompute-balance-after"
import type { AccountTransactionDTO, AccountTransactionTypeDTO } from "@/types/dto"
import type { AccountTransactionType } from "@/generated/prisma/client"

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
  serialNumber: number
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
    serialNumber: r.serialNumber,
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

/**
 * 初期残高を1口座に対して登録 or 更新する。
 * 1口座につきINITIALレコードは最大1件。既存があれば上書き＋差分でbalance調整。
 */
export class UpsertInitialBalance {
  static async execute(data: {
    accountId: string
    amount: number
    date?: string
    memo?: string
    editedBy?: string
  }): Promise<AccountTransactionDTO> {
    return await prisma.$transaction(async (tx) => {
      // 既存INITIAL確認
      const existing = await tx.accountTransaction.findFirst({
        where: { accountId: data.accountId, type: "INITIAL" },
      })

      const acct = await tx.account.findUniqueOrThrow({
        where: { id: data.accountId },
        select: { createdAt: true },
      })
      const targetDate = data.date ? new Date(data.date) : acct.createdAt

      let resultId: string

      if (existing) {
        // 差分でaccounts.balance調整 → 既存レコード更新
        const diff = data.amount - existing.amount
        await tx.accountTransaction.update({
          where: { id: existing.id },
          data: {
            amount: data.amount,
            date: targetDate,
            memo: data.memo ?? existing.memo,
            editedBy: data.editedBy ?? existing.editedBy,
          },
        })
        if (diff !== 0) {
          await tx.account.update({
            where: { id: data.accountId },
            data: { balance: { increment: diff } },
          })
        }
        resultId = existing.id
      } else {
        // 新規作成 → accounts.balanceに加算
        // createdAt を1900-01-01に固定し、同じ日付の他取引より必ず先頭に来るようにする
        const created = await tx.accountTransaction.create({
          data: {
            accountId: data.accountId,
            type: "INITIAL",
            amount: data.amount,
            date: targetDate,
            counterparty: "",
            memo: data.memo ?? "口座開設時の初期残高",
            editedBy: data.editedBy ?? "",
            createdAt: new Date("1900-01-01T00:00:00Z"),
          },
        })
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { increment: data.amount } },
        })
        resultId = created.id
      }

      // 時点残高を再計算
      await recomputeBalanceAfter(tx, data.accountId)

      const refreshed = await tx.accountTransaction.findUniqueOrThrow({
        where: { id: resultId },
        include: includeRelations,
      })

      const result = toDTO(refreshed)

      try {
        await AuditLogRepository.create({
          action: existing ? "UPDATE" : "CREATE",
          entityType: "AccountTransaction",
          entityId: result.id,
          entityName: `初期残高 ¥${result.amount}`,
          changes: existing ? { amount: { old: existing.amount, new: data.amount } } : {},
          userId: data.editedBy ?? "system",
          userName: data.editedBy ?? "system",
        })
      } catch { /* audit log failure should not break main operation */ }

      return result
    })
  }
}
