import { BusinessIssueRepository } from "@/server/repositories/business-issue.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { prisma } from "@/lib/prisma"

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

    // 担当者複数対応
    if (data.assigneeIds !== undefined) {
      const newIds = (data.assigneeIds as string[]) ?? []
      await prisma.issueAssignee.deleteMany({ where: { issueId: id } })
      if (newIds.length > 0) {
        await prisma.issueAssignee.createMany({
          data: newIds.map((employeeId) => ({ issueId: id, employeeId })),
          skipDuplicates: true,
        })
      }
      dbData.assigneeId = newIds[0] ?? null
    }

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
