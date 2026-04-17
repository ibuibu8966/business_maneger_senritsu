import { ChecklistTemplateRepository } from "@/server/repositories/checklist-template.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"

export class UpdateChecklistTemplate {
  static async execute(id: string, data: { name: string; businessId?: string; items: { title: string; sortOrder: number }[] }) {
    const result = await ChecklistTemplateRepository.update(id, data)

    try {
      await AuditLogRepository.create({
        action: "UPDATE",
        entityType: "ChecklistTemplate",
        entityId: result.id,
        entityName: result.name,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
