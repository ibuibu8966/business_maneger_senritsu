import { prisma } from "@/lib/prisma"
import { BusinessRepository } from "@/server/repositories/business.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"

const STATUS_TO_DB: Record<string, string> = { active: "ACTIVE", "on-hold": "ON_HOLD", completed: "COMPLETED" }
const PRIORITY_TO_DB: Record<string, string> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

export class CreateBusiness {
  static async execute(data: {
    name: string
    purpose?: string
    status?: string
    priority?: string
    assigneeIds?: string[]
    contractMemo?: string
    attachments?: any[]
  }) {
    const business = await BusinessRepository.create({
      name: data.name,
      purpose: data.purpose ?? "",
      status: data.status ? STATUS_TO_DB[data.status] ?? "ACTIVE" : "ACTIVE",
      priority: data.priority ? PRIORITY_TO_DB[data.priority] ?? "MEDIUM" : "MEDIUM",
      contractMemo: data.contractMemo ?? "",
      attachments: data.attachments ?? [],
    })

    // 担当者の中間テーブルへの登録
    if (data.assigneeIds && data.assigneeIds.length > 0) {
      await prisma.businessAssignee.createMany({
        data: data.assigneeIds.map((employeeId) => ({
          businessId: business.id,
          employeeId,
        })),
        skipDuplicates: true,
      })
    }

    try {
      await AuditLogRepository.create({
        action: "CREATE",
        entityType: "Business",
        entityId: business.id,
        entityName: business.name,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return business
  }
}
