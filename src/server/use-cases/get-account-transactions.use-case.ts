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
  EXPENSE: "支出",
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
      // 仮想口座（複式簿記の集約口座など、UI非表示）は API レスポンスから完全に隠す
      fromAccountId: r.fromAccount.isVirtual ? null : r.fromAccount.id,
      fromAccountName: r.fromAccount.isVirtual ? null : r.fromAccount.name,
      toAccountId: r.toAccount.isVirtual ? null : r.toAccount.id,
      toAccountName: r.toAccount.isVirtual ? null : r.toAccount.name,
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

    // 時点残高: 全 active 取引を date昇順+serialNumber昇順 で累積
    // スナップショットは「最古 active 取引日より前」の最新分のみを累積の起点に使う
    // → スナップショット日以降の active 取引にも balanceAfter が必ず付く
    const accountId = params.accountId

    // 同日内は createdAt 昇順で安定（serialNumber は移行データで時系列と逆転がある）
    const activeAsc = base
      .filter((t) => !t.isArchived)
      .sort((a, b) => {
        const ad = new Date(a.date).getTime()
        const bd = new Date(b.date).getTime()
        if (ad !== bd) return ad - bd
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })

    let baseBalance = 0
    if (activeAsc.length > 0) {
      const oldestActiveDate = new Date(activeAsc[0].date)
      const snap = await prisma.accountBalanceSnapshot.findFirst({
        where: { accountId, date: { lt: oldestActiveDate } },
        orderBy: { date: "desc" },
      })
      baseBalance = snap?.balance ?? 0
    }

    const balanceById = new Map<string, number>()
    let running = baseBalance
    for (const t of activeAsc) {
      if (t.toAccountId === accountId) running += t.amount
      else if (t.fromAccountId === accountId) running -= t.amount
      balanceById.set(t.id, running)
    }

    // isArchived の取引は balanceAfter 未設定（UI 側で「-」表示）
    return base.map((t) => ({
      ...t,
      balanceAfter: balanceById.get(t.id),
    }))
  }
}
