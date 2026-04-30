import { prisma } from "@/lib/prisma"
import type { LendingType } from "@/generated/prisma/client"

export class LendingRepository {
  static async findMany(params: {
    accountId?: string
    type?: LendingType
    isArchived?: boolean
  }) {
    return prisma.lending.findMany({
      where: {
        ...(params.accountId && {
          OR: [
            { accountId: params.accountId },
            { counterpartyAccountId: params.accountId },
          ],
        }),
        ...(params.type && { type: params.type }),
        ...(params.isArchived !== undefined && { isArchived: params.isArchived }),
      },
      include: {
        account: { select: { id: true, name: true } },
        counterpartyAccount: { select: { id: true, name: true } },
        // payments リレーション廃止：返済は AccountTransaction(type=REPAYMENT, lendingId) で取得
      },
      orderBy: { createdAt: "desc" },
    })
  }

  static async findById(id: string) {
    return prisma.lending.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, name: true } },
        counterpartyAccount: { select: { id: true, name: true } },
      },
    })
  }

  static async create(data: {
    accountId: string
    counterparty: string
    counterpartyAccountId?: string | null
    linkedLendingId?: string | null
    type: LendingType
    principal: number
    dueDate?: Date | null
    memo?: string
  }) {
    return prisma.lending.create({
      data: {
        accountId: data.accountId,
        counterparty: data.counterparty,
        counterpartyAccountId: data.counterpartyAccountId ?? null,
        linkedLendingId: data.linkedLendingId ?? null,
        type: data.type,
        principal: data.principal,
        dueDate: data.dueDate ?? null,
        memo: data.memo ?? "",
        // outstanding / status は廃止（都度計算）
      },
      include: {
        account: { select: { id: true, name: true } },
        counterpartyAccount: { select: { id: true, name: true } },
      },
    })
  }

  static async update(
    id: string,
    data: {
      counterparty?: string
      counterpartyAccountId?: string | null
      // outstanding / status は廃止
      dueDate?: Date | null
      memo?: string
      editedBy?: string
      tags?: string[]
      isArchived?: boolean
    }
  ) {
    return prisma.lending.update({
      where: { id },
      data,
      include: {
        account: { select: { id: true, name: true } },
        counterpartyAccount: { select: { id: true, name: true } },
      },
    })
  }

  static async delete(id: string) {
    return prisma.lending.delete({ where: { id } })
  }

  // 返済（type=REPAYMENT の AccountTransaction として記録）
  // LendingPayment テーブル廃止に伴い、AccountTransaction で代替
  static async findPayments(lendingId: string) {
    return prisma.accountTransaction.findMany({
      where: { lendingId, type: "REPAYMENT" },
      orderBy: { date: "desc" },
    })
  }
}
