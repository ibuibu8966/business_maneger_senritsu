import { prisma } from "@/lib/prisma"
import { idNameSelect } from "@/lib/prisma-selects"
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
        business: { select: idNameSelect },
      },
      orderBy: { createdAt: "asc" },
    })
  }

  static async findById(id: string) {
    return prisma.account.findUnique({
      where: { id },
      include: {
        business: { select: idNameSelect },
      },
    })
  }

  // 外部口座を取得（複式簿記版で全外部取引の仮想集約口座）
  // データ移行時に scripts/migrate-double-entry.js で 1件作成済み
  private static externalIdCache: string | null = null
  static async findExternalAccountId(): Promise<string> {
    if (this.externalIdCache) return this.externalIdCache
    const a = await prisma.account.findFirst({
      where: { ownerType: "EXTERNAL", name: "外部" },
      select: { id: true },
    })
    if (!a) throw new Error("EXTERNAL口座が存在しません。データ移行を確認してください。")
    this.externalIdCache = a.id
    return a.id
  }

  static async create(data: {
    name: string
    ownerType: OwnerType
    accountType: AccountType
    businessId?: string | null
    purpose?: string
    investmentPolicy?: string
    tags?: string[]
    // balance は廃止（初期残高は INITIAL 取引で表現）
  }) {
    return prisma.account.create({
      data: {
        name: data.name,
        ownerType: data.ownerType,
        accountType: data.accountType,
        businessId: data.businessId ?? null,
        purpose: data.purpose ?? "",
        investmentPolicy: data.investmentPolicy ?? "",
        tags: data.tags ?? [],
      },
      include: {
        business: { select: idNameSelect },
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
      purpose?: string
      investmentPolicy?: string
      tags?: string[]
      isArchived?: boolean
      isActive?: boolean
      recalcRequiredFromDate?: Date | null
    }
  ) {
    return prisma.account.update({
      where: { id },
      data,
      include: {
        business: { select: idNameSelect },
      },
    })
  }

  // 過去日付の取引が登録された時に呼ぶ：再計算フラグを更新
  // 既にフラグがあるならより古い日付に更新（min を取る）
  static async markRecalcRequired(id: string, date: Date) {
    const acc = await prisma.account.findUnique({
      where: { id },
      select: { recalcRequiredFromDate: true },
    })
    const current = acc?.recalcRequiredFromDate
    if (!current || date < current) {
      await prisma.account.update({
        where: { id },
        data: { recalcRequiredFromDate: date },
      })
    }
  }
}
