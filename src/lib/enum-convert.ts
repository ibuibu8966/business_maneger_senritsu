/**
 * enum 変換ヘルパー
 *
 * 規約：
 * - DB（Prisma enum）は大文字（例: SALON_MEMBER, ACTIVE, TODO）
 * - UI / DTO / API 入出力は小文字（例: salon_member, active, todo）
 * - 変換はコントローラー / ユースケース層で実施
 *
 * TaskStatus のみ特殊：IN_PROGRESS ↔ in-progress（ハイフン）
 */

export type ContactTypeApi = "salon_member" | "partner_contact"
export type PaymentMethodApi = "memberpay" | "robotpay" | "paypal" | "univpay" | "other"
export type SubscriptionStatusApi = "active" | "cancelled"
export type TicketStatusApi = "open" | "waiting" | "in_progress" | "completed"
export type TaskStatusApi = "todo" | "in-progress" | "waiting" | "done"

/** UI/API 小文字 → DB 大文字（enum） */
export function toDbEnum<T extends string>(apiValue: T): Uppercase<T> {
  return apiValue.toUpperCase() as Uppercase<T>
}

/** DB 大文字 → UI/API 小文字 */
export function toApiEnum<T extends string>(dbValue: T): Lowercase<T> {
  return dbValue.toLowerCase() as Lowercase<T>
}

/** TaskStatus 専用（ハイフン ↔ アンダースコア変換あり） */
export const TASK_STATUS_API_TO_DB: Record<TaskStatusApi, string> = {
  todo: "TODO",
  "in-progress": "IN_PROGRESS",
  waiting: "WAITING",
  done: "DONE",
} as const

export const TASK_STATUS_DB_TO_API: Record<string, TaskStatusApi> = {
  TODO: "todo",
  IN_PROGRESS: "in-progress",
  WAITING: "waiting",
  DONE: "done",
} as const
