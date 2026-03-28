import { BusinessIssueRepository } from "@/repositories/business-issue.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

const ISSUE_STATUS_TO_DB: Record<string, string> = { unresolved: "UNRESOLVED", "in-progress": "IN_PROGRESS", resolved: "RESOLVED" }
const PRIORITY_TO_DB: Record<string, string> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

export class UpdateBusinessIssue {
  static async execute(id: string, data: Record<string, unknown>) {
    const dbData: Record<string, unknown> = {}
    if (data.title !== undefined) dbData.title = data.title
    if (data.detail !== undefined) dbData.detail = data.detail
    if (data.assigneeId !== undefined) dbData.assigneeId = data.assigneeId || null
    if (data.createdBy !== undefined) dbData.createdBy = data.createdBy
    if (data.deadline !== undefined) dbData.deadline = data.deadline ? new Date(data.deadline as string) : null
    if (data.priority !== undefined) dbData.priority = PRIORITY_TO_DB[data.priority as string]
    if (data.status !== undefined) dbData.status = ISSUE_STATUS_TO_DB[data.status as string]
    const result = await BusinessIssueRepository.update(id, dbData)

    try {
      await AuditLogRepository.create({
        action: "UPDATE",
        entityType: "BusinessIssue",
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
