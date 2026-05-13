import { prisma } from "@/lib/prisma"
import type { BusinessTaskStatus } from "@/generated/prisma/client"
import { syncTaskToLatestEventFromTask, taskUpdateNeedsSync } from "@/server/services/task-calendar-sync.service"

export class BusinessTaskRepository {
  static async findMany(params?: {
    projectId?: string
    businessId?: string
    assigneeId?: string
    status?: BusinessTaskStatus
    contactId?: string
    issueId?: string
  }) {
    return prisma.businessTask.findMany({
      where: {
        ...(params?.projectId && { projectId: params.projectId }),
        ...(params?.businessId && { businessId: params.businessId }),
        ...(params?.status && { status: params.status }),
        ...(params?.contactId && { contactId: params.contactId }),
        ...(params?.issueId && { issueId: params.issueId }),
        AND: [
          // 複数担当者対応：assigneeId 単体 or 中間テーブル taskAssignees のどちらかにヒットすればOK
          ...(params?.assigneeId ? [{
            OR: [
              { assigneeId: params.assigneeId },
              { assignees: { some: { employeeId: params.assigneeId } } },
            ],
          }] : []),
          {
            // プロジェクト配下タスクはプロジェクトがACTIVE、事業直下タスクは事業がACTIVEであること
            OR: [
              { project: { status: "ACTIVE" } },
              { business: { status: "ACTIVE" } },
            ],
          },
        ],
      },
      include: {
        project: {
          select: {
            id: true, name: true, purpose: true, deadline: true,
            revenue: true, expense: true, status: true, priority: true,
            assignees: { include: { employee: { select: { id: true, name: true } } } },
            contractMemo: true, accountNames: true, partnerNames: true,
            businessId: true,
            business: {
              select: {
                id: true, name: true, purpose: true, status: true,
                priority: true, revenue: true, expense: true,
              },
            },
          },
        },
        business: {
          select: {
            id: true, name: true, purpose: true, status: true,
            priority: true, revenue: true, expense: true,
          },
        },
        assignee: { select: { id: true, name: true } },
        assignees: { include: { employee: { select: { id: true, name: true } } } },
        contact: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
        issue: { select: { id: true, title: true, status: true, priority: true } },
        scheduleEvents: { select: { id: true, title: true, startAt: true, endAt: true, allDay: true, googleEventId: true }, orderBy: { startAt: "asc" } },
        checklistItems: { orderBy: { sortOrder: "asc" } },
        userSortOrders: { select: { employeeId: true, sortOrder: true } },
        parentTask: { select: { recurringPattern: true } },
      },
      orderBy: { sortOrder: "asc" },
    })
  }

  static async create(data: any) {
    return prisma.businessTask.create({ data })
  }

  static async update(id: string, data: any) {
    const needsSync = taskUpdateNeedsSync(data)
    if (needsSync) {
      // 同期に必要な scheduleEvents + employee.googleCalId を update と同時に取得（N+1回避）
      const updated = await prisma.businessTask.update({
        where: { id },
        data,
        include: {
          scheduleEvents: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              employee: { select: { googleCalId: true } },
            },
          },
        },
      })
      try {
        await syncTaskToLatestEventFromTask(updated)
      } catch (e) {
        console.error("[task-calendar-sync] task->event sync failed:", e)
      }
      return updated
    }
    return prisma.businessTask.update({ where: { id }, data })
  }

  static async delete(id: string) {
    return prisma.businessTask.delete({ where: { id } })
  }

  static async findRecurringTasks() {
    return prisma.businessTask.findMany({
      where: {
        recurring: true,
        recurringPattern: { not: null },
      },
      include: {
        project: {
          select: {
            id: true, name: true, businessId: true,
          },
        },
        assignee: { select: { id: true, name: true } },
        assignees: { include: { employee: { select: { id: true, name: true } } } },
      },
    })
  }

  static async updateLastGenerated(id: string, date: Date) {
    return prisma.businessTask.update({
      where: { id },
      data: { lastGeneratedAt: date },
    })
  }
}
