import { prisma } from "@/lib/prisma"
import { BALANCE_DELTA } from "@/lib/balance-delta"
import { AuditLogRepository } from "@/repositories/audit-log.repository"
import type { LendingDTO, LendingPaymentDTO } from "@/types/dto"
import type { LendingStatus } from "@/generated/prisma/client"

export class UpdateLending {
  static async execute(
    id: string,
    data: {
      counterparty?: string
      counterpartyAccountId?: string | null
      outstanding?: number
      dueDate?: string | null
      status?: "active" | "completed" | "overdue"
      memo?: string
      editedBy?: string
      tags?: string[]
      isArchived?: boolean
    }
  ): Promise<LendingDTO> {
    return await prisma.$transaction(async (tx) => {
      // 1. 現在のレコード取得
      const current = await tx.lending.findUniqueOrThrow({
        where: { id },
        include: {
          account: { select: { id: true, name: true } },
          counterpartyAccount: { select: { id: true, name: true } },
          payments: { orderBy: { date: "desc" } },
        },
      })

      // 2. メイン更新
      const updateData: Record<string, unknown> = {}
      if (data.counterparty !== undefined)
        updateData.counterparty = data.counterparty
      if (data.counterpartyAccountId !== undefined)
        updateData.counterpartyAccountId = data.counterpartyAccountId
      if (data.outstanding !== undefined)
        updateData.outstanding = data.outstanding
      if (data.dueDate !== undefined)
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
      if (data.status !== undefined)
        updateData.status = data.status.toUpperCase() as LendingStatus
      if (data.memo !== undefined) updateData.memo = data.memo
      if (data.editedBy !== undefined) updateData.editedBy = data.editedBy
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.isArchived !== undefined)
        updateData.isArchived = data.isArchived

      const r = await tx.lending.update({
        where: { id },
        data: updateData,
        include: {
          account: { select: { id: true, name: true } },
          counterpartyAccount: { select: { id: true, name: true } },
          payments: { orderBy: { date: "desc" } },
        },
      })

      // 3. ペア同期: linkedLendingIdでペアを探して共通フィールドを同期
      //    counterpartyは同期しない（互いの口座名が入るため）
      if (current.linkedLendingId) {
        const pairUpdate: Record<string, unknown> = {}
        if (data.outstanding !== undefined)
          pairUpdate.outstanding = data.outstanding
        if (data.dueDate !== undefined)
          pairUpdate.dueDate = data.dueDate ? new Date(data.dueDate) : null
        if (data.status !== undefined)
          pairUpdate.status = data.status.toUpperCase() as LendingStatus
        if (data.memo !== undefined) pairUpdate.memo = data.memo
        if (data.editedBy !== undefined) pairUpdate.editedBy = data.editedBy
        if (data.isArchived !== undefined)
          pairUpdate.isArchived = data.isArchived

        if (Object.keys(pairUpdate).length > 0) {
          await tx.lending.update({
            where: { id: current.linkedLendingId },
            data: pairUpdate,
          })
        }
      }

      // 4. AccountTransaction同期 + 残高調整
      const isArchiving =
        data.isArchived === true && current.isArchived === false
      const isUnarchiving =
        data.isArchived === false && current.isArchived === true

      if (data.isArchived !== undefined) {
        // メイン側のAccountTransactionをアーカイブ同期
        const mainAcctTxs = await tx.accountTransaction.findMany({
          where: {
            linkedTransactionId: id,
            type: { in: ["LEND", "BORROW", "REPAYMENT_RECEIVE", "REPAYMENT_PAY", "INTEREST_RECEIVE", "INTEREST_PAY"] },
          },
        })

        if (mainAcctTxs.length > 0) {
          await tx.accountTransaction.updateMany({
            where: {
              linkedTransactionId: id,
              type: { in: ["LEND", "BORROW", "REPAYMENT_RECEIVE", "REPAYMENT_PAY", "INTEREST_RECEIVE", "INTEREST_PAY"] },
            },
            data: { isArchived: data.isArchived },
          })

          // 残高調整（メイン口座）
          for (const acctTx of mainAcctTxs) {
            const delta = BALANCE_DELTA[acctTx.type] ?? 0
            if (delta !== 0) {
              if (isArchiving) {
                // アーカイブ: 残高を戻す
                await tx.account.update({
                  where: { id: acctTx.accountId },
                  data: { balance: { increment: -delta * acctTx.amount } },
                })
              }
              if (isUnarchiving) {
                // アンアーカイブ: 残高を再適用
                await tx.account.update({
                  where: { id: acctTx.accountId },
                  data: { balance: { increment: delta * acctTx.amount } },
                })
              }
            }
          }
        }

        // ペア側のAccountTransactionをアーカイブ同期
        if (current.linkedLendingId) {
          const pairAcctTxs = await tx.accountTransaction.findMany({
            where: {
              linkedTransactionId: current.linkedLendingId,
              type: { in: ["LEND", "BORROW", "REPAYMENT_RECEIVE", "REPAYMENT_PAY", "INTEREST_RECEIVE", "INTEREST_PAY"] },
            },
          })

          if (pairAcctTxs.length > 0) {
            await tx.accountTransaction.updateMany({
              where: {
                linkedTransactionId: current.linkedLendingId,
                type: { in: ["LEND", "BORROW", "REPAYMENT_RECEIVE", "REPAYMENT_PAY", "INTEREST_RECEIVE", "INTEREST_PAY"] },
              },
              data: { isArchived: data.isArchived },
            })

            // 残高調整（ペア口座）
            for (const acctTx of pairAcctTxs) {
              const delta = BALANCE_DELTA[acctTx.type] ?? 0
              if (delta !== 0) {
                if (isArchiving) {
                  await tx.account.update({
                    where: { id: acctTx.accountId },
                    data: { balance: { increment: -delta * acctTx.amount } },
                  })
                }
                if (isUnarchiving) {
                  await tx.account.update({
                    where: { id: acctTx.accountId },
                    data: { balance: { increment: delta * acctTx.amount } },
                  })
                }
              }
            }
          }
        }
      }

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
        outstanding: r.outstanding,
        dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
        status: r.status.toLowerCase() as "active" | "completed" | "overdue",
        memo: r.memo,
        editedBy: r.editedBy ?? "",
        tags: r.tags ?? [],
        isArchived: r.isArchived,
        createdAt: r.createdAt.toISOString(),
        payments: r.payments.map(
          (p): LendingPaymentDTO => ({
            id: p.id,
            lendingId: p.lendingId,
            amount: p.amount,
            date: p.date.toISOString().split("T")[0],
            memo: p.memo,
            createdAt: p.createdAt.toISOString(),
          })
        ),
      }

      try {
        const changes: Record<string, { old: unknown; new: unknown }> = {}
        if (data.counterparty !== undefined && data.counterparty !== current.counterparty) changes.counterparty = { old: current.counterparty, new: data.counterparty }
        if (data.outstanding !== undefined && data.outstanding !== current.outstanding) changes.outstanding = { old: current.outstanding, new: data.outstanding }
        if (data.status !== undefined && data.status !== current.status.toLowerCase()) changes.status = { old: current.status, new: data.status.toUpperCase() }
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
