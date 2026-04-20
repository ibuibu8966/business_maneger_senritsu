import { BusinessTaskRepository } from "@/server/repositories/business-task.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { prisma } from "@/lib/prisma"

const TASK_STATUS_TO_DB: Record<string, string> = { todo: "TODO", "in-progress": "IN_PROGRESS", waiting: "WAITING", done: "DONE" }
const PRIORITY_TO_DB: Record<string, string> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

export class CreateBusinessTask {
  static async execute(data: {
    projectId?: string | null
    businessId?: string | null
    title: string
    detail?: string
    assigneeId?: string | null
    assigneeIds?: string[]
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
    issueId?: string | null
  }) {
    // projectId と businessId のどちらか1つは必須
    if (!data.projectId && !data.businessId) {
      throw new Error("projectId または businessId のいずれかが必要です")
    }
    // 通し番号を採番
    const seqResult = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('task_issue_seq')`
    const seqNumber = Number(seqResult[0].nextval)

    // assigneeIds 優先。未指定なら assigneeId から1件だけ補填
    const assigneeIds =
      data.assigneeIds && data.assigneeIds.length > 0
        ? data.assigneeIds
        : data.assigneeId
        ? [data.assigneeId]
        : []

    const result = await BusinessTaskRepository.create({
      projectId: data.projectId ?? null,
      businessId: data.businessId ?? null,
      seqNumber,
      title: data.title,
      detail: data.detail ?? "",
      assigneeId: assigneeIds[0] ?? null,
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
      issueId: data.issueId ?? null,
    })

    if (assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({
        data: assigneeIds.map((employeeId) => ({ taskId: result.id, employeeId })),
        skipDuplicates: true,
      })
    }

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
