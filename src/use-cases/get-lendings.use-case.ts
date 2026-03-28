import { LendingRepository } from "@/repositories/lending.repository"
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
