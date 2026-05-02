import { prisma } from "@/lib/prisma"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { AccountRepository } from "@/server/repositories/account.repository"
import type { AccountTransactionDTO, AccountTransactionTypeDTO } from "@/types/dto"
import type { AccountTransactionType } from "@/generated/prisma/client"

const includeRelations = {
  fromAccount: { select: { id: true, name: true } },
  toAccount: { select: { id: true, name: true } },
}

const TYPE_LABELS: Record<AccountTransactionType, string> = {
  INITIAL: "初期残高",
  INVESTMENT: "出資",
  TRANSFER: "振替",
  LENDING: "貸借",
  REPAYMENT: "返済",
  INTEREST: "利息",
  DEPOSIT_WITHDRAWAL: "純入出金",
  GAIN: "運用益",
  LOSS: "運用損",
  REVENUE: "売上",
  EXPENSE: "支出",
  MISC_EXPENSE: "雑費",
  MISC_INCOME: "雑収入",
}

function toDTO(r: {
  id: string
  serialNumber: number
  type: AccountTransactionType
  amount: number
  date: Date
  fromAccount: { id: string; name: string }
  toAccount: { id: string; name: string }
  counterparty: string
  lendingId: string | null
  memo: string
  editedBy: string
  tags: string[]
  isArchived: boolean
  createdAt: Date
}): AccountTransactionDTO {
  return {
    id: r.id,
    serialNumber: r.serialNumber,
    type: r.type.toLowerCase() as AccountTransactionTypeDTO,
    categoryName: TYPE_LABELS[r.type] ?? r.type,
    amount: r.amount,
    date: r.date.toISOString().split("T")[0],
    fromAccountId: r.fromAccount.id,
    fromAccountName: r.fromAccount.name,
    toAccountId: r.toAccount.id,
    toAccountName: r.toAccount.name,
    counterparty: r.counterparty,
    lendingId: r.lendingId,
    memo: r.memo,
    editedBy: r.editedBy,
    tags: r.tags,
    isArchived: r.isArchived,
    createdAt: r.createdAt.toISOString(),
  }
}

/**
 * 初期残高を1口座に対して登録 or 更新する（複式簿記版）
 * - 1口座につき INITIAL レコードは最大1件
 * - INITIAL は「外部口座 → 対象口座」の取引として表現される
 * - balance 更新は廃止（残高は都度計算）
 */
export class UpsertInitialBalance {
  static async execute(data: {
    accountId: string
    amount: number
    date?: string
    memo?: string
    editedBy?: string
  }): Promise<AccountTransactionDTO> {
    const externalId = await AccountRepository.findExternalAccountId()

    return await prisma.$transaction(async (tx) => {
      // 既存INITIAL確認（自分が toAccount のINITIAL）
      const existing = await tx.accountTransaction.findFirst({
        where: { toAccountId: data.accountId, type: "INITIAL" },
      })

      const acct = await tx.account.findUniqueOrThrow({
        where: { id: data.accountId },
        select: { createdAt: true },
      })
      const targetDate = data.date ? new Date(data.date) : acct.createdAt

      let resultId: string

      if (existing) {
        await tx.accountTransaction.update({
          where: { id: existing.id },
          data: {
            amount: data.amount,
            date: targetDate,
            memo: data.memo ?? existing.memo,
            editedBy: data.editedBy ?? existing.editedBy,
          },
        })
        resultId = existing.id
      } else {
        const created = await tx.accountTransaction.create({
          data: {
            type: "INITIAL",
            amount: data.amount,
            date: targetDate,
            fromAccountId: externalId,        // 外部口座から
            toAccountId: data.accountId,      // 対象口座へ
            counterparty: "",
            memo: data.memo ?? "口座開設時の初期残高",
            editedBy: data.editedBy ?? "",
            createdAt: new Date("1900-01-01T00:00:00Z"),
          },
        })
        resultId = created.id
      }

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
