import { BusinessIssueRepository } from "@/repositories/business-issue.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

const ISSUE_STATUS_TO_DB: Record<string, string> = { unresolved: "UNRESOLVED", "in-progress": "IN_PROGRESS", resolved: "RESOLVED" }
const PRIORITY_TO_DB: Record<string, string> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

export class CreateBusinessIssue {
  static async execute(data: {
    projectId: string
    title: string
    detail?: string
    assigneeId?: string | null
    createdBy?: string
    deadline?: string | null
    priority?: string
    status?: string
  }) {
    const result = await BusinessIssueRepository.create({
      projectId: data.projectId,
      title: data.title,
      detail: data.detail ?? "",
      assigneeId: data.assigneeId ?? null,
      createdBy: data.createdBy ?? "",
      deadline: data.deadline ? new Date(data.deadline) : null,
      priority: data.priority ? PRIORITY_TO_DB[data.priority] ?? "MEDIUM" : "MEDIUM",
      status: data.status ? ISSUE_STATUS_TO_DB[data.status] ?? "UNRESOLVED" : "UNRESOLVED",
    })

    try {
      await AuditLogRepository.create({
        action: "CREATE",
        entityType: "BusinessIssue",
        entityId: result.id,
        entityName: result.title,
        changes: {},
        userId: data.createdBy ?? "system",
        userName: data.createdBy ?? "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
