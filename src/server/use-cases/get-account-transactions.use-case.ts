import { AccountTransactionRepository } from "@/server/repositories/account-transaction.repository"
import type { AccountTransactionDTO, AccountTransactionTypeDTO } from "@/types/dto"
import type { AccountTransactionType } from "@/generated/prisma/client"

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
  MISC_EXPENSE: "雑費",
  MISC_INCOME: "雑収入",
}

export class GetAccountTransactions {
  static async execute(params: {
    accountId?: string
    type?: AccountTransactionType
    dateFrom?: string
    dateTo?: string
    isArchived?: boolean
  }): Promise<AccountTransactionDTO[]> {
    const rows = await AccountTransactionRepository.findMany(params)

    return rows.map((r) => ({
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
    }))
  }
}
