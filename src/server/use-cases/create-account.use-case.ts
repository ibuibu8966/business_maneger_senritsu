import { AccountRepository } from "@/server/repositories/account.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import type { AccountDetailDTO } from "@/types/dto"
import type { OwnerType, AccountType } from "@/generated/prisma/client"

/**
 * 口座作成（複式簿記版）
 * - balance フィールドは廃止。初期残高は INITIAL 取引で別途登録（UpsertInitialBalance）
 */
export class CreateAccount {
  static async execute(data: {
    name: string
    ownerType: "internal" | "external"
    accountType: "bank" | "securities"
    businessId?: string | null
    purpose?: string
    investmentPolicy?: string
    tags?: string[]
  }): Promise<AccountDetailDTO> {
    const r = await AccountRepository.create({
      name: data.name,
      ownerType: data.ownerType.toUpperCase() as OwnerType,
      accountType: data.accountType.toUpperCase() as AccountType,
      businessId: data.businessId,
      purpose: data.purpose,
      investmentPolicy: data.investmentPolicy,
      tags: data.tags,
    })

    const result: AccountDetailDTO = {
      id: r.id,
      name: r.name,
      ownerType: r.ownerType.toLowerCase() as "internal" | "external",
      accountType: r.accountType.toLowerCase() as "bank" | "securities",
      businessId: r.business?.id ?? null,
      businessName: r.business?.name ?? null,
      balance: 0,                       // 新規口座は残高 0 から開始
      purpose: r.purpose,
      investmentPolicy: r.investmentPolicy,
      tags: r.tags,
      isArchived: r.isArchived,
      isActive: r.isActive,
      isVirtual: r.isVirtual,
      createdAt: r.createdAt.toISOString(),
    }

    try {
      await AuditLogRepository.create({
        action: "CREATE",
        entityType: "Account",
        entityId: r.id,
        entityName: r.name,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
