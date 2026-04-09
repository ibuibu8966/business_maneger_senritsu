import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-guard"
import { EmployeeRepository } from "@/repositories/employee.repository"
import {
  listEventsMulti,
  createEvent,
  updateEvent,
  deleteEvent,
  type GCalEvent,
} from "@/lib/google-calendar"
import type { ScheduleEventDTO } from "@/types/dto"

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean().optional(),
  eventType: z.enum(["meeting", "holiday", "outing", "work", "other"]).optional(),
  employeeId: z.string(),
})

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  allDay: z.boolean().optional(),
  eventType: z.enum(["meeting", "holiday", "outing", "work", "other"]).optional(),
  employeeId: z.string().optional(),
})

// イベントIDはフロントに「calendarId::googleEventId」の形式で渡す
function encodeEventId(calendarId: string, googleEventId: string): string {
  return `${calendarId}::${googleEventId}`
}

function decodeEventId(compositeId: string): { calendarId: string; googleEventId: string } {
  const idx = compositeId.indexOf("::")
  if (idx === -1) throw new Error("Invalid event ID format")
  return {
    calendarId: compositeId.slice(0, idx),
    googleEventId: compositeId.slice(idx + 2),
  }
}

// GCalEvent → ScheduleEventDTO 変換
function toDTO(
  event: GCalEvent,
  employee: { id: string; name: string; color: string }
): ScheduleEventDTO {
  return {
    id: encodeEventId(event.calendarId, event.id),
    title: event.title,
    description: event.description,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    eventType: event.eventType,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeColor: employee.color,
    googleEventId: event.id,
    createdAt: "",
  }
}

export class ScheduleController {
  static async list(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const startFrom = url.searchParams.get("startFrom") ?? new Date().toISOString()
      const startTo =
        url.searchParams.get("startTo") ??
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      const employeeIdFilter = url.searchParams.get("employeeId") ?? undefined

      // googleCalIdを持つアクティブ従業員を取得
      const employees = await EmployeeRepository.findMany({ isActive: true })
      const withCal = employees.filter((e) => e.googleCalId)

      if (withCal.length === 0) {
        return NextResponse.json([])
      }

      // 従業員IDでフィルタ
      const targets = employeeIdFilter
        ? withCal.filter((e) => e.id === employeeIdFilter)
        : withCal

      // calendarId → employee のマッピング
      const calMap = new Map(
        targets.map((e) => [e.googleCalId!, { id: e.id, name: e.name, color: e.color }])
      )

      // Google Calendar APIから並行取得
      const calendarIds = targets.map((e) => e.googleCalId!)
      const gcalEvents = await listEventsMulti(calendarIds, startFrom, startTo)

      // DTO変換
      const dtos: ScheduleEventDTO[] = gcalEvents.map((ev) => {
        const emp = calMap.get(ev.calendarId)!
        return toDTO(ev, emp)
      })

      return NextResponse.json(dtos)
    } catch (e) {
      logger.error("Google Calendar list error:", {
        message: (e as Error)?.message,
        stack: (e as Error)?.stack,
        error: e,
      })
      // OAuthトークン失効等の場合は空配列を返す（フロントがクラッシュしないように）
      return NextResponse.json([])
    }
  }

  static async create(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createSchema.parse(body)

      // 従業員のgoogleCalIdを取得
      const employee = await EmployeeRepository.findById(data.employeeId)
      if (!employee || !employee.googleCalId) {
        return NextResponse.json(
          { error: "この従業員はGoogleカレンダーが未連携です" },
          { status: 400 }
        )
      }

      const gcalEvent = await createEvent(employee.googleCalId, {
        title: data.title,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: data.allDay,
        eventType: data.eventType,
      })

      const dto = toDTO(gcalEvent, {
        id: employee.id,
        name: employee.name,
        color: employee.color,
      })

      return NextResponse.json(dto, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      logger.error("Google Calendar create error:", e)
      return NextResponse.json({ error: "予定の登録に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, compositeId: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateSchema.parse(body)
      let decoded
      try {
        decoded = decodeEventId(compositeId)
      } catch {
        return NextResponse.json({ error: "Invalid event ID format" }, { status: 400 })
      }
      const { calendarId, googleEventId } = decoded

      // employeeId変更（別の人のカレンダーに移動）の場合
      if (data.employeeId) {
        const newEmployee = await EmployeeRepository.findById(data.employeeId)
        if (!newEmployee || !newEmployee.googleCalId) {
          return NextResponse.json(
            { error: "移動先の従業員はGoogleカレンダーが未連携です" },
            { status: 400 }
          )
        }

        if (newEmployee.googleCalId !== calendarId) {
          // 別カレンダーへの移動: 旧を削除→新規作成
          await deleteEvent(calendarId, googleEventId)
          const newEvent = await createEvent(newEmployee.googleCalId, {
            title: data.title ?? "(無題)",
            description: data.description,
            startAt: data.startAt ?? new Date().toISOString(),
            endAt: data.endAt ?? new Date().toISOString(),
            allDay: data.allDay,
            eventType: data.eventType,
          })
          const dto = toDTO(newEvent, {
            id: newEmployee.id,
            name: newEmployee.name,
            color: newEmployee.color,
          })
          return NextResponse.json(dto)
        }
      }

      // 同一カレンダー内の更新
      const gcalEvent = await updateEvent(calendarId, googleEventId, {
        title: data.title,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: data.allDay,
        eventType: data.eventType,
      })

      // 現在の従業員情報を取得
      const employees = await EmployeeRepository.findMany({ isActive: true })
      const emp = employees.find((e) => e.googleCalId === calendarId)
      const dto = toDTO(gcalEvent, {
        id: emp?.id ?? "",
        name: emp?.name ?? "",
        color: emp?.color ?? "#888888",
      })

      return NextResponse.json(dto)
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      logger.error("Google Calendar update error:", e)
      return NextResponse.json({ error: "予定の更新に失敗しました" }, { status: 500 })
    }
  }

  static async delete(_req: NextRequest, compositeId: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      let decoded
      try {
        decoded = decodeEventId(compositeId)
      } catch {
        return NextResponse.json({ error: "Invalid event ID format" }, { status: 400 })
      }
      const { calendarId, googleEventId } = decoded
      await deleteEvent(calendarId, googleEventId)
      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error("Google Calendar delete error:", e)
      return NextResponse.json({ error: "予定の削除に失敗しました" }, { status: 500 })
    }
  }
}
