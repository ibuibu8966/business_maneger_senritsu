import { prisma } from "@/lib/prisma"
import { AccountRepository } from "@/repositories/account.repository"
import { LendingRepository } from "@/repositories/lending.repository"
import type { AccountDetailDTO } from "@/types/dto"
import type { AccountTransactionType } from "@/generated/prisma/client"
import { BALANCE_DELTA } from "@/lib/balance-delta"

export class GetAccountDetails {
  static async execute(params: {
    ownerType?: "INTERNAL" | "EXTERNAL"
    accountType?: "BANK" | "SECURITIES"
    isArchived?: boolean
    isActive?: boolean
  } = {}): Promise<AccountDetailDTO[]> {
    const rows = await AccountRepository.findAll(params)

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      ownerType: r.ownerType.toLowerCase() as "internal" | "external",
      accountType: r.accountType.toLowerCase() as "bank" | "securities",
      businessId: r.business?.id ?? null,
      businessName: r.business?.name ?? null,
      balance: r.balance,
      purpose: r.purpose,
      investmentPolicy: r.investmentPolicy,
      tags: r.tags,
      isArchived: r.isArchived,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }))
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
      balance: r.balance,
      purpose: r.purpose,
      investmentPolicy: r.investmentPolicy,
      tags: r.tags,
      isArchived: r.isArchived,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }
  }

  // 純資産サマリー: 社内口座のみで計算
  static async getSummary() {
    const [internalAccounts, lendings, transactions] = await Promise.all([
      AccountRepository.findAll({ ownerType: "INTERNAL", isActive: true }),
      LendingRepository.findMany({ isArchived: false }),
      prisma.accountTransaction.findMany({
        where: { isArchived: false },
        select: { accountId: true, type: true, amount: true, fromAccountId: true, toAccountId: true },
      }),
    ])

    // 社内口座IDのセット
    const internalIds = new Set(internalAccounts.map((a) => a.id))

    // 口座ごとの残高を取引から計算
    const balanceByAccount = new Map<string, number>()
    for (const t of transactions) {
      if (t.type === "TRANSFER") {
        if (t.fromAccountId) {
          balanceByAccount.set(t.fromAccountId, (balanceByAccount.get(t.fromAccountId) ?? 0) - t.amount)
        }
        if (t.toAccountId) {
          balanceByAccount.set(t.toAccountId, (balanceByAccount.get(t.toAccountId) ?? 0) + t.amount)
        }
      } else {
        const delta = BALANCE_DELTA[t.type as AccountTransactionType]
        if (delta !== 0) {
          balanceByAccount.set(t.accountId, (balanceByAccount.get(t.accountId) ?? 0) + delta * t.amount)
        }
      }
    }

    // 社内口座の残高のみ合算
    let totalBalance = 0
    for (const id of internalIds) {
      totalBalance += balanceByAccount.get(id) ?? 0
    }

    // 貸借: 社内口座に紐づくもののみ
    // ペア貸借は重複カウントを防ぐ（ペアの2件目をスキップ）
    let totalLent = 0
    let totalBorrowed = 0
    const countedPairs = new Set<string>()
    for (const l of lendings) {
      if (l.status === "COMPLETED") continue
      if (!internalIds.has(l.accountId)) continue
      if (l.linkedLendingId) {
        const pairKey = [l.id, l.linkedLendingId].sort().join("-")
        if (countedPairs.has(pairKey)) continue
        countedPairs.add(pairKey)
      }
      if (l.type === "LEND") {
        totalLent += l.outstanding
      }
      if (l.type === "BORROW") {
        totalBorrowed += l.outstanding
      }
    }

    return {
      totalBalance,
      totalLent,
      totalBorrowed,
      netAssets: totalBalance + totalLent - totalBorrowed,
    }
  }
}
