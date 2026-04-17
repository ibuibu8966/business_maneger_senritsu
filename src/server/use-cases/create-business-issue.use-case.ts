import { BusinessIssueRepository } from "@/server/repositories/business-issue.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { prisma } from "@/lib/prisma"
import type { BusinessIssueStatus, BusinessPriority } from "@/generated/prisma/client"

const ISSUE_STATUS_TO_DB: Record<string, BusinessIssueStatus> = { unresolved: "UNRESOLVED", "in-progress": "IN_PROGRESS", resolved: "RESOLVED" }
const PRIORITY_TO_DB: Record<string, BusinessPriority> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

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
    // 通し番号を採番
    const seqResult = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('task_issue_seq')`
    const seqNumber = Number(seqResult[0].nextval)

    const result = await BusinessIssueRepository.create({
      projectId: data.projectId,
      seqNumber,
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
