import { ChecklistTemplateRepository } from "@/repositories/checklist-template.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

export class CreateChecklistTemplate {
  static async execute(data: { name: string; businessId?: string; items: { title: string; sortOrder: number }[] }) {
    const result = await ChecklistTemplateRepository.create(data)

    try {
      await AuditLogRepository.create({
        action: "CREATE",
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
