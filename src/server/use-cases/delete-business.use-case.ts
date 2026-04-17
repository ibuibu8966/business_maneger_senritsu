import { BusinessRepository } from "@/server/repositories/business.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"

export class DeleteBusiness {
  static async execute(id: string) {
    const result = await BusinessRepository.softDelete(id)

    try {
      await AuditLogRepository.create({
        action: "DELETE",
        entityType: "Business",
        entityId: id,
        entityName: (result as { name?: string })?.name ?? id,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
