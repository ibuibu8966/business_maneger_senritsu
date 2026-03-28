import { ChecklistTemplateRepository } from "@/repositories/checklist-template.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

export class DeleteChecklistTemplate {
  static async execute(id: string) {
    const result = await ChecklistTemplateRepository.delete(id)

    try {
      await AuditLogRepository.create({
        action: "DELETE",
        entityType: "ChecklistTemplate",
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
