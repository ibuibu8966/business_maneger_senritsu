"use client"

import { Textarea } from "@/components/ui/textarea"
import { Paperclip, FileText, Link2 } from "lucide-react"
import type { TaskItem } from "../mock-data"
import { useUpdateBusinessTask } from "@/hooks/use-business"
import { toast } from "sonner"
import { TaskChecklistSection } from "./task-checklist-section"

type Attachment = { id: string; name: string; url: string; type: string }

/**
 * タスク行クリックで展開される本文系コンテンツ
 * 詳細・チェックリスト・添付・メモ
 */
export function TaskRowExpanded({ task }: { task: TaskItem }) {
  const updateTaskMutation = useUpdateBusinessTask()
  const attachments: Attachment[] = (task.attachments ?? []) as Attachment[]

  return (
    <div
      className="bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 border-l-[3px] border-l-blue-500 p-3 mt-1 mb-2 rounded-md ml-3 space-y-3"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 詳細 */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">📝 詳細</p>
        <Textarea
          className="text-xs min-h-[60px] bg-background"
          placeholder="詳細を入力..."
          defaultValue={task.detail ?? ""}
          key={`row-detail-${task.id}`}
          onBlur={(e) => {
            const newVal = e.target.value
            if (newVal !== (task.detail ?? "")) {
              updateTaskMutation.mutate(
                { id: task.id, data: { detail: newVal } },
                {
                  onSuccess: () => toast.success("詳細を保存しました"),
                  onError: () => toast.error("詳細の保存に失敗しました"),
                }
              )
            }
          }}
        />
      </div>

      {/* チェックリスト */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">✅ チェックリスト</p>
        <TaskChecklistSection task={task} />
      </div>

      {/* 添付 */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          <Paperclip className="w-3 h-3 inline mr-1" />添付 ({attachments.length})
        </p>
        {attachments.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">添付はありません</p>
        ) : (
          <div className="space-y-0.5">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-1.5 text-xs p-1 rounded bg-background">
                {att.type === "file" ? (
                  <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                ) : (
                  <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
                )}
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate flex-1 hover:text-blue-600 hover:underline"
                >
                  {att.name}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* メモ */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">📋 メモ</p>
        <Textarea
          className="text-xs min-h-[50px] bg-background"
          placeholder="作業メモ..."
          defaultValue={task.memo ?? ""}
          key={`row-memo-${task.id}`}
          onBlur={(e) => {
            const newVal = e.target.value
            if (newVal !== (task.memo ?? "")) {
              updateTaskMutation.mutate(
                { id: task.id, data: { memo: newVal } },
                {
                  onSuccess: () => toast.success("メモを保存しました"),
                  onError: () => toast.error("メモの保存に失敗しました"),
                }
              )
            }
          }}
        />
      </div>
    </div>
  )
}
