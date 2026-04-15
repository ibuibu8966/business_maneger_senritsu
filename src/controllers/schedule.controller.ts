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
import { prisma } from "@/lib/prisma"
import type { ScheduleEventDTO } from "@/types/dto"

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean().optional(),
  eventType: z.enum(["meeting", "holiday", "outing", "work", "other"]).optional(),
  employeeId: z.string(),
  participantIds: z.array(z.string()).optional(), // 追加参加者
  taskId: z.string().nullable().optional(), // 紐づくタスク
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

const updateParticipantsSchema = z.object({
  participantIds: z.array(z.string()),
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
  employee: { id: string; name: string; color: string },
  extra?: { groupId?: string; participants?: { id: string; name: string; color: string }[]; taskId?: string | null; taskTitle?: string | null }
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
    groupId: extra?.groupId,
    participants: extra?.participants,
    taskId: extra?.taskId ?? null,
    taskTitle: extra?.taskTitle ?? null,
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
      // 全従業員マップ（参加者表示用）
      const allEmpMap = new Map(
        withCal.map((e) => [e.id, { id: e.id, name: e.name, color: e.color }])
      )

      // Google Calendar APIから並行取得
      const calendarIds = targets.map((e) => e.googleCalId!)
      const gcalEvents = await listEventsMulti(calendarIds, startFrom, startTo)

      // 参加者情報を取得（compositeEventIdで一括検索）
      const compositeIds = gcalEvents.map((ev) => encodeEventId(ev.calendarId, ev.id))
      const participantRecords = compositeIds.length > 0
        ? await prisma.eventParticipant.findMany({
            where: { compositeEventId: { in: compositeIds } },
          })
        : []

      // compositeEventId → groupId マッピング
      const compositeToGroup = new Map<string, string>()
      for (const p of participantRecords) {
        compositeToGroup.set(p.compositeEventId, p.groupId)
      }

      // groupId → 参加者リスト マッピング
      const groupIds = [...new Set(participantRecords.map((p) => p.groupId))]
      const allGroupParticipants = groupIds.length > 0
        ? await prisma.eventParticipant.findMany({
            where: { groupId: { in: groupIds } },
          })
        : []
      const groupToParticipants = new Map<string, { id: string; name: string; color: string }[]>()
      for (const p of allGroupParticipants) {
        const emp = allEmpMap.get(p.employeeId)
        if (!emp) continue
        const list = groupToParticipants.get(p.groupId) ?? []
        if (!list.some((x) => x.id === emp.id)) {
          list.push(emp)
        }
        groupToParticipants.set(p.groupId, list)
      }

      // タスク紐づけ情報を取得（googleEventIdでマッチ）
      const googleEventIds = gcalEvents.map((ev) => ev.id)
      const taskLinkedEvents = googleEventIds.length > 0
        ? await prisma.scheduleEvent.findMany({
            where: { googleEventId: { in: googleEventIds }, taskId: { not: null } },
            select: { googleEventId: true, taskId: true, task: { select: { title: true } } },
          })
        : []
      const taskMap = new Map(
        taskLinkedEvents.map((e) => [e.googleEventId!, { taskId: e.taskId, taskTitle: e.task?.title ?? null }])
      )

      // DTO変換（参加者情報+タスク情報付き）
      const dtos: ScheduleEventDTO[] = gcalEvents.map((ev) => {
        const emp = calMap.get(ev.calendarId)!
        const compositeId = encodeEventId(ev.calendarId, ev.id)
        const groupId = compositeToGroup.get(compositeId)
        const participants = groupId ? groupToParticipants.get(groupId) : undefined
        const taskInfo = taskMap.get(ev.id)
        return toDTO(ev, emp, { groupId, participants, taskId: taskInfo?.taskId, taskTitle: taskInfo?.taskTitle })
      })

      return NextResponse.json(dtos)
    } catch (e) {
      logger.error("Google Calendar list error:", {
        message: (e as Error)?.message,
        stack: (e as Error)?.stack,
        error: e,
      })
      return NextResponse.json([])
    }
  }

  static async create(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createSchema.parse(body)

      // メイン従業員のgoogleCalIdを取得
      const employee = await EmployeeRepository.findById(data.employeeId)
      if (!employee || !employee.googleCalId) {
        return NextResponse.json(
          { error: "この従業員はGoogleカレンダーが未連携です" },
          { status: 400 }
        )
      }

      const eventPayload = {
        title: data.title,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: data.allDay,
        eventType: data.eventType,
      }

      // メイン従業員のカレンダーにイベント作成
      const gcalEvent = await createEvent(employee.googleCalId, eventPayload)
      const mainCompositeId = encodeEventId(gcalEvent.calendarId, gcalEvent.id)

      // 追加参加者がいる場合
      const allParticipantIds = [data.employeeId, ...(data.participantIds ?? [])].filter(
        (id, i, arr) => arr.indexOf(id) === i // 重複除去
      )

      let groupId: string | undefined
      let participants: { id: string; name: string; color: string }[] | undefined

      if (allParticipantIds.length > 1) {
        // グループID生成
        const crypto = await import("crypto")
        groupId = crypto.randomUUID()

        // 全参加者のカレンダーにイベント作成 & EventParticipant レコード作成
        const allEmployees = await EmployeeRepository.findMany({ isActive: true })
        const participantData: { compositeEventId: string; employeeId: string }[] = [
          { compositeEventId: mainCompositeId, employeeId: data.employeeId },
        ]

        for (const pid of allParticipantIds) {
          if (pid === data.employeeId) continue // メイン従業員は既に作成済み
          const emp = allEmployees.find((e) => e.id === pid)
          if (!emp || !emp.googleCalId) continue

          const ev = await createEvent(emp.googleCalId, eventPayload)
          participantData.push({
            compositeEventId: encodeEventId(ev.calendarId, ev.id),
            employeeId: pid,
          })
        }

        // EventParticipant レコード一括作成
        const gid = groupId!
        await prisma.eventParticipant.createMany({
          data: participantData.map((p) => ({
            groupId: gid,
            employeeId: p.employeeId,
            compositeEventId: p.compositeEventId,
          })),
        })

        participants = allParticipantIds
          .map((id) => {
            const emp = allEmployees.find((e) => e.id === id)
            return emp ? { id: emp.id, name: emp.name, color: emp.color } : null
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
      }

      // タスク紐づけがある場合、DBのschedule_eventsにレコード保存
      let taskTitle: string | null = null
      if (data.taskId) {
        const task = await prisma.businessTask.findUnique({ where: { id: data.taskId }, select: { title: true } })
        taskTitle = task?.title ?? null
        await prisma.scheduleEvent.create({
          data: {
            title: data.title,
            description: data.description ?? "",
            startAt: new Date(data.startAt),
            endAt: new Date(data.endAt),
            allDay: data.allDay ?? false,
            eventType: (data.eventType ?? "work").toUpperCase() as any,
            employeeId: data.employeeId,
            googleEventId: gcalEvent.id,
            taskId: data.taskId,
          },
        })
      }

      const dto = toDTO(
        gcalEvent,
        { id: employee.id, name: employee.name, color: employee.color },
        { groupId, participants, taskId: data.taskId ?? null, taskTitle }
      )

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

      // グループに属するイベントも同時更新
      const participantRecord = await prisma.eventParticipant.findFirst({
        where: { compositeEventId: compositeId },
      })
      if (participantRecord) {
        const siblings = await prisma.eventParticipant.findMany({
          where: { groupId: participantRecord.groupId, compositeEventId: { not: compositeId } },
        })
        for (const sib of siblings) {
          try {
            const sibDecoded = decodeEventId(sib.compositeEventId)
            await updateEvent(sibDecoded.calendarId, sibDecoded.googleEventId, {
              title: data.title,
              description: data.description,
              startAt: data.startAt,
              endAt: data.endAt,
              allDay: data.allDay,
              eventType: data.eventType,
            })
          } catch (sibErr) {
            logger.error("Failed to update sibling event:", sibErr)
          }
        }
      }

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

      // グループに属するイベントも全て削除
      const participantRecord = await prisma.eventParticipant.findFirst({
        where: { compositeEventId: compositeId },
      })
      if (participantRecord) {
        const siblings = await prisma.eventParticipant.findMany({
          where: { groupId: participantRecord.groupId },
        })
        for (const sib of siblings) {
          if (sib.compositeEventId === compositeId) continue
          try {
            const sibDecoded = decodeEventId(sib.compositeEventId)
            await deleteEvent(sibDecoded.calendarId, sibDecoded.googleEventId)
          } catch (sibErr) {
            logger.error("Failed to delete sibling event:", sibErr)
          }
        }
        await prisma.eventParticipant.deleteMany({
          where: { groupId: participantRecord.groupId },
        })
      }

      await deleteEvent(calendarId, googleEventId)
      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error("Google Calendar delete error:", e)
      return NextResponse.json({ error: "予定の削除に失敗しました" }, { status: 500 })
    }
  }

  // 参加者の追加・削除（既存イベントに後から人を追加）
  static async updateParticipants(req: NextRequest, compositeId: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateParticipantsSchema.parse(body)

      let decoded
      try {
        decoded = decodeEventId(compositeId)
      } catch {
        return NextResponse.json({ error: "Invalid event ID format" }, { status: 400 })
      }
      const { calendarId, googleEventId } = decoded

      const allEmployees = await EmployeeRepository.findMany({ isActive: true })
      const currentEmp = allEmployees.find((e) => e.googleCalId === calendarId)
      if (!currentEmp) {
        return NextResponse.json({ error: "従業員が見つかりません" }, { status: 404 })
      }

      // 既存のグループを取得 or 新規作成
      let participantRecord = await prisma.eventParticipant.findFirst({
        where: { compositeEventId: compositeId },
      })

      let groupId: string
      if (participantRecord) {
        groupId = participantRecord.groupId
      } else {
        const crypto = await import("crypto")
        groupId = crypto.randomUUID()
        // 現在のイベント主を参加者として登録
        await prisma.eventParticipant.create({
          data: { groupId, employeeId: currentEmp.id, compositeEventId: compositeId },
        })
      }

      // 既存の参加者一覧
      const existingParticipants = await prisma.eventParticipant.findMany({
        where: { groupId },
      })
      const existingEmpIds = existingParticipants.map((p) => p.employeeId)

      // 元イベントの情報を取得（新規参加者のカレンダーに同じイベントを作るため）
      const newParticipantIds = data.participantIds.filter((id) => !existingEmpIds.includes(id))
      const removedParticipantIds = existingEmpIds.filter((id) => !data.participantIds.includes(id))

      // 追加する参加者のカレンダーにイベント作成
      if (newParticipantIds.length > 0) {
        // 元イベントの情報を取得するために一覧から探す
        const events = await listEventsMulti([calendarId], new Date(0).toISOString(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString())
        const sourceEvent = events.find((e) => e.id === googleEventId)

        for (const pid of newParticipantIds) {
          const emp = allEmployees.find((e) => e.id === pid)
          if (!emp || !emp.googleCalId) continue

          const ev = await createEvent(emp.googleCalId, {
            title: sourceEvent?.title ?? "(無題)",
            description: sourceEvent?.description,
            startAt: sourceEvent?.startAt ?? new Date().toISOString(),
            endAt: sourceEvent?.endAt ?? new Date().toISOString(),
            allDay: sourceEvent?.allDay,
            eventType: sourceEvent?.eventType,
          })

          await prisma.eventParticipant.create({
            data: {
              groupId,
              employeeId: pid,
              compositeEventId: encodeEventId(ev.calendarId, ev.id),
            },
          })
        }
      }

      // 削除する参加者のカレンダーからイベント削除
      for (const pid of removedParticipantIds) {
        const record = existingParticipants.find((p) => p.employeeId === pid)
        if (!record) continue
        try {
          const sibDecoded = decodeEventId(record.compositeEventId)
          await deleteEvent(sibDecoded.calendarId, sibDecoded.googleEventId)
        } catch (sibErr) {
          logger.error("Failed to delete participant event:", sibErr)
        }
        await prisma.eventParticipant.delete({ where: { id: record.id } })
      }

      // 更新後の参加者一覧を返す
      const updatedParticipants = await prisma.eventParticipant.findMany({
        where: { groupId },
      })
      const participants = updatedParticipants
        .map((p) => {
          const emp = allEmployees.find((e) => e.id === p.employeeId)
          return emp ? { id: emp.id, name: emp.name, color: emp.color } : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      return NextResponse.json({ groupId, participants })
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      logger.error("Update participants error:", e)
      return NextResponse.json({ error: "参加者の更新に失敗しました" }, { status: 500 })
    }
  }
}
