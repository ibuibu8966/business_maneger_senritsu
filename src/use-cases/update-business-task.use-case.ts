import { BusinessTaskRepository } from "@/repositories/business-task.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

const TASK_STATUS_TO_DB: Record<string, string> = { todo: "TODO", "in-progress": "IN_PROGRESS", waiting: "WAITING", done: "DONE" }
const PRIORITY_TO_DB: Record<string, string> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

export class UpdateBusinessTask {
  static async execute(id: string, data: Record<string, unknown>) {
    const dbData: Record<string, unknown> = {}
    if (data.title !== undefined) dbData.title = data.title
    if (data.detail !== undefined) dbData.detail = data.detail
    if (data.assigneeId !== undefined) dbData.assigneeId = data.assigneeId || null
    if (data.deadline !== undefined) dbData.deadline = data.deadline ? new Date(data.deadline as string) : null
    if (data.status !== undefined) dbData.status = TASK_STATUS_TO_DB[data.status as string]
    if (data.memo !== undefined) dbData.memo = data.memo
    if (data.recurring !== undefined) dbData.recurring = data.recurring
    if (data.recurringPattern !== undefined) dbData.recurringPattern = data.recurringPattern || null
    if (data.recurringDay !== undefined) dbData.recurringDay = data.recurringDay ?? null
    if (data.recurringWeek !== undefined) dbData.recurringWeek = data.recurringWeek ?? null
    if (data.recurringEndDate !== undefined) dbData.recurringEndDate = data.recurringEndDate ? new Date(data.recurringEndDate as string) : null
    if (data.sortOrder !== undefined) dbData.sortOrder = data.sortOrder
    if (data.contactId !== undefined) dbData.contactId = data.contactId || null
    if (data.partnerId !== undefined) dbData.partnerId = data.partnerId || null
    if (data.tool !== undefined) dbData.tool = data.tool || null
    if (data.priority !== undefined) dbData.priority = PRIORITY_TO_DB[data.priority as string] ?? "MEDIUM"
    if (data.todayFlag !== undefined) {
      dbData.todayFlag = data.todayFlag
      dbData.todayFlaggedAt = data.todayFlag ? new Date() : null
    }
    const result = await BusinessTaskRepository.update(id, dbData)

    try {
      await AuditLogRepository.create({
        action: "UPDATE",
        entityType: "BusinessTask",
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
