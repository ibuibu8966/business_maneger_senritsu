import { prisma } from "@/lib/prisma"
import { ProjectRepository } from "@/server/repositories/project.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"

const STATUS_TO_DB: Record<string, string> = { active: "ACTIVE", "on-hold": "ON_HOLD", completed: "COMPLETED" }
const PRIORITY_TO_DB: Record<string, string> = { highest: "HIGHEST", high: "HIGH", medium: "MEDIUM", low: "LOW" }

export class UpdateProject {
  static async execute(id: string, data: Record<string, unknown>) {
    const dbData: Record<string, unknown> = {}
    if (data.name !== undefined) dbData.name = data.name
    if (data.parentId !== undefined) dbData.parentId = data.parentId || null
    if (data.purpose !== undefined) dbData.purpose = data.purpose
    if (data.deadline !== undefined) dbData.deadline = data.deadline ? new Date(data.deadline as string) : null
    if (data.revenue !== undefined) dbData.revenue = data.revenue
    if (data.expense !== undefined) dbData.expense = data.expense
    if (data.status !== undefined) dbData.status = STATUS_TO_DB[data.status as string]
    if (data.priority !== undefined) dbData.priority = PRIORITY_TO_DB[data.priority as string]
    if (data.contractMemo !== undefined) dbData.contractMemo = data.contractMemo
    if (data.attachments !== undefined) dbData.attachments = data.attachments
    if (data.accountNames !== undefined) dbData.accountNames = data.accountNames
    if (data.partnerNames !== undefined) dbData.partnerNames = data.partnerNames
    if (data.sortOrder !== undefined) dbData.sortOrder = data.sortOrder

    // カスケード処理
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cascadeOps: any[] = []

    // ステータス連動: 配下サブPJも同じステータスに
    if (data.status !== undefined) {
      const dbStatus = STATUS_TO_DB[data.status as string]
      const descendantIds = await ProjectRepository.findDescendantIds(id)
      if (descendantIds.length > 0) {
        cascadeOps.push(
          prisma.project.updateMany({ where: { id: { in: descendantIds } }, data: { status: dbStatus as import("@/generated/prisma/client").ProjectStatus } })
        )
      }
    }

    // 担当者連動: Project本体を差し替え→配下サブPJにも追加
    if (data.assigneeIds !== undefined) {
      const newIds = data.assigneeIds as string[]
      cascadeOps.push(prisma.projectAssignee.deleteMany({ where: { projectId: id } }))
      if (newIds.length > 0) {
        cascadeOps.push(
          prisma.projectAssignee.createMany({
            data: newIds.map((employeeId) => ({ projectId: id, employeeId })),
            skipDuplicates: true,
          })
        )
        const descendantIds = await ProjectRepository.findDescendantIds(id)
        if (descendantIds.length > 0) {
          const assigneeData = descendantIds.flatMap((pid) =>
            newIds.map((employeeId) => ({ projectId: pid, employeeId }))
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
      cascadeOps.push(prisma.partnerProject.deleteMany({ where: { projectId: id } }))
      if (ids.length > 0) {
        cascadeOps.push(
          prisma.partnerProject.createMany({
            data: ids.map((partnerId) => ({ projectId: id, partnerId })),
            skipDuplicates: true,
          })
        )
      }
    }

    // 関連顧客（Contact）連動
    if (data.contactIds !== undefined) {
      const ids = data.contactIds as string[]
      cascadeOps.push(prisma.contactProject.deleteMany({ where: { projectId: id } }))
      if (ids.length > 0) {
        cascadeOps.push(
          prisma.contactProject.createMany({
            data: ids.map((contactId) => ({ projectId: id, contactId })),
            skipDuplicates: true,
          })
        )
      }
    }

    if (cascadeOps.length > 0) {
      await prisma.$transaction(cascadeOps)
    }

    const result = await ProjectRepository.update(id, dbData)

    try {
      await AuditLogRepository.create({
        action: "UPDATE",
        entityType: "Project",
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
