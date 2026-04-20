import { prisma } from "@/lib/prisma"
import type { BusinessTaskStatus } from "@/generated/prisma/client"

export class BusinessTaskRepository {
  static async findMany(params?: {
    projectId?: string
    assigneeId?: string
    status?: BusinessTaskStatus
    contactId?: string
    issueId?: string
  }) {
    return prisma.businessTask.findMany({
      where: {
        ...(params?.projectId && { projectId: params.projectId }),
        ...(params?.assigneeId && { assigneeId: params.assigneeId }),
        ...(params?.status && { status: params.status }),
        ...(params?.contactId && { contactId: params.contactId }),
        ...(params?.issueId && { issueId: params.issueId }),
        project: { status: "ACTIVE" },
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
        assignee: { select: { id: true, name: true } },
        assignees: { include: { employee: { select: { id: true, name: true } } } },
        contact: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
        issue: { select: { id: true, title: true, status: true, priority: true } },
        scheduleEvents: { select: { id: true, title: true, startAt: true, endAt: true, allDay: true, googleEventId: true }, orderBy: { startAt: "asc" } },
        checklistItems: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { sortOrder: "asc" },
    })
  }

  static async create(data: any) {
    return prisma.businessTask.create({ data })
  }

  static async update(id: string, data: any) {
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
