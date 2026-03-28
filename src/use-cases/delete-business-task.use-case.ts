import { BusinessTaskRepository } from "@/repositories/business-task.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

export class DeleteBusinessTask {
  static async execute(id: string) {
    const result = await BusinessTaskRepository.delete(id)

    try {
      await AuditLogRepository.create({
        action: "DELETE",
        entityType: "BusinessTask",
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
