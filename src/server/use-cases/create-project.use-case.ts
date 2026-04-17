import { prisma } from "@/lib/prisma"
import { ProjectRepository } from "@/server/repositories/project.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"

const STATUS_TO_DB: Record<string, string> = { active: "ACTIVE", "on-hold": "ON_HOLD", completed: "COMPLETED" }
const PRIORITY_TO_DB: Record<string, string> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

export class CreateProject {
  static async execute(data: {
    businessId: string
    name: string
    parentId?: string | null
    purpose?: string
    deadline?: string | null
    revenue?: number
    expense?: number
    status?: string
    priority?: string
    assigneeIds?: string[]
    contractMemo?: string
    attachments?: any[]
    accountNames?: string[]
    partnerNames?: string[]
    sortOrder?: number
  }) {
    const project = await ProjectRepository.create({
      businessId: data.businessId,
      name: data.name,
      parentId: data.parentId ?? null,
      purpose: data.purpose ?? "",
      deadline: data.deadline ? new Date(data.deadline) : null,
      revenue: data.revenue ?? 0,
      expense: data.expense ?? 0,
      status: data.status ? STATUS_TO_DB[data.status] ?? "ACTIVE" : "ACTIVE",
      priority: data.priority ? PRIORITY_TO_DB[data.priority] ?? "MEDIUM" : "MEDIUM",
      contractMemo: data.contractMemo ?? "",
      attachments: data.attachments ?? [],
      accountNames: data.accountNames ?? [],
      partnerNames: data.partnerNames ?? [],
      sortOrder: data.sortOrder ?? 0,
    })

    // 担当者の中間テーブルへの登録
    if (data.assigneeIds && data.assigneeIds.length > 0) {
      await prisma.projectAssignee.createMany({
        data: data.assigneeIds.map((employeeId) => ({
          projectId: project.id,
          employeeId,
        })),
        skipDuplicates: true,
      })
    }

    try {
      await AuditLogRepository.create({
        action: "CREATE",
        entityType: "Project",
        entityId: project.id,
        entityName: project.name,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return project
  }
}
