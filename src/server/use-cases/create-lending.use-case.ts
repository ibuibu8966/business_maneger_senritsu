import { prisma } from "@/lib/prisma"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { AccountRepository } from "@/server/repositories/account.repository"
import type { LendingDTO } from "@/types/dto"
import type { LendingType } from "@/generated/prisma/client"

function toLendingDTO(r: {
  id: string
  account: { id: string; name: string }
  counterparty: string
  counterpartyAccountId: string | null
  counterpartyAccount: { id: string; name: string } | null
  linkedLendingId: string | null
  type: string
  principal: number
  dueDate: Date | null
  memo: string
  editedBy?: string
  tags?: string[]
  isArchived: boolean
  createdAt: Date
}): LendingDTO {
  return {
    id: r.id,
    accountId: r.account.id,
    accountName: r.account.name,
    counterparty: r.counterparty,
    counterpartyAccountId: r.counterpartyAccount?.id ?? null,
    counterpartyAccountName: r.counterpartyAccount?.name ?? null,
    linkedLendingId: r.linkedLendingId,
    type: r.type.toLowerCase() as "lend" | "borrow",
    principal: r.principal,
    outstanding: r.principal,                                      // 新規作成時は principal と同じ
    dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
    status: "active",                                              // 新規作成時は ACTIVE
    memo: r.memo,
    editedBy: r.editedBy ?? "",
    tags: r.tags ?? [],
    isArchived: r.isArchived,
    createdAt: r.createdAt.toISOString(),
    date: null,
    payments: [],
  }
}

const lendingInclude = {
  account: { select: { id: true, name: true } },
  counterpartyAccount: { select: { id: true, name: true } },
} as const

/**
 * 貸借作成（複式簿記版）
 * - Lending レコード作成 + AccountTransaction(type=LENDING, lendingId=...) を1件作成
 * - 社内貸借はペア Lending を linkedLendingId で繋ぐ（既存設計を踏襲）
 * - LENDING取引は1レコード（fromAccount=自分／toAccount=相手 で方向を表現）
 * - 旧 BORROW 取引（重複）は廃止
 */
export class CreateLending {
  static async execute(data: {
    accountId: string
    counterparty: string
    counterpartyAccountId?: string | null
    type: "lend" | "borrow"
    principal: number
    date?: string
    dueDate?: string | null
    memo?: string
    editedBy?: string
  }): Promise<LendingDTO> {
    const type = data.type.toUpperCase() as LendingType
    const reverseType = type === "LEND" ? "BORROW" : "LEND"
    const txDate = data.date ? new Date(data.date) : new Date()

    // 取引の方向（LEND=自分→相手、BORROW=相手→自分）。社外相手なら EXTERNAL口座を使う
    const externalId = await AccountRepository.findExternalAccountId()
    const counterpartyForTx = data.counterpartyAccountId ?? externalId
    const fromAccountForTx = type === "LEND" ? data.accountId : counterpartyForTx
    const toAccountForTx = type === "LEND" ? counterpartyForTx : data.accountId

    if (data.counterpartyAccountId) {
      // 社内貸借：双方向ペア Lending（既存設計踏襲）+ LENDING取引は1件のみ
      const result = await prisma.$transaction(async (tx) => {
        const main = await tx.lending.create({
          data: {
            accountId: data.accountId,
            counterparty: data.counterparty,
            counterpartyAccountId: data.counterpartyAccountId!,
            type,
            principal: data.principal,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            memo: data.memo ?? "",
            editedBy: data.editedBy ?? "",
          },
          include: lendingInclude,
        })

        const mainAccount = await tx.account.findUnique({
          where: { id: data.accountId },
          select: { name: true },
        })

        const pair = await tx.lending.create({
          data: {
            accountId: data.counterpartyAccountId!,
            counterparty: mainAccount?.name ?? "",
            counterpartyAccountId: data.accountId,
            linkedLendingId: main.id,
            type: reverseType,
            principal: data.principal,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            memo: data.memo ?? "",
            editedBy: data.editedBy ?? "",
          },
        })

        const updated = await tx.lending.update({
          where: { id: main.id },
          data: { linkedLendingId: pair.id },
          include: lendingInclude,
        })

        // LENDING 取引を1件のみ作成（複式簿記版：旧 BORROW 取引重複は廃止）
        await tx.accountTransaction.create({
          data: {
            type: "LENDING",
            amount: data.principal,
            date: txDate,
            fromAccountId: fromAccountForTx,
            toAccountId: toAccountForTx,
            counterparty: data.counterparty,
            lendingId: main.id,
            memo: `貸借自動計上: ${data.memo ?? ""}`.trim(),
            editedBy: "system",
          },
        })

        return { updated, txDate }
      })

      const dto = { ...toLendingDTO(result.updated), date: result.txDate.toISOString().split("T")[0] }

      try {
        await AuditLogRepository.create({
          action: "CREATE",
          entityType: "Lending",
          entityId: dto.id,
          entityName: `${dto.type === "lend" ? "貸出" : "借入"} ${dto.counterparty} ¥${dto.principal}`,
          changes: {},
          userId: data.editedBy ?? "system",
          userName: data.editedBy ?? "system",
        })
      } catch { /* audit log failure should not break main operation */ }

      return dto
    }

    // 社外貸借：単体 Lending + LENDING 取引1件
    const r = await prisma.$transaction(async (tx) => {
      const lending = await tx.lending.create({
        data: {
          accountId: data.accountId,
          counterparty: data.counterparty,
          counterpartyAccountId: null,
          type,
          principal: data.principal,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          memo: data.memo ?? "",
          editedBy: data.editedBy ?? "",
        },
        include: lendingInclude,
      })

      await tx.accountTransaction.create({
        data: {
          type: "LENDING",
          amount: data.principal,
          date: txDate,
          fromAccountId: fromAccountForTx,
          toAccountId: toAccountForTx,
          counterparty: data.counterparty,
          lendingId: lending.id,
          memo: `貸借自動計上: ${data.memo ?? ""}`.trim(),
          editedBy: "system",
        },
      })

      return lending
    })

    const dto = { ...toLendingDTO(r), date: txDate.toISOString().split("T")[0] }

    try {
      await AuditLogRepository.create({
        action: "CREATE",
        entityType: "Lending",
        entityId: dto.id,
        entityName: `${dto.type === "lend" ? "貸出" : "借入"} ${dto.counterparty} ¥${dto.principal}`,
        changes: {},
        userId: data.editedBy ?? "system",
        userName: data.editedBy ?? "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return dto
  }
}
