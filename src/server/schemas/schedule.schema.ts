/**
 * Schedule系APIのZodバリデーションスキーマ
 * Controller から分離して責務を明確化
 */
import { z } from "zod"

export const createScheduleEventSchema = z.object({
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

export const updateScheduleEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  allDay: z.boolean().optional(),
  eventType: z.enum(["meeting", "holiday", "outing", "work", "other"]).optional(),
  employeeId: z.string().optional(),
})

export const updateScheduleParticipantsSchema = z.object({
  participantIds: z.array(z.string()),
})
