import { prisma } from "@/lib/prisma"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { AccountRepository } from "@/server/repositories/account.repository"
import type { AccountTransactionDTO, AccountTransactionTypeDTO } from "@/types/dto"
import type { AccountTransactionType, Prisma } from "@/generated/prisma/client"

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
 * 取引作成（複式簿記版）
 * - 1取引=1レコード（fromAccountId/toAccountId 必須）
 * - 純入出金等は呼び出し側で外部口座を from or to に設定
 * - Account.balance 直接更新は廃止（残高はSnapshot+差分で都度計算）
 */
export class CreateAccountTransaction {
  static async execute(data: {
    type: AccountTransactionTypeDTO
    amount: number
    date: string
    fromAccountId: string
    toAccountId: string
    counterparty?: string
    lendingId?: string | null
    memo?: string
    editedBy?: string
    tags?: string[]
  }): Promise<AccountTransactionDTO> {
    const dbType = data.type.toUpperCase() as AccountTransactionType
    const date = new Date(data.date)

    return await prisma.$transaction(async (tx) => {
      const r = await tx.accountTransaction.create({
        data: {
          type: dbType,
          amount: data.amount,
          date,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          counterparty: data.counterparty ?? "",
          lendingId: data.lendingId ?? null,
          memo: data.memo ?? "",
          editedBy: data.editedBy ?? "",
          tags: data.tags ?? [],
        },
        include: includeRelations,
      })

      // 過去日付の取引なら、両口座に再計算フラグを立てる（翌日0時バッチで再生成）
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (date < today) {
        await Promise.all([
          AccountRepository.markRecalcRequired(data.fromAccountId, date),
          AccountRepository.markRecalcRequired(data.toAccountId, date),
        ])
      }

      const result = toDTO(r)

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
