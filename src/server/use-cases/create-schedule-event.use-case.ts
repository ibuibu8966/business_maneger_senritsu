import { ScheduleEventRepository } from "@/server/repositories/schedule-event.repository"
import type { ScheduleEventDTO } from "@/types/dto"

export class CreateScheduleEvent {
  static async execute(data: {
    title: string
    description?: string
    startAt: string
    endAt: string
    allDay?: boolean
    eventType?: "meeting" | "holiday" | "outing" | "work" | "other"
    employeeId: string
  }): Promise<ScheduleEventDTO> {
    const row = await ScheduleEventRepository.create({
      title: data.title,
      description: data.description,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      allDay: data.allDay,
      eventType: data.eventType?.toUpperCase() as "MEETING" | "HOLIDAY" | "OUTING" | "WORK" | "OTHER" | undefined,
      employeeId: data.employeeId,
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
