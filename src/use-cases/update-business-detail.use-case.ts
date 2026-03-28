import { prisma } from "@/lib/prisma"
import { BusinessRepository } from "@/repositories/business.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

const STATUS_TO_DB: Record<string, string> = { active: "ACTIVE", "on-hold": "ON_HOLD", completed: "COMPLETED" }
const PRIORITY_TO_DB: Record<string, string> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

export class UpdateBusinessDetail {
  static async execute(id: string, data: Record<string, unknown>) {
    const dbData: Record<string, unknown> = {}
    if (data.name !== undefined) dbData.name = data.name
    if (data.purpose !== undefined) dbData.purpose = data.purpose
    if (data.revenue !== undefined) dbData.revenue = data.revenue
    if (data.expense !== undefined) dbData.expense = data.expense
    if (data.status !== undefined) dbData.status = STATUS_TO_DB[data.status as string]
    if (data.priority !== undefined) dbData.priority = PRIORITY_TO_DB[data.priority as string]
    if (data.contractMemo !== undefined) dbData.contractMemo = data.contractMemo
    if (data.attachments !== undefined) dbData.attachments = data.attachments

    // カスケード処理（ステータス・担当者）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cascadeOps: any[] = []

    // ステータス連動: 配下PJ全部を同じステータスに
    if (data.status !== undefined) {
      const dbStatus = STATUS_TO_DB[data.status as string]
      cascadeOps.push(
        prisma.project.updateMany({ where: { businessId: id }, data: { status: dbStatus as any } })
      )
    }

    // 担当者連動: Business本体を差し替え→配下PJにも追加
    if (data.assigneeIds !== undefined) {
      const newIds = data.assigneeIds as string[]
      // Business本体の担当者を差し替え
      cascadeOps.push(prisma.businessAssignee.deleteMany({ where: { businessId: id } }))
      if (newIds.length > 0) {
        cascadeOps.push(
          prisma.businessAssignee.createMany({
            data: newIds.map((employeeId) => ({ businessId: id, employeeId })),
            skipDuplicates: true,
          })
        )
        // 配下PJにも追加（既存の担当者は残す）
        const projects = await prisma.project.findMany({ where: { businessId: id }, select: { id: true } })
        if (projects.length > 0) {
          const assigneeData = projects.flatMap((p) =>
            newIds.map((employeeId) => ({ projectId: p.id, employeeId }))
          )
          cascadeOps.push(
            prisma.projectAssignee.createMany({ data: assigneeData, skipDuplicates: true })
          )
        }
      }
    }

    // 関連取引先（Partner）連動
    if (data.partnerIds !== undefined) {
      const ids = data.partnerIds as string[]
      cascadeOps.push(prisma.partnerBusiness.deleteMany({ where: { businessId: id } }))
      if (ids.length > 0) {
        cascadeOps.push(
          prisma.partnerBusiness.createMany({
            data: ids.map((partnerId) => ({ businessId: id, partnerId })),
            skipDuplicates: true,
          })
        )
      }
    }

    // 関連顧客（Contact）連動
    if (data.contactIds !== undefined) {
      const ids = data.contactIds as string[]
      cascadeOps.push(prisma.contactBusiness.deleteMany({ where: { businessId: id } }))
      if (ids.length > 0) {
        cascadeOps.push(
          prisma.contactBusiness.createMany({
            data: ids.map((contactId) => ({ businessId: id, contactId })),
            skipDuplicates: true,
          })
        )
      }
    }

    if (cascadeOps.length > 0) {
      await prisma.$transaction(cascadeOps)
    }

    const result = await BusinessRepository.update(id, dbData)

    try {
      await AuditLogRepository.create({
        action: "UPDATE",
        entityType: "Business",
        entityId: id,
        entityName: (result as { name?: string }).name ?? id,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
