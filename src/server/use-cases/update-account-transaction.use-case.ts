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
 * 取引更新（複式簿記版）
 * - 1取引=1レコードなのでペア同期不要
 * - balance 直接更新は廃止（都度計算）
 * - 過去日付に変更された場合は両口座に再計算フラグ
 */
export class UpdateAccountTransaction {
  static async execute(
    id: string,
    data: {
      type?: AccountTransactionTypeDTO
      amount?: number
      date?: string
      fromAccountId?: string
      toAccountId?: string
      counterparty?: string
      memo?: string
      editedBy?: string
      tags?: string[]
      isArchived?: boolean
    }
  ): Promise<AccountTransactionDTO> {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.accountTransaction.findUniqueOrThrow({
        where: { id },
        include: includeRelations,
      })

      const newType = data.type ? (data.type.toUpperCase() as AccountTransactionType) : undefined
      const newDate = data.date ? new Date(data.date) : undefined

      const updateData: Record<string, unknown> = {}
      if (newType !== undefined) updateData.type = newType
      if (data.amount !== undefined) updateData.amount = data.amount
      if (newDate !== undefined) updateData.date = newDate
      if (data.fromAccountId !== undefined) updateData.fromAccountId = data.fromAccountId
      if (data.toAccountId !== undefined) updateData.toAccountId = data.toAccountId
      if (data.counterparty !== undefined) updateData.counterparty = data.counterparty
      if (data.memo !== undefined) updateData.memo = data.memo
      if (data.editedBy !== undefined) updateData.editedBy = data.editedBy
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.isArchived !== undefined) updateData.isArchived = data.isArchived

      await tx.accountTransaction.update({ where: { id }, data: updateData })

      // 影響を受けた口座に再計算フラグ（過去日付の変更時）
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const affectedDate = newDate && newDate < current.date ? newDate : (current.date < today ? current.date : null)
      if (affectedDate) {
        const affectedAccountIds = new Set<string>([
          current.fromAccountId,
          current.toAccountId,
          ...(data.fromAccountId ? [data.fromAccountId] : []),
          ...(data.toAccountId ? [data.toAccountId] : []),
        ])
        await Promise.all(
          [...affectedAccountIds].map((aid) => AccountRepository.markRecalcRequired(aid, affectedDate))
        )
      }

      const refreshed = await tx.accountTransaction.findUniqueOrThrow({
        where: { id },
        include: includeRelations,
      })
      const result = toDTO(refreshed)

      try {
        const changes: Record<string, { old: unknown; new: unknown }> = {}
        if (newType !== undefined && newType !== current.type) changes.type = { old: current.type, new: newType }
        if (data.amount !== undefined && data.amount !== current.amount) changes.amount = { old: current.amount, new: data.amount }
        if (data.date !== undefined) changes.date = { old: current.date.toISOString().split("T")[0], new: data.date }
        if (data.counterparty !== undefined && data.counterparty !== current.counterparty) changes.counterparty = { old: current.counterparty, new: data.counterparty }
        if (data.memo !== undefined && data.memo !== current.memo) changes.memo = { old: current.memo, new: data.memo }
        if (data.isArchived !== undefined && data.isArchived !== current.isArchived) changes.isArchived = { old: current.isArchived, new: data.isArchived }

        await AuditLogRepository.create({
          action: "UPDATE",
          entityType: "AccountTransaction",
          entityId: id,
          entityName: `${result.categoryName} ¥${result.amount}`,
          changes,
          userId: data.editedBy ?? "system",
          userName: data.editedBy ?? "system",
        })
      } catch { /* audit log failure should not break main operation */ }

      return result
    })
  }
}
