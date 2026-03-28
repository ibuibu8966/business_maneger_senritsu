import { TaskChecklistRepository } from "@/repositories/task-checklist.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

export class DeleteTaskChecklistItem {
  static async execute(id: string) {
    const result = await TaskChecklistRepository.delete(id)

    try {
      await AuditLogRepository.create({
        action: "DELETE",
        entityType: "TaskChecklistItem",
        entityId: id,
        entityName: (result as { title?: string })?.title ?? id,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
