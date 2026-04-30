import { prisma } from "@/lib/prisma"
import { LendingRepository } from "@/server/repositories/lending.repository"
import { calcOutstanding } from "@/server/use-cases/get-account-details.use-case"
import type { LendingDTO, LendingPaymentDTO } from "@/types/dto"
import type { LendingType } from "@/generated/prisma/client"

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

export class GetLendings {
  static async execute(params: {
    accountId?: string
    type?: LendingType
    isArchived?: boolean
  } = {}): Promise<LendingDTO[]> {
    const rows = await LendingRepository.findMany(params)
    const lendingIds = rows.map((r) => r.id)

    // 各Lendingに紐づくLENDING取引（実行日の取得用）
    const linkedTxs = lendingIds.length === 0
      ? []
      : await prisma.accountTransaction.findMany({
          where: {
            lendingId: { in: lendingIds },
            type: "LENDING",
          },
          select: { lendingId: true, date: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        })
    const dateByLendingId = new Map<string, Date>()
    for (const t of linkedTxs) {
      if (t.lendingId && !dateByLendingId.has(t.lendingId)) {
        dateByLendingId.set(t.lendingId, t.date)
      }
    }

    // 各Lendingの返済履歴（type=REPAYMENT）
    const repayments = lendingIds.length === 0
      ? []
      : await prisma.accountTransaction.findMany({
          where: {
            lendingId: { in: lendingIds },
            type: "REPAYMENT",
            isArchived: false,
          },
          orderBy: { date: "desc" },
        })
    const paymentsByLendingId = new Map<string, typeof repayments>()
    for (const r of repayments) {
      if (!r.lendingId) continue
      const arr = paymentsByLendingId.get(r.lendingId) ?? []
      arr.push(r)
      paymentsByLendingId.set(r.lendingId, arr)
    }

    return await Promise.all(
      rows.map(async (r) => {
        const outstanding = await calcOutstanding({
          id: r.id,
          principal: r.principal,
          accountId: r.accountId,
          type: r.type,
        })
        const status = computeStatus({ outstanding, dueDate: r.dueDate })
        const lendingPayments = paymentsByLendingId.get(r.id) ?? []

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
          outstanding,
          dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
          status,
          memo: r.memo,
          editedBy: r.editedBy ?? "",
          tags: r.tags ?? [],
          isArchived: r.isArchived,
          createdAt: r.createdAt.toISOString(),
          date: dateByLendingId.has(r.id)
            ? dateByLendingId.get(r.id)!.toISOString().split("T")[0]
            : null,
          payments: lendingPayments.map((p): LendingPaymentDTO => ({
            id: p.id,
            lendingId: p.lendingId!,
            amount: p.amount,
            date: p.date.toISOString().split("T")[0],
            memo: p.memo,
            createdAt: p.createdAt.toISOString(),
          })),
        }
      })
    )
  }
}
