import { prisma } from "@/lib/prisma"
import { syncEventToTask, eventUpdateNeedsSync } from "@/server/services/task-calendar-sync.service"

export class ScheduleEventRepository {
  static async findMany(params: {
    startFrom?: string
    startTo?: string
    employeeId?: string
    eventType?: "MEETING" | "HOLIDAY" | "OUTING" | "WORK" | "OTHER"
  }) {
    return prisma.scheduleEvent.findMany({
      where: {
        ...(params.startFrom && { startAt: { gte: new Date(params.startFrom) } }),
        ...(params.startTo && {
          startAt: {
            ...(params.startFrom ? { gte: new Date(params.startFrom) } : {}),
            lte: new Date(params.startTo),
          },
        }),
        ...(params.employeeId && { employeeId: params.employeeId }),
        ...(params.eventType && { eventType: params.eventType }),
      },
      include: {
        employee: { select: { id: true, name: true, color: true } },
      },
      orderBy: { startAt: "asc" },
    })
  }

  static async create(data: {
    title: string
    description?: string
    startAt: Date
    endAt: Date
    allDay?: boolean
    eventType?: "MEETING" | "HOLIDAY" | "OUTING" | "WORK" | "OTHER"
    employeeId: string
    googleEventId?: string
  }) {
    return prisma.scheduleEvent.create({
      data: {
        title: data.title,
        description: data.description ?? "",
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: data.allDay ?? false,
        eventType: data.eventType ?? "MEETING",
        employeeId: data.employeeId,
        googleEventId: data.googleEventId ?? null,
      },
      include: {
        employee: { select: { id: true, name: true, color: true } },
      },
    })
  }

  static async update(
    id: string,
    data: {
      title?: string
      description?: string
      startAt?: Date
      endAt?: Date
      allDay?: boolean
      eventType?: "MEETING" | "HOLIDAY" | "OUTING" | "WORK" | "OTHER"
      employeeId?: string
      googleEventId?: string | null
    }
  ) {
    const updated = await prisma.scheduleEvent.update({
      where: { id },
      data,
      include: {
        employee: { select: { id: true, name: true, color: true } },
      },
    })
    if (eventUpdateNeedsSync(data as Record<string, unknown>)) {
      try {
        await syncEventToTask(id)
      } catch (e) {
        console.error("[task-calendar-sync] event->task sync failed:", e)
      }
    }
    return updated
  }

  static async delete(id: string) {
    return prisma.scheduleEvent.delete({ where: { id } })
  }
}
