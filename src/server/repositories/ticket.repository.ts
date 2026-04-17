import { prisma } from "@/lib/prisma"

export class TicketRepository {
  static async findMany(params: { contactId?: string; partnerId?: string; assigneeId?: string; status?: "OPEN" | "WAITING" | "IN_PROGRESS" | "COMPLETED"; priority?: "HIGH" | "MEDIUM" | "LOW"; isArchived?: boolean }) {
    return prisma.ticket.findMany({
      where: {
        ...(params.contactId && { contactId: params.contactId }),
        ...(params.partnerId && { partnerId: params.partnerId }),
        ...(params.assigneeId && { assigneeId: params.assigneeId }),
        ...(params.status && { status: params.status }),
        ...(params.priority && { priority: params.priority }),
        isArchived: params.isArchived ?? false,
      },
      include: {
        contact: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  static async findById(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        contact: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    })
  }

  static async create(data: {
    title: string; contactId?: string | null; partnerId?: string | null; assigneeId: string
    tool?: "LINE" | "TELEGRAM" | "DISCORD" | "PHONE" | "ZOOM" | "IN_PERSON"
    priority?: "HIGH" | "MEDIUM" | "LOW"; dueDate?: Date | null
    content?: string; memo?: string
  }) {
    return prisma.ticket.create({
      data: { title: data.title, contactId: data.contactId ?? null, partnerId: data.partnerId ?? null, assigneeId: data.assigneeId, tool: data.tool ?? "LINE", priority: data.priority ?? "MEDIUM", dueDate: data.dueDate ?? null, content: data.content ?? "", memo: data.memo ?? "" },
      include: { contact: { select: { id: true, name: true } }, partner: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
    })
  }

  static async update(id: string, data: {
    title?: string; assigneeId?: string
    tool?: "LINE" | "TELEGRAM" | "DISCORD" | "PHONE" | "ZOOM" | "IN_PERSON"
    priority?: "HIGH" | "MEDIUM" | "LOW"; status?: "OPEN" | "WAITING" | "IN_PROGRESS" | "COMPLETED"
    content?: string; memo?: string
    dueDate?: Date | null; isArchived?: boolean
  }) {
    return prisma.ticket.update({
      where: { id }, data,
      include: { contact: { select: { id: true, name: true } }, partner: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
    })
  }

  static async addComment(data: { ticketId: string; content: string; authorId: string }) {
    return prisma.ticketComment.create({
      data,
      include: { author: { select: { id: true, name: true } } },
    })
  }
}
