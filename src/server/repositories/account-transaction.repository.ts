import { prisma } from "@/lib/prisma"
import type { AccountTransactionType } from "@/generated/prisma/client"

export class AccountTransactionRepository {
  static async findMany(params: {
    accountId?: string
    type?: AccountTransactionType
    dateFrom?: string
    dateTo?: string
    isArchived?: boolean
  }) {
    return prisma.accountTransaction.findMany({
      where: {
        ...(params.accountId && {
          OR: [
            { accountId: params.accountId },
            { fromAccountId: params.accountId },
            { toAccountId: params.accountId },
          ],
        }),
        ...(params.type && { type: params.type }),
        ...(params.dateFrom && { date: { gte: new Date(params.dateFrom) } }),
        ...(params.dateTo && {
          date: {
            ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
            lte: new Date(params.dateTo),
          },
        }),
        ...(params.isArchived !== undefined && { isArchived: params.isArchived }),
      },
      include: {
        account: { select: { id: true, name: true } },
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    })
  }

  static async findById(id: string) {
    return prisma.accountTransaction.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, name: true } },
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    })
  }

  static async create(data: {
    accountId: string
    type: AccountTransactionType
    amount: number
    date: Date
    fromAccountId?: string | null
    toAccountId?: string | null
    counterparty?: string
    linkedTransactionId?: string | null
    linkedTransferId?: string | null
    lendingId?: string | null
    lendingPaymentId?: string | null
    direction?: string | null
    memo?: string
    editedBy?: string
    tags?: string[]
  }) {
    return prisma.accountTransaction.create({
      data: {
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        date: data.date,
        fromAccountId: data.fromAccountId ?? null,
        toAccountId: data.toAccountId ?? null,
        counterparty: data.counterparty ?? "",
        linkedTransactionId: data.linkedTransactionId ?? null,
        linkedTransferId: data.linkedTransferId ?? null,
        lendingId: data.lendingId ?? null,
        lendingPaymentId: data.lendingPaymentId ?? null,
        direction: data.direction ?? null,
        memo: data.memo ?? "",
        editedBy: data.editedBy ?? "",
        tags: data.tags ?? [],
      },
      include: {
        account: { select: { id: true, name: true } },
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    })
  }

  static async update(
    id: string,
    data: {
      accountId?: string
      type?: AccountTransactionType
      amount?: number
      date?: Date
      fromAccountId?: string | null
      toAccountId?: string | null
      counterparty?: string
      linkedTransactionId?: string | null
      memo?: string
      editedBy?: string
      tags?: string[]
      isArchived?: boolean
    }
  ) {
    return prisma.accountTransaction.update({
      where: { id },
      data,
      include: {
        account: { select: { id: true, name: true } },
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    })
  }

  static async delete(id: string) {
    return prisma.accountTransaction.delete({ where: { id } })
  }
}
