import { prisma } from "@/lib/prisma"
import type { OwnerType, AccountType } from "@/generated/prisma/client"

export class AccountRepository {
  // 管理会計用: ownerType=INTERNAL & accountType=BANK のみ
  static async findForAccounting() {
    return prisma.account.findMany({
      where: {
        isActive: true,
        ownerType: "INTERNAL",
        accountType: "BANK",
      },
      select: { id: true, name: true, businessId: true },
      orderBy: { createdAt: "asc" },
    })
  }

  // 貸借・口座管理用: 全口座取得
  static async findAll(params: {
    ownerType?: OwnerType
    accountType?: AccountType
    isArchived?: boolean
    isActive?: boolean
  } = {}) {
    return prisma.account.findMany({
      where: {
        ...(params.ownerType && { ownerType: params.ownerType }),
        ...(params.accountType && { accountType: params.accountType }),
        ...(params.isArchived !== undefined && { isArchived: params.isArchived }),
        ...(params.isActive !== undefined && { isActive: params.isActive }),
      },
      include: {
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    })
  }

  static async findById(id: string) {
    return prisma.account.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, name: true } },
      },
    })
  }

  static async create(data: {
    name: string
    ownerType: OwnerType
    accountType: AccountType
    businessId?: string | null
    balance?: number
    purpose?: string
    investmentPolicy?: string
    tags?: string[]
  }) {
    return prisma.account.create({
      data: {
        name: data.name,
        ownerType: data.ownerType,
        accountType: data.accountType,
        businessId: data.businessId ?? null,
        balance: data.balance ?? 0,
        purpose: data.purpose ?? "",
        investmentPolicy: data.investmentPolicy ?? "",
        tags: data.tags ?? [],
      },
      include: {
        business: { select: { id: true, name: true } },
      },
    })
  }

  static async update(
    id: string,
    data: {
      name?: string
      ownerType?: OwnerType
      accountType?: AccountType
      businessId?: string | null
      balance?: number
      purpose?: string
      investmentPolicy?: string
      tags?: string[]
      isArchived?: boolean
      isActive?: boolean
    }
  ) {
    return prisma.account.update({
      where: { id },
      data,
      include: {
        business: { select: { id: true, name: true } },
      },
    })
  }

  // 残高を加減算
  static async adjustBalance(id: string, delta: number) {
    return prisma.account.update({
      where: { id },
      data: { balance: { increment: delta } },
    })
  }
}
