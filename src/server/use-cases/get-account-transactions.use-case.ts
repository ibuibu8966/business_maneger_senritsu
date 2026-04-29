import { AccountTransactionRepository } from "@/server/repositories/account-transaction.repository"
import type { AccountTransactionDTO, AccountTransactionTypeDTO } from "@/types/dto"
import type { AccountTransactionType } from "@/generated/prisma/client"

const TYPE_LABELS: Record<string, string> = {
  INITIAL: "初期残高",
  DEPOSIT: "純入金",
  WITHDRAWAL: "純出金",
  INVESTMENT: "出資",
  TRANSFER: "振替",
  LEND: "貸出",
  BORROW: "借入",
  REPAYMENT_RECEIVE: "返済受取",
  REPAYMENT_PAY: "返済支払",
  INTEREST_RECEIVE: "利息受取",
  INTEREST_PAY: "利息支払",
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
      balanceAfter: r.balanceAfter,
      createdAt: r.createdAt.toISOString(),
    }))
  }
}
