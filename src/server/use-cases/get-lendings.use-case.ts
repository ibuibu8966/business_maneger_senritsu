import { prisma } from "@/lib/prisma"
import { LendingRepository } from "@/server/repositories/lending.repository"
import type { LendingDTO, LendingPaymentDTO } from "@/types/dto"
import type { LendingType, LendingStatus } from "@/generated/prisma/client"

export class GetLendings {
  static async execute(params: {
    accountId?: string
    type?: LendingType
    status?: LendingStatus
    isArchived?: boolean
  } = {}): Promise<LendingDTO[]> {
    const rows = await LendingRepository.findMany(params)

    // 各Lendingに紐づくLEND/BORROW AccountTransactionをまとめて取得（N+1回避）
    // 同一Lendingに対して1件のみ存在するはず（メイン側）
    const lendingIds = rows.map((r) => r.id)
    const linkedTxs = lendingIds.length === 0
      ? []
      : await prisma.accountTransaction.findMany({
          where: {
            lendingId: { in: lendingIds },
            type: { in: ["LEND", "BORROW"] },
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

    return rows.map((r) => ({
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
      date: dateByLendingId.has(r.id)
        ? dateByLendingId.get(r.id)!.toISOString().split("T")[0]
        : null,
      payments: r.payments.map((p): LendingPaymentDTO => ({
        id: p.id,
        lendingId: p.lendingId,
        amount: p.amount,
        date: p.date.toISOString().split("T")[0],
        memo: p.memo,
        createdAt: p.createdAt.toISOString(),
      })),
    }))
  }
}
