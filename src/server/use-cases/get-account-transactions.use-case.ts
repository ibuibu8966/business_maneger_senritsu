import { prisma } from "@/lib/prisma"
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

    const base = rows.map((r) => ({
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

    // accountId 指定なし → balanceAfter は計算しない
    if (!params.accountId) return base

    // 時点残高を計算: 直近スナップショットの残高を起点に、active 取引を時系列昇順で累積
    const accountId = params.accountId
    const snap = await prisma.accountBalanceSnapshot.findFirst({
      where: { accountId },
      orderBy: { date: "desc" },
    })
    const baseDate = snap?.date ?? new Date(0)
    const baseBalance = snap?.balance ?? 0

    // 累積計算用に「スナップショット日より後の active 取引」を昇順で取得
    const activeAsc = [...base]
      .filter((t) => !t.isArchived && new Date(t.date) > baseDate)
      .sort((a, b) => {
        const ad = new Date(a.date).getTime()
        const bd = new Date(b.date).getTime()
        if (ad !== bd) return ad - bd
        return a.serialNumber - b.serialNumber
      })

    const balanceById = new Map<string, number>()
    let running = baseBalance
    for (const t of activeAsc) {
      if (t.toAccountId === accountId) running += t.amount
      else if (t.fromAccountId === accountId) running -= t.amount
      balanceById.set(t.id, running)
    }

    return base.map((t) => ({
      ...t,
      balanceAfter: balanceById.get(t.id),
    }))
  }
}
