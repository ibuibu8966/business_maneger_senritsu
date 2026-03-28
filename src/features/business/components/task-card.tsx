"use client"

import { Badge } from "@/components/ui/badge"
import { Repeat } from "lucide-react"
import { TASK_STATUS_CONFIG, type TaskItem } from "./mock-data"

export function TaskCard({
  task,
  compact = false,
  selected = false,
  onClick,
}: {
  task: TaskItem
  compact?: boolean
  selected?: boolean
  onClick?: () => void
}) {
  const st = TASK_STATUS_CONFIG[task.status]

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      } ${task.status === "done" ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {task.recurring && <Repeat className="w-3 h-3 text-blue-500 shrink-0" />}
            <p className={`font-medium ${compact ? "text-xs" : "text-sm"} truncate`}>
              {task.title}
            </p>
          </div>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {task.projectName}
            </p>
          )}
        </div>
        <Badge variant={st.variant} className="text-[10px] h-5 shrink-0">
          {st.label}
        </Badge>
      </div>
      <div className={`flex items-center gap-3 ${compact ? "mt-1" : "mt-2"} text-xs text-muted-foreground`}>
        {task.assigneeName && <span>{task.assigneeName}</span>}
        {task.deadline && (
          <span className={new Date(task.deadline) < new Date() && task.status !== "done" ? "text-red-600 font-medium" : ""}>
            〆 {task.deadline}
          </span>
        )}
      </div>
    </div>
  )
}
