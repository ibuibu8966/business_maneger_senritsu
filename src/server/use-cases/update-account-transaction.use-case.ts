import { prisma } from "@/lib/prisma"
import { BALANCE_DELTA } from "@/lib/balance-delta"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import type { AccountTransactionDTO, AccountTransactionTypeDTO } from "@/types/dto"
import type { AccountTransactionType } from "@/generated/prisma/client"

const includeRelations = {
  account: { select: { id: true, name: true } },
  fromAccount: { select: { id: true, name: true } },
  toAccount: { select: { id: true, name: true } },
}

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "純入金", WITHDRAWAL: "純出金", INVESTMENT: "出資", TRANSFER: "振替",
  LEND: "貸出", BORROW: "借入", REPAYMENT_RECEIVE: "返済受取", REPAYMENT_PAY: "返済支払",
  INTEREST_RECEIVE: "利息受取", INTEREST_PAY: "利息支払", GAIN: "運用益", LOSS: "運用損",
  REVENUE: "売上", MISC_EXPENSE: "雑費", MISC_INCOME: "雑収入",
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
    createdAt: r.createdAt.toISOString(),
  }
}

export class UpdateAccountTransaction {
  static async execute(
    id: string,
    data: {
      type?: AccountTransactionTypeDTO
      amount?: number
      date?: string
      fromAccountId?: string | null
      toAccountId?: string | null
      counterparty?: string
      memo?: string
      editedBy?: string
      tags?: string[]
      isArchived?: boolean
    }
  ): Promise<AccountTransactionDTO> {
    return await prisma.$transaction(async (tx) => {
      // 1. 現在のレコード取得
      const current = await tx.accountTransaction.findUniqueOrThrow({
        where: { id },
        include: includeRelations,
      })

      const newType = data.type
        ? (data.type.toUpperCase() as AccountTransactionType)
        : undefined
      const newAmount = data.amount
      const newDate = data.date ? new Date(data.date) : undefined
      const isArchiving =
        data.isArchived === true && current.isArchived === false
      const isUnarchiving =
        data.isArchived === false && current.isArchived === true

      // 2. メイン更新
      const updateData: Record<string, unknown> = {}
      if (newType !== undefined) updateData.type = newType
      if (newAmount !== undefined) updateData.amount = newAmount
      if (newDate !== undefined) updateData.date = newDate
      if (data.fromAccountId !== undefined)
        updateData.fromAccountId = data.fromAccountId
      if (data.toAccountId !== undefined)
        updateData.toAccountId = data.toAccountId
      if (data.counterparty !== undefined)
        updateData.counterparty = data.counterparty
      if (data.memo !== undefined) updateData.memo = data.memo
      if (data.editedBy !== undefined) updateData.editedBy = data.editedBy
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.isArchived !== undefined) updateData.isArchived = data.isArchived

      const updated = await tx.accountTransaction.update({
        where: { id },
        data: updateData,
        include: includeRelations,
      })

      // 3. 振替ペア同期（TRANSFER時）
      //    TO側のlinkedTransactionIdはFROM側のAccountTransaction ID
      if (current.type === "TRANSFER" && current.fromAccountId && current.toAccountId) {
        const isFromSide = current.accountId === current.fromAccountId
        let pairId: string | null = null

        if (isFromSide) {
          const toSide = await tx.accountTransaction.findFirst({
            where: { linkedTransactionId: id, type: "TRANSFER" },
          })
          pairId = toSide?.id ?? null
        } else {
          pairId = current.linkedTransactionId
        }

        // ペア同期
        if (pairId) {
          const pairUpdate: Record<string, unknown> = {}
          if (newAmount !== undefined) pairUpdate.amount = newAmount
          if (newDate !== undefined) pairUpdate.date = newDate
          if (data.memo !== undefined) pairUpdate.memo = data.memo
          if (data.editedBy !== undefined) pairUpdate.editedBy = data.editedBy
          if (data.isArchived !== undefined)
            pairUpdate.isArchived = data.isArchived

          if (Object.keys(pairUpdate).length > 0) {
            await tx.accountTransaction.update({
              where: { id: pairId },
              data: pairUpdate,
            })
          }
        }

        // 振替のアーカイブ: 両口座の残高を戻す
        if (isArchiving) {
          await tx.account.update({
            where: { id: current.fromAccountId },
            data: { balance: { increment: current.amount } }, // 出金を戻す
          })
          await tx.account.update({
            where: { id: current.toAccountId },
            data: { balance: { increment: -current.amount } }, // 入金を戻す
          })
        }

        // 振替のアンアーカイブ: 残高を再適用
        if (isUnarchiving) {
          await tx.account.update({
            where: { id: current.fromAccountId },
            data: { balance: { increment: -current.amount } },
          })
          await tx.account.update({
            where: { id: current.toAccountId },
            data: { balance: { increment: current.amount } },
          })
        }

        // 振替の金額変更: 両口座の残高差分更新
        if (
          newAmount !== undefined &&
          newAmount !== current.amount &&
          !isArchiving &&
          !isUnarchiving
        ) {
          const diff = newAmount - current.amount
          await tx.account.update({
            where: { id: current.fromAccountId },
            data: { balance: { increment: -diff } },
          })
          await tx.account.update({
            where: { id: current.toAccountId },
            data: { balance: { increment: diff } },
          })
        }
      } else {
        // 振替以外: 残高処理
        const effectiveType = newType ?? current.type
        const delta = BALANCE_DELTA[effectiveType] ?? 0

        if (isArchiving && delta !== 0) {
          // アーカイブ: 残高を戻す（逆算）
          await tx.account.update({
            where: { id: current.accountId },
            data: { balance: { increment: -delta * current.amount } },
          })
        }

        if (isUnarchiving && delta !== 0) {
          // アンアーカイブ: 残高を再適用
          const amt = newAmount ?? current.amount
          await tx.account.update({
            where: { id: current.accountId },
            data: { balance: { increment: delta * amt } },
          })
        }

        if (
          newAmount !== undefined &&
          newAmount !== current.amount &&
          !isArchiving &&
          !isUnarchiving &&
          delta !== 0
        ) {
          // 金額変更: 差分を残高に反映
          const diff = newAmount - current.amount
          await tx.account.update({
            where: { id: current.accountId },
            data: { balance: { increment: delta * diff } },
          })
        }
      }

      // 4. 貸借逆同期: 貸借系AccountTransactionアーカイブ → Lendingもアーカイブ
      const LENDING_TYPES: AccountTransactionType[] = [
        "LEND", "BORROW",
        "REPAYMENT_RECEIVE", "REPAYMENT_PAY",
        "INTEREST_RECEIVE", "INTEREST_PAY",
      ]
      if (
        LENDING_TYPES.includes(current.type) &&
        current.linkedTransactionId &&
        data.isArchived !== undefined
      ) {
        const lending = await tx.lending.findUnique({
          where: { id: current.linkedTransactionId },
        })
        if (lending && lending.isArchived !== data.isArchived) {
          // メインLendingをアーカイブ同期
          await tx.lending.update({
            where: { id: current.linkedTransactionId },
            data: { isArchived: data.isArchived },
          })
          // ペアLendingも同期
          if (lending.linkedLendingId) {
            await tx.lending.update({
              where: { id: lending.linkedLendingId },
              data: { isArchived: data.isArchived },
            })
            // ペア側のAccountTransactionもアーカイブ
            await tx.accountTransaction.updateMany({
              where: {
                linkedTransactionId: lending.linkedLendingId,
                type: { in: LENDING_TYPES as AccountTransactionType[] },
              },
              data: { isArchived: data.isArchived },
            })
          }
        }
      }

      const result = toDTO(updated)

      try {
        const changes: Record<string, { old: unknown; new: unknown }> = {}
        if (data.type !== undefined && data.type !== current.type.toLowerCase()) changes.type = { old: current.type, new: newType }
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
