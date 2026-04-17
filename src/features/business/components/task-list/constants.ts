/**
 * task-list-view で使用する定数マップ
 */

export const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  "on-hold": "bg-yellow-500",
  completed: "bg-gray-400 dark:bg-gray-500",
}

export const STATUS_CYCLE: Record<string, string> = {
  active: "completed",
  completed: "active",
  "on-hold": "active",
}

export const STATUS_TOOLTIP: Record<string, string> = {
  active: "有効",
  "on-hold": "保留",
  completed: "無効",
}
