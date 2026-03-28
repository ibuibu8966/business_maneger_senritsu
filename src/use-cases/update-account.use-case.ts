import { AccountRepository } from "@/repositories/account.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"
import type { AccountDetailDTO } from "@/types/dto"
import type { OwnerType, AccountType } from "@/generated/prisma/client"

export class UpdateAccount {
  static async execute(
    id: string,
    data: {
      name?: string
      ownerType?: "internal" | "external"
      accountType?: "bank" | "securities"
      businessId?: string | null
      balance?: number
      purpose?: string
      investmentPolicy?: string
      tags?: string[]
      isArchived?: boolean
      isActive?: boolean
    }
  ): Promise<AccountDetailDTO> {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.ownerType !== undefined) updateData.ownerType = data.ownerType.toUpperCase() as OwnerType
    if (data.accountType !== undefined) updateData.accountType = data.accountType.toUpperCase() as AccountType
    if (data.businessId !== undefined) updateData.businessId = data.businessId
    if (data.balance !== undefined) updateData.balance = data.balance
    if (data.purpose !== undefined) updateData.purpose = data.purpose
    if (data.investmentPolicy !== undefined) updateData.investmentPolicy = data.investmentPolicy
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const r = await AccountRepository.update(id, updateData as Parameters<typeof AccountRepository.update>[1])

    const result: AccountDetailDTO = {
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

    try {
      await AuditLogRepository.create({
        action: "UPDATE",
        entityType: "Account",
        entityId: id,
        entityName: r.name,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
