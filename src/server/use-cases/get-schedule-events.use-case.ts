import { ScheduleEventRepository } from "@/server/repositories/schedule-event.repository"
import type { ScheduleEventDTO } from "@/types/dto"

export class GetScheduleEvents {
  static async execute(params: {
    startFrom?: string
    startTo?: string
    employeeId?: string
    eventType?: "MEETING" | "HOLIDAY" | "OUTING" | "WORK" | "OTHER"
  }): Promise<ScheduleEventDTO[]> {
    const rows = await ScheduleEventRepository.findMany(params)

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      allDay: r.allDay,
      eventType: r.eventType.toLowerCase() as ScheduleEventDTO["eventType"],
      employeeId: r.employee.id,
      employeeName: r.employee.name,
      employeeColor: r.employee.color,
      googleEventId: r.googleEventId,
      createdAt: r.createdAt.toISOString(),
    }))
  }
}
