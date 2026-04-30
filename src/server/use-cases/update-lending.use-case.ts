import { prisma } from "@/lib/prisma"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { calcOutstanding } from "@/server/use-cases/get-account-details.use-case"
import type { LendingDTO, LendingPaymentDTO } from "@/types/dto"

function computeStatus(args: {
  outstanding: number
  dueDate: Date | null
  today?: Date
}): "active" | "completed" | "overdue" {
  const today = args.today ?? new Date()
  if (args.outstanding === 0) return "completed"
  if (args.dueDate && args.dueDate < today) return "overdue"
  return "active"
}

/**
 * 貸借更新（複式簿記版）
 * - outstanding / status は廃止（都度計算）
 * - LENDING取引は1レコードのみなので、ペア同期は Lending 側のみ（共通フィールド）
 * - balance 直接更新は廃止
 */
export class UpdateLending {
  static async execute(
    id: string,
    data: {
      counterparty?: string
      counterpartyAccountId?: string | null
      dueDate?: string | null
      memo?: string
      editedBy?: string
      tags?: string[]
      isArchived?: boolean
    }
  ): Promise<LendingDTO> {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.lending.findUniqueOrThrow({
        where: { id },
        include: {
          account: { select: { id: true, name: true } },
          counterpartyAccount: { select: { id: true, name: true } },
        },
      })

      const updateData: Record<string, unknown> = {}
      if (data.counterparty !== undefined) updateData.counterparty = data.counterparty
      if (data.counterpartyAccountId !== undefined) updateData.counterpartyAccountId = data.counterpartyAccountId
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
      if (data.memo !== undefined) updateData.memo = data.memo
      if (data.editedBy !== undefined) updateData.editedBy = data.editedBy
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.isArchived !== undefined) updateData.isArchived = data.isArchived

      const r = await tx.lending.update({
        where: { id },
        data: updateData,
        include: {
          account: { select: { id: true, name: true } },
          counterpartyAccount: { select: { id: true, name: true } },
        },
      })

      // ペア Lending を同期（counterparty は同期しない＝互いの口座名を保持）
      if (current.linkedLendingId) {
        const pairUpdate: Record<string, unknown> = {}
        if (data.dueDate !== undefined) pairUpdate.dueDate = data.dueDate ? new Date(data.dueDate) : null
        if (data.memo !== undefined) pairUpdate.memo = data.memo
        if (data.editedBy !== undefined) pairUpdate.editedBy = data.editedBy
        if (data.isArchived !== undefined) pairUpdate.isArchived = data.isArchived

        if (Object.keys(pairUpdate).length > 0) {
          await tx.lending.update({ where: { id: current.linkedLendingId }, data: pairUpdate })
        }
      }

      // isArchived の変更時は LENDING 取引も同期（両側の Lending に紐づく LENDING 取引が同じ1件）
      if (data.isArchived !== undefined) {
        const lendingIds = [id, current.linkedLendingId].filter(Boolean) as string[]
        await tx.accountTransaction.updateMany({
          where: { lendingId: { in: lendingIds }, type: "LENDING" },
          data: { isArchived: data.isArchived },
        })
      }

      // 紐づくLENDING取引の実行日
      const linkedTx = await tx.accountTransaction.findFirst({
        where: { lendingId: id, type: "LENDING" },
        select: { date: true },
        orderBy: { createdAt: "asc" },
      })

      // 返済履歴
      const repayments = await tx.accountTransaction.findMany({
        where: { lendingId: id, type: "REPAYMENT", isArchived: false },
        orderBy: { date: "desc" },
      })

      const outstanding = await calcOutstanding({
        id: r.id,
        principal: r.principal,
        accountId: r.accountId,
        type: r.type,
      })
      const status = computeStatus({ outstanding, dueDate: r.dueDate })

      const result: LendingDTO = {
        id: r.id,
        accountId: r.account.id,
        accountName: r.account.name,
        counterparty: r.counterparty,
        counterpartyAccountId: r.counterpartyAccount?.id ?? null,
        counterpartyAccountName: r.counterpartyAccount?.name ?? null,
        linkedLendingId: r.linkedLendingId,
        type: r.type.toLowerCase() as "lend" | "borrow",
        principal: r.principal,
        outstanding,
        dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
        status,
        memo: r.memo,
        editedBy: r.editedBy ?? "",
        tags: r.tags ?? [],
        isArchived: r.isArchived,
        createdAt: r.createdAt.toISOString(),
        date: linkedTx ? linkedTx.date.toISOString().split("T")[0] : null,
        payments: repayments.map((p): LendingPaymentDTO => ({
          id: p.id,
          lendingId: p.lendingId!,
          amount: p.amount,
          date: p.date.toISOString().split("T")[0],
          memo: p.memo,
          createdAt: p.createdAt.toISOString(),
        })),
      }

      try {
        const changes: Record<string, { old: unknown; new: unknown }> = {}
        if (data.counterparty !== undefined && data.counterparty !== current.counterparty) changes.counterparty = { old: current.counterparty, new: data.counterparty }
        if (data.memo !== undefined && data.memo !== current.memo) changes.memo = { old: current.memo, new: data.memo }
        if (data.isArchived !== undefined && data.isArchived !== current.isArchived) changes.isArchived = { old: current.isArchived, new: data.isArchived }

        await AuditLogRepository.create({
          action: "UPDATE",
          entityType: "Lending",
          entityId: id,
          entityName: `${result.type === "lend" ? "貸出" : "借入"} ${result.counterparty} ¥${result.principal}`,
          changes,
          userId: data.editedBy ?? "system",
          userName: data.editedBy ?? "system",
        })
      } catch { /* audit log failure should not break main operation */ }

      return result
    })
  }
}
