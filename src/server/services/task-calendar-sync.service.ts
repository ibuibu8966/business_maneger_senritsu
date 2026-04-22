import { prisma } from "@/lib/prisma"
import { updateEvent } from "@/lib/google-calendar"
import { EmployeeRepository } from "@/server/repositories/employee.repository"
import { logger } from "@/lib/logger"

const TASK_SYNC_FIELDS = ["title", "detail", "deadline", "executionTime"] as const
const EVENT_SYNC_FIELDS = ["title", "description", "startAt", "endAt"] as const

export function taskUpdateNeedsSync(data: Record<string, unknown>): boolean {
  return TASK_SYNC_FIELDS.some((f) => f in data)
}

export function eventUpdateNeedsSync(data: Record<string, unknown>): boolean {
  return EVENT_SYNC_FIELDS.some((f) => f in data)
}

function pad2(n: number) {
  return n.toString().padStart(2, "0")
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatLocalTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * タスク更新時に、紐づく最新 ScheduleEvent（DB＋Googleカレンダー）を同期する
 */
export async function syncTaskToLatestEvent(taskId: string): Promise<void> {
  const task = await prisma.businessTask.findUnique({
    where: { id: taskId },
    include: {
      scheduleEvents: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })
  if (!task || task.scheduleEvents.length === 0) return

  const event = task.scheduleEvents[0]

  let newStartAt = event.startAt
  let newEndAt = event.endAt
  if (task.deadline && task.executionTime) {
    const [h, m] = task.executionTime.split(":").map(Number)
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      const start = new Date(task.deadline)
      start.setHours(h, m, 0, 0)
      const durationMs = event.endAt.getTime() - event.startAt.getTime()
      newStartAt = start
      newEndAt = new Date(start.getTime() + Math.max(durationMs, 0))
    }
  }

  await prisma.scheduleEvent.update({
    where: { id: event.id },
    data: {
      title: task.title,
      description: task.detail,
      startAt: newStartAt,
      endAt: newEndAt,
    },
  })

  // Googleカレンダー側も更新
  if (event.googleEventId) {
    try {
      const employee = await EmployeeRepository.findById(event.employeeId)
      if (employee?.googleCalId) {
        await updateEvent(employee.googleCalId, event.googleEventId, {
          title: task.title,
          description: task.detail,
          startAt: newStartAt.toISOString(),
          endAt: newEndAt.toISOString(),
        })
      }
    } catch (e) {
      logger.error("[task-calendar-sync] gcal update failed (task->event):", e)
    }
  }
}

/**
 * DB ScheduleEvent 更新時に、紐づくタスクを同期する
 */
export async function syncEventToTask(eventId: string): Promise<void> {
  const event = await prisma.scheduleEvent.findUnique({
    where: { id: eventId },
  })
  if (!event || !event.taskId) return

  const dateStr = formatLocalDate(event.startAt)
  const execTime = formatLocalTime(event.startAt)

  await prisma.businessTask.update({
    where: { id: event.taskId },
    data: {
      title: event.title,
      detail: event.description,
      deadline: new Date(`${dateStr}T00:00:00.000Z`),
      executionTime: execTime,
    },
  })
}

/**
 * Googleカレンダー側のイベント更新に追随して、DB ScheduleEvent と紐づくタスクを同期する
 * ScheduleController.update() から呼ばれる
 */
export async function syncGoogleEventUpdateToTask(
  googleEventId: string,
  data: {
    title?: string
    description?: string
    startAt?: string
    endAt?: string
  }
): Promise<void> {
  const dbEvents = await prisma.scheduleEvent.findMany({
    where: { googleEventId, taskId: { not: null } },
  })
  if (dbEvents.length === 0) return

  const updateData: {
    title?: string
    description?: string
    startAt?: Date
    endAt?: Date
  } = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.startAt !== undefined) updateData.startAt = new Date(data.startAt)
  if (data.endAt !== undefined) updateData.endAt = new Date(data.endAt)

  for (const dbEvent of dbEvents) {
    await prisma.scheduleEvent.update({
      where: { id: dbEvent.id },
      data: updateData,
    })
    try {
      await syncEventToTask(dbEvent.id)
    } catch (e) {
      logger.error("[task-calendar-sync] event->task sync failed:", e)
    }
  }
}
