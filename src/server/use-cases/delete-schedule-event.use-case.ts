import { ScheduleEventRepository } from "@/server/repositories/schedule-event.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"

export class DeleteScheduleEvent {
  static async execute(id: string): Promise<void> {
    await ScheduleEventRepository.delete(id)

    try {
      await AuditLogRepository.create({
        action: "DELETE",
        entityType: "ScheduleEvent",
        entityId: id,
        entityName: id,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }
  }
}
