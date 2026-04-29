import { prisma } from "@/lib/prisma"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { recomputeBalanceAfter } from "@/lib/recompute-balance-after"
import type { LendingDTO, LendingPaymentDTO } from "@/types/dto"
import type { LendingType, AccountTransactionType } from "@/generated/prisma/client"

function toLendingDTO(r: {
  id: string
  account: { id: string; name: string }
  counterparty: string
  counterpartyAccountId: string | null
  counterpartyAccount: { id: string; name: string } | null
  linkedLendingId: string | null
  type: string
  principal: number
  outstanding: number
  dueDate: Date | null
  status: string
  memo: string
  editedBy?: string
  tags?: string[]
  isArchived: boolean
  createdAt: Date
  payments: { id: string; lendingId: string; amount: number; date: Date; memo: string; createdAt: Date }[]
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
    outstanding: r.outstanding,
    dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
    status: r.status.toLowerCase() as "active" | "completed" | "overdue",
    memo: r.memo,
    editedBy: r.editedBy ?? "",
    tags: r.tags ?? [],
    isArchived: r.isArchived,
    createdAt: r.createdAt.toISOString(),
    date: null,
    payments: r.payments.map((p): LendingPaymentDTO => ({
      id: p.id,
      lendingId: p.lendingId,
      amount: p.amount,
      date: p.date.toISOString().split("T")[0],
      memo: p.memo,
      createdAt: p.createdAt.toISOString(),
    })),
  }
}

const lendingInclude = {
  account: { select: { id: true, name: true } },
  counterpartyAccount: { select: { id: true, name: true } },
  payments: { orderBy: { date: "desc" as const } },
} as const

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

    const txType = type as AccountTransactionType
    const reverseTxType = (txType === "LEND" ? "BORROW" : "LEND") as AccountTransactionType
    const txDate = data.date ? new Date(data.date) : new Date()

    // 社内口座間（counterpartyAccountId あり）→ 双方向ペアを作成
    if (data.counterpartyAccountId) {
      const result = await prisma.$transaction(async (tx) => {
        // 1. メイン側 Lending
        const main = await tx.lending.create({
          data: {
            accountId: data.accountId,
            counterparty: data.counterparty,
            counterpartyAccountId: data.counterpartyAccountId!,
            type,
            principal: data.principal,
            outstanding: data.principal,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            memo: data.memo ?? "",
            editedBy: data.editedBy ?? "",
          },
          include: lendingInclude,
        })

        // 2. 相手口座の名前を取得
        const mainAccount = await tx.account.findUnique({
          where: { id: data.accountId },
          select: { name: true },
        })

        // 3. 相手側 Lending（逆の type）
        const pair = await tx.lending.create({
          data: {
            accountId: data.counterpartyAccountId!,
            counterparty: mainAccount?.name ?? "",
            counterpartyAccountId: data.accountId,
            linkedLendingId: main.id,
            type: reverseType,
            principal: data.principal,
            outstanding: data.principal,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            memo: data.memo ?? "",
            editedBy: data.editedBy ?? "",
          },
        })

        // 4. メイン側にペアIDを紐づけ
        const updated = await tx.lending.update({
          where: { id: main.id },
          data: { linkedLendingId: pair.id },
          include: lendingInclude,
        })

        // 5. AccountTransaction 自動計上（メイン口座）+ 残高更新
        await tx.accountTransaction.create({
          data: {
            accountId: data.accountId,
            type: txType,
            amount: data.principal,
            date: txDate,
            counterparty: data.counterparty,
            linkedTransactionId: main.id,
            lendingId: main.id,
            memo: `貸借自動計上: ${data.memo ?? ""}`.trim(),
            editedBy: "system",
          },
        })
        // LEND = 貸出 → 残高減少(-), BORROW = 借入 → 残高増加(+)
        const mainDelta = txType === "LEND" ? -data.principal : data.principal
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { increment: mainDelta } },
        })

        // 6. AccountTransaction 自動計上（相手口座）+ 残高更新
        await tx.accountTransaction.create({
          data: {
            accountId: data.counterpartyAccountId!,
            type: reverseTxType,
            amount: data.principal,
            date: txDate,
            counterparty: mainAccount?.name ?? "",
            linkedTransactionId: pair.id,
            lendingId: pair.id,
            memo: `貸借自動計上: ${data.memo ?? ""}`.trim(),
            editedBy: "system",
          },
        })
        // 相手口座は逆: BORROW → 残高増加(+), LEND → 残高減少(-)
        const pairDelta = reverseTxType === "LEND" ? -data.principal : data.principal
        await tx.account.update({
          where: { id: data.counterpartyAccountId! },
          data: { balance: { increment: pairDelta } },
        })

        // 7. 両口座の時点残高を再計算
        await recomputeBalanceAfter(tx, data.accountId)
        await recomputeBalanceAfter(tx, data.counterpartyAccountId!)

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

    // 社外相手（counterpartyAccountId なし）→ 単体レコード + AccountTransaction
    const r = await prisma.$transaction(async (tx) => {
      const lending = await tx.lending.create({
        data: {
          accountId: data.accountId,
          counterparty: data.counterparty,
          counterpartyAccountId: null,
          type,
          principal: data.principal,
          outstanding: data.principal,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          memo: data.memo ?? "",
          editedBy: data.editedBy ?? "",
        },
        include: lendingInclude,
      })

      // AccountTransaction 自動計上 + 残高更新
      // 入力された実行日(txDate)を使う。以前はnew Date()だったが、これは実行日が
      // 反映されないバグだったため修正済み。
      await tx.accountTransaction.create({
        data: {
          accountId: data.accountId,
          type: txType,
          amount: data.principal,
          date: txDate,
          counterparty: data.counterparty,
          linkedTransactionId: lending.id,
          lendingId: lending.id,
          memo: `貸借自動計上: ${data.memo ?? ""}`.trim(),
          editedBy: "system",
        },
      })
      const delta = txType === "LEND" ? -data.principal : data.principal
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: delta } },
      })

      // 時点残高を再計算
      await recomputeBalanceAfter(tx, data.accountId)

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
