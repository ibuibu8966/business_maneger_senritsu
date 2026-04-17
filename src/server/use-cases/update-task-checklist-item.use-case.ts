import { TaskChecklistRepository } from "@/server/repositories/task-checklist.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"

export class UpdateTaskChecklistItem {
  static async execute(id: string, data: { title?: string; checked?: boolean; sortOrder?: number }) {
    const result = await TaskChecklistRepository.update(id, data)

    try {
      await AuditLogRepository.create({
        action: "UPDATE",
        entityType: "TaskChecklistItem",
        entityId: id,
        entityName: (result as { title?: string }).title ?? id,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
