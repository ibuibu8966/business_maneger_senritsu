import { prisma } from "@/lib/prisma"

const issueInclude = {
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  progressNotes: { orderBy: { date: "desc" as const } },
}

export class BusinessIssueRepository {
  static async findMany(params?: {
    projectId?: string
    assigneeId?: string
    status?: string
    priority?: string
  }) {
    return prisma.businessIssue.findMany({
      where: {
        ...(params?.projectId && { projectId: params.projectId }),
        ...(params?.assigneeId && { assigneeId: params.assigneeId }),
        ...(params?.status && { status: params.status as any }),
        ...(params?.priority && { priority: params.priority as any }),
        project: { status: "ACTIVE" },
      },
      include: issueInclude,
      orderBy: { createdAt: "desc" },
    })
  }

  static async create(data: any) {
    return prisma.businessIssue.create({
      data,
      include: issueInclude,
    })
  }

  static async update(id: string, data: any) {
    return prisma.businessIssue.update({
      where: { id },
      data,
      include: issueInclude,
    })
  }

  static async delete(id: string) {
    return prisma.businessIssue.delete({ where: { id } })
  }

  static async addNote(
    issueId: string,
    data: { date: Date; content: string; author: string }
  ) {
    return prisma.businessIssueNote.create({
      data: { issueId, ...data },
    })
  }
}
