import { ScheduleEventRepository } from "@/server/repositories/schedule-event.repository"
import type { ScheduleEventDTO } from "@/types/dto"

export class UpdateScheduleEvent {
  static async execute(
    id: string,
    data: {
      title?: string
      description?: string
      startAt?: string
      endAt?: string
      allDay?: boolean
      eventType?: "meeting" | "holiday" | "outing" | "work" | "other"
      employeeId?: string
    }
  ): Promise<ScheduleEventDTO> {
    const row = await ScheduleEventRepository.update(id, {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.startAt && { startAt: new Date(data.startAt) }),
      ...(data.endAt && { endAt: new Date(data.endAt) }),
      ...(data.allDay !== undefined && { allDay: data.allDay }),
      ...(data.eventType && {
        eventType: data.eventType.toUpperCase() as "MEETING" | "HOLIDAY" | "OUTING" | "WORK" | "OTHER",
      }),
      ...(data.employeeId && { employeeId: data.employeeId }),
    })

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      allDay: row.allDay,
      eventType: row.eventType.toLowerCase() as ScheduleEventDTO["eventType"],
      employeeId: row.employee.id,
      employeeName: row.employee.name,
      employeeColor: row.employee.color,
      googleEventId: row.googleEventId,
      createdAt: row.createdAt.toISOString(),
    }
  }
}
