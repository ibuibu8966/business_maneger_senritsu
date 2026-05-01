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
        // 1取引=1レコード（複式簿記版）：from/to で対象口座を判定
        ...(params.accountId && {
          OR: [
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
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
      // 表示は時系列降順（新→古）。同日内は serialNumber 降順で安定させる
      // → balanceAfter（昇順累積）と表示順が完全に逆順で整合
      orderBy: [{ date: "desc" }, { serialNumber: "desc" }],
    })
  }

  static async findById(id: string) {
    return prisma.accountTransaction.findUnique({
      where: { id },
      include: {
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    })
  }

  static async create(data: {
    type: AccountTransactionType
    amount: number
    date: Date
    fromAccountId: string
    toAccountId: string
    counterparty?: string
    lendingId?: string | null
    memo?: string
    editedBy?: string
    tags?: string[]
  }) {
    return prisma.accountTransaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        date: data.date,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        counterparty: data.counterparty ?? "",
        lendingId: data.lendingId ?? null,
        memo: data.memo ?? "",
        editedBy: data.editedBy ?? "",
        tags: data.tags ?? [],
      },
      include: {
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    })
  }

  static async update(
    id: string,
    data: {
      type?: AccountTransactionType
      amount?: number
      date?: Date
      fromAccountId?: string
      toAccountId?: string
      counterparty?: string
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
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    })
  }

  static async delete(id: string) {
    return prisma.accountTransaction.delete({ where: { id } })
  }
}
