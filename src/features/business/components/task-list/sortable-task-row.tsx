"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Check, Star, Repeat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { TASK_STATUS_CONFIG, PRIORITY_CONFIG, TOOL_CONFIG, type TaskItem } from "../mock-data"

/**
 * ソート可能なタスク行
 */
export function SortableTaskRow({
  task,
  index,
  onClickTask,
  onToggleTodayFlag,
}: {
  task: TaskItem
  index: number
  onClickTask: (t: TaskItem) => void
  onToggleTodayFlag: (t: TaskItem) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const st = TASK_STATUS_CONFIG[task.status]

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClickTask(task)}
      className={`flex items-center gap-2 p-2.5 rounded-md border text-xs bg-background hover:bg-muted/50 cursor-grab active:cursor-grabbing touch-none ${
        task.status === "done" ? "opacity-50" : ""
      } ${task.todayFlag ? "ring-1 ring-yellow-400/60 dark:ring-yellow-500/60 bg-yellow-50/40 dark:bg-yellow-900/20" : ""}`}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onToggleTodayFlag(task)
        }}
        className="shrink-0 p-0.5 rounded hover:bg-muted"
        title={task.todayFlag ? "今日やる（解除）" : "今日やるに設定"}
      >
        <Star
          className={`w-4 h-4 ${
            task.todayFlag ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"
          }`}
        />
      </button>
      <span className="text-muted-foreground w-5 text-center shrink-0">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {task.recurring && <Repeat className="w-3 h-3 text-blue-500 shrink-0" />}
          {task.seqNumber && <span className="text-[10px] text-muted-foreground font-mono shrink-0">#{task.seqNumber}</span>}
          <span className="font-medium truncate">{task.title}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
          {task.projectName && <span className="text-[10px]">{task.businessName} / {task.projectName}</span>}
          {task.issueTitle && (
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
              課題: {task.issueTitle}
            </span>
          )}
          {task.contactName && (
            <span className="text-[10px]">
              {task.tool && TOOL_CONFIG[task.tool] ? TOOL_CONFIG[task.tool].emoji + " " : ""}
              {task.contactName}
            </span>
          )}
          {task.createdAt && <span>{task.createdAt.split("T")[0]}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {task.checklistItems && task.checklistItems.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            <Check className="w-3 h-3 inline" />{task.checklistItems.filter((c) => c.checked).length}/{task.checklistItems.length}
          </span>
        )}
        {task.priority && task.priority !== "medium" && (
          <span className={`text-[10px] font-medium ${PRIORITY_CONFIG[task.priority].className}`}>
            {PRIORITY_CONFIG[task.priority].label}
          </span>
        )}
        <Badge variant="outline" className={`text-[10px] h-4 px-1 font-semibold ${st.className}`}>
          {st.label}
        </Badge>
        {((task.assigneeNames && task.assigneeNames.length > 0) || task.assigneeName) && (
          <span className="text-muted-foreground text-[10px]">
            {(task.assigneeNames && task.assigneeNames.length > 0) ? task.assigneeNames.join("、") : task.assigneeName}
          </span>
        )}
        {task.executionTime && (
          <span className="text-[10px] text-purple-600 font-medium">
            🕐{task.executionTime}
          </span>
        )}
        {task.deadline && (
          <span className={`text-[10px] ${
            new Date(task.deadline) < new Date() && task.status !== "done" ? "text-red-600 font-medium" : "text-muted-foreground"
          }`}>
            〆{task.deadline}
          </span>
        )}
      </div>
    </div>
  )
}
