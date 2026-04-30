import { prisma } from "@/lib/prisma"
import { AccountRepository } from "@/server/repositories/account.repository"
import { LendingRepository } from "@/server/repositories/lending.repository"
import type { AccountDetailDTO } from "@/types/dto"

/**
 * 残高計算（複式簿記版）
 * 直近スナップショット.balance + Σ(toAccount=対象 ＆ date>スナップ日) − Σ(fromAccount=対象 ＆ date>スナップ日)
 */
async function calcBalance(accountId: string): Promise<number> {
  const snap = await prisma.accountBalanceSnapshot.findFirst({
    where: { accountId },
    orderBy: { date: "desc" },
  })
  const baseDate = snap?.date ?? new Date(0)
  const baseBalance = snap?.balance ?? 0

  const [inflow, outflow] = await Promise.all([
    prisma.accountTransaction.aggregate({
      _sum: { amount: true },
      where: {
        toAccountId: accountId,
        date: { gt: baseDate },
        isArchived: false,
      },
    }),
    prisma.accountTransaction.aggregate({
      _sum: { amount: true },
      where: {
        fromAccountId: accountId,
        date: { gt: baseDate },
        isArchived: false,
      },
    }),
  ])

  return baseBalance + (inflow._sum.amount ?? 0) - (outflow._sum.amount ?? 0)
}

/**
 * Lending の未返済額計算（principal − SUM(REPAYMENT)）
 * LEND側: 返済受取（toAccountId=自分） / BORROW側: 返済支払（fromAccountId=自分）
 */
async function calcOutstanding(lending: {
  id: string
  principal: number
  accountId: string
  type: "LEND" | "BORROW"
}): Promise<number> {
  const sum = await prisma.accountTransaction.aggregate({
    _sum: { amount: true },
    where: {
      lendingId: lending.id,
      type: "REPAYMENT",
      isArchived: false,
      ...(lending.type === "LEND"
        ? { toAccountId: lending.accountId }
        : { fromAccountId: lending.accountId }),
    },
  })
  return lending.principal - (sum._sum.amount ?? 0)
}

export class GetAccountDetails {
  static async execute(params: {
    ownerType?: "INTERNAL" | "EXTERNAL"
    accountType?: "BANK" | "SECURITIES"
    isArchived?: boolean
    isActive?: boolean
  } = {}): Promise<AccountDetailDTO[]> {
    const rows = await AccountRepository.findAll(params)

    return await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        name: r.name,
        ownerType: r.ownerType.toLowerCase() as "internal" | "external",
        accountType: r.accountType.toLowerCase() as "bank" | "securities",
        businessId: r.business?.id ?? null,
        businessName: r.business?.name ?? null,
        balance: await calcBalance(r.id),
        purpose: r.purpose,
        investmentPolicy: r.investmentPolicy,
        tags: r.tags,
        isArchived: r.isArchived,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
      }))
    )
  }

  static async executeOne(id: string): Promise<AccountDetailDTO | null> {
    const r = await AccountRepository.findById(id)
    if (!r) return null
    return {
      id: r.id,
      name: r.name,
      ownerType: r.ownerType.toLowerCase() as "internal" | "external",
      accountType: r.accountType.toLowerCase() as "bank" | "securities",
      businessId: r.business?.id ?? null,
      businessName: r.business?.name ?? null,
      balance: await calcBalance(r.id),
      purpose: r.purpose,
      investmentPolicy: r.investmentPolicy,
      tags: r.tags,
      isArchived: r.isArchived,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }
  }

  // 純資産サマリー: 社内銀行口座のみで計算（複式簿記版）
  // 「総残高（社内）」= 社内銀行 active のみ。証券口座・アーカイブ口座は除外
  static async getSummary() {
    const [internalAccounts, lendings] = await Promise.all([
      AccountRepository.findAll({ ownerType: "INTERNAL", isActive: true, isArchived: false }),
      LendingRepository.findMany({ isArchived: false }),
    ])

    // 銀行口座のみで集計
    const internalBankAccounts = internalAccounts.filter((a) => a.accountType === "BANK")
    const balances = await Promise.all(internalBankAccounts.map((a) => calcBalance(a.id)))
    const totalBalance = balances.reduce((s, b) => s + b, 0)

    const internalIds = new Set(internalBankAccounts.map((a) => a.id))

    // 貸借: 社内口座に紐づくもののみ。ペアは1件にカウント
    let totalLent = 0
    let totalBorrowed = 0
    const countedPairs = new Set<string>()
    for (const l of lendings) {
      if (!internalIds.has(l.accountId)) continue
      if (l.linkedLendingId) {
        const pairKey = [l.id, l.linkedLendingId].sort().join("-")
        if (countedPairs.has(pairKey)) continue
        countedPairs.add(pairKey)
      }
      const outstanding = await calcOutstanding({
        id: l.id,
        principal: l.principal,
        accountId: l.accountId,
        type: l.type,
      })
      if (outstanding === 0) continue
      if (l.type === "LEND") totalLent += outstanding
      if (l.type === "BORROW") totalBorrowed += outstanding
    }

    return {
      totalBalance,
      totalLent,
      totalBorrowed,
      netAssets: totalBalance + totalLent - totalBorrowed,
    }
  }
}

// 他ファイルから利用するヘルパーとしてエクスポート
export { calcBalance, calcOutstanding }
