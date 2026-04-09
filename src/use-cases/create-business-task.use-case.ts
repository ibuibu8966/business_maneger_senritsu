import { BusinessTaskRepository } from "@/repositories/business-task.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

const TASK_STATUS_TO_DB: Record<string, string> = { todo: "TODO", "in-progress": "IN_PROGRESS", waiting: "WAITING", done: "DONE" }
const PRIORITY_TO_DB: Record<string, string> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

export class CreateBusinessTask {
  static async execute(data: {
    projectId: string
    title: string
    detail?: string
    assigneeId?: string | null
    deadline?: string | null
    status?: string
    memo?: string
    recurring?: boolean
    recurringPattern?: string | null
    recurringDay?: number | null
    recurringWeek?: number | null
    recurringEndDate?: string | null
    sortOrder?: number
    contactId?: string | null
    partnerId?: string | null
    tool?: string | null
    priority?: string
    executionTime?: string | null
    notifyEnabled?: boolean
    notifyMinutesBefore?: number
  }) {
    const result = await BusinessTaskRepository.create({
      projectId: data.projectId,
      title: data.title,
      detail: data.detail ?? "",
      assigneeId: data.assigneeId ?? null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      status: data.status ? TASK_STATUS_TO_DB[data.status] ?? "TODO" : "TODO",
      memo: data.memo ?? "",
      recurring: data.recurring ?? false,
      recurringPattern: data.recurringPattern ?? null,
      recurringDay: data.recurringDay ?? null,
      recurringWeek: data.recurringWeek ?? null,
      recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : null,
      sortOrder: data.sortOrder ?? 0,
      contactId: data.contactId ?? null,
      partnerId: data.partnerId ?? null,
      tool: data.tool ?? null,
      priority: data.priority ? PRIORITY_TO_DB[data.priority] ?? "MEDIUM" : "MEDIUM",
      executionTime: data.executionTime !== undefined ? data.executionTime : "09:00",
      notifyEnabled: data.notifyEnabled ?? true,
      notifyMinutesBefore: data.notifyMinutesBefore ?? 10,
    })

    try {
      await AuditLogRepository.create({
        action: "CREATE",
        entityType: "BusinessTask",
        entityId: result.id,
        entityName: result.title,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
