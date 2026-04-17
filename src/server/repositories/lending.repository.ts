import { prisma } from "@/lib/prisma"
import type { LendingType, LendingStatus } from "@/generated/prisma/client"

export class LendingRepository {
  static async findMany(params: {
    accountId?: string
    type?: LendingType
    status?: LendingStatus
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
        ...(params.status && { status: params.status }),
        ...(params.isArchived !== undefined && { isArchived: params.isArchived }),
      },
      include: {
        account: { select: { id: true, name: true } },
        counterpartyAccount: { select: { id: true, name: true } },
        payments: { orderBy: { date: "desc" } },
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
        payments: { orderBy: { date: "desc" } },
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
    outstanding: number
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
        outstanding: data.outstanding,
        dueDate: data.dueDate ?? null,
        memo: data.memo ?? "",
      },
      include: {
        account: { select: { id: true, name: true } },
        counterpartyAccount: { select: { id: true, name: true } },
        payments: { orderBy: { date: "desc" } },
      },
    })
  }

  static async update(
    id: string,
    data: {
      counterparty?: string
      counterpartyAccountId?: string | null
      outstanding?: number
      dueDate?: Date | null
      status?: LendingStatus
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
        payments: { orderBy: { date: "desc" } },
      },
    })
  }

  static async delete(id: string) {
    return prisma.lending.delete({ where: { id } })
  }

  // 返済
  static async createPayment(data: {
    lendingId: string
    amount: number
    date: Date
    memo?: string
  }) {
    return prisma.lendingPayment.create({
      data: {
        lendingId: data.lendingId,
        amount: data.amount,
        date: data.date,
        memo: data.memo ?? "",
      },
    })
  }

  static async deletePayment(id: string) {
    return prisma.lendingPayment.delete({ where: { id } })
  }
}
