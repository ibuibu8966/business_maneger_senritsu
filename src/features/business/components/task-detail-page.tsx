"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  TASK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  TOOL_CONFIG,
  type TaskStatus,
  type Priority,
  type TicketTool,
} from "./mock-data"
import {
  useBusinessTasks,
  useUpdateBusinessTask,
  useDeleteBusinessTask,
  useBusinessIssues,
} from "@/hooks/use-business"
import { useEmployees } from "@/hooks/use-schedule"
import { useContacts, usePartners } from "@/hooks/use-crm"
import { TaskChecklistSection } from "./task-list/task-checklist-section"

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const router = useRouter()
  const { data: tasks = [], isLoading } = useBusinessTasks()
  const task = tasks.find((t) => t.id === taskId)
  const updateTaskMutation = useUpdateBusinessTask()
  const deleteTaskMutation = useDeleteBusinessTask()
  const { data: employees = [] } = useEmployees()
  const { data: contactsList = [] } = useContacts()
  const { data: partnersList = [] } = usePartners()
  const { data: issues = [] } = useBusinessIssues()

  const titleRef = useRef<HTMLInputElement>(null)
  const detailRef = useRef<HTMLTextAreaElement>(null)
  const memoRef = useRef<HTMLTextAreaElement>(null)

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">読み込み中...</div>
  }

  if (!task) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-muted-foreground">タスクが見つかりません。</p>
        <Button variant="outline" onClick={() => router.push("/business/tasks")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          一覧へ戻る
        </Button>
      </div>
    )
  }

  const contacts = contactsList as unknown as { id: string; name: string }[]
  const partners = partnersList as unknown as { id: string; name: string }[]
  const typedIssues = issues as unknown as { id: string; title: string; projectId: string }[]

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          戻る
        </Button>
        <div className="flex-1 text-sm text-muted-foreground truncate">
          {task.businessName}
          {task.projectName ? ` / ${task.projectName}` : ""}
          {task.seqNumber != null && (
            <span className="ml-2 font-mono text-xs">#{task.seqNumber}</span>
          )}
        </div>
      </div>

      {/* タイトル */}
      <div>
        <Label className="text-xs text-muted-foreground">タイトル</Label>
        <Input
          ref={titleRef}
          defaultValue={task.title}
          className="text-lg font-semibold mt-1"
          key={`title-${task.id}`}
        />
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            disabled={updateTaskMutation.isPending}
            onClick={() => {
              const val = titleRef.current?.value?.trim() ?? ""
              if (!val) {
                toast.error("タイトルは必須です")
                return
              }
              updateTaskMutation.mutate(
                { id: task.id, data: { title: val } },
                {
                  onSuccess: () => toast.success("タイトルを保存しました"),
                  onError: () => toast.error("タイトルの保存に失敗しました"),
                }
              )
            }}
          >
            {updateTaskMutation.isPending ? "保存中..." : "タイトル保存"}
          </Button>
        </div>
      </div>

      {/* 詳細 */}
      <div>
        <Label className="text-xs text-muted-foreground">詳細</Label>
        <Textarea
          ref={detailRef}
          defaultValue={task.detail ?? ""}
          className="min-h-[200px] mt-1 text-sm"
          placeholder="詳細を入力..."
          key={`detail-${task.id}`}
        />
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            disabled={updateTaskMutation.isPending}
            onClick={() => {
              const val = detailRef.current?.value ?? ""
              updateTaskMutation.mutate(
                { id: task.id, data: { detail: val } },
                {
                  onSuccess: () => toast.success("詳細を保存しました"),
                  onError: () => toast.error("詳細の保存に失敗しました"),
                }
              )
            }}
          >
            {updateTaskMutation.isPending ? "保存中..." : "詳細保存"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* 2カラムメタ情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左カラム */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">状態</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={task.status === s ? "default" : "outline"}
                  className="text-xs"
                  onClick={() =>
                    updateTaskMutation.mutate({ id: task.id, data: { status: s } })
                  }
                >
                  {TASK_STATUS_CONFIG[s].label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">優先度</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={task.priority === p ? "default" : "outline"}
                  className="text-xs"
                  onClick={() =>
                    updateTaskMutation.mutate({ id: task.id, data: { priority: p } })
                  }
                >
                  {PRIORITY_CONFIG[p].label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">事業 / プロジェクト</Label>
            <p className="text-sm mt-1">
              {task.businessName}
              {task.projectName ? ` / ${task.projectName}` : ""}
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">紐づく課題</Label>
            <select
              className="w-full mt-1 text-sm border rounded-md p-2 bg-background cursor-pointer"
              value={task.issueId ?? ""}
              onChange={(e) =>
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { issueId: e.target.value || null },
                })
              }
            >
              <option value="">課題なし</option>
              {typedIssues
                .filter((i) => i.projectId === task.projectId)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">繰り返し</Label>
            <p className="text-sm mt-1">
              {task.recurring ? (
                <span className="text-blue-600 dark:text-blue-400">
                  {task.recurringPattern}
                  {task.recurringDay != null ? ` / ${task.recurringDay}` : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">なし（設定は右サイドパネルから）</span>
              )}
            </p>
          </div>
        </div>

        {/* 右カラム */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">担当者（複数選択可）</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {employees.map((emp) => {
                const currentIds: string[] =
                  task.assigneeIds && task.assigneeIds.length > 0
                    ? task.assigneeIds
                    : task.assigneeId
                    ? [task.assigneeId]
                    : []
                const checked = currentIds.includes(emp.id)
                return (
                  <label
                    key={emp.id}
                    className={`flex items-center gap-1 text-xs px-2 py-1 border rounded cursor-pointer ${
                      checked
                        ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100"
                        : "bg-background"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...currentIds, emp.id]
                          : currentIds.filter((id) => id !== emp.id)
                        const names = employees
                          .filter((em) => next.includes(em.id))
                          .map((em) => em.name)
                        updateTaskMutation.mutate({
                          id: task.id,
                          data: {
                            assigneeIds: next,
                            assigneeId: next[0] ?? null,
                            assigneeName: names[0] ?? null,
                            assigneeNames: names,
                          },
                        })
                      }}
                    />
                    {emp.name}
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">期限</Label>
            <Input
              type="date"
              className="mt-1"
              value={task.deadline ?? ""}
              onChange={(e) =>
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { deadline: e.target.value || null },
                })
              }
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">実行時刻</Label>
            <Input
              type="time"
              className="mt-1"
              value={task.executionTime ?? ""}
              onChange={(e) =>
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { executionTime: e.target.value || null },
                })
              }
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">通知</Label>
            <div className="flex items-center gap-2 mt-1">
              <label className="text-sm flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.notifyEnabled}
                  onChange={(e) =>
                    updateTaskMutation.mutate({
                      id: task.id,
                      data: { notifyEnabled: e.target.checked },
                    })
                  }
                />
                有効
              </label>
              <select
                className="text-sm border rounded p-1 bg-background cursor-pointer disabled:opacity-50"
                value={String(task.notifyMinutesBefore ?? 10)}
                onChange={(e) =>
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: { notifyMinutesBefore: Number(e.target.value) },
                  })
                }
                disabled={!task.notifyEnabled}
              >
                <option value="0">なし</option>
                <option value="5">5分前</option>
                <option value="10">10分前</option>
                <option value="15">15分前</option>
                <option value="30">30分前</option>
                <option value="60">60分前</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">連絡先</Label>
            <select
              className="w-full mt-1 text-sm border rounded-md p-2 bg-background cursor-pointer"
              value={task.contactId ?? ""}
              onChange={(e) =>
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { contactId: e.target.value || null },
                })
              }
            >
              <option value="">なし</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">取引先</Label>
            <select
              className="w-full mt-1 text-sm border rounded-md p-2 bg-background cursor-pointer"
              value={task.partnerId ?? ""}
              onChange={(e) =>
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { partnerId: e.target.value || null },
                })
              }
            >
              <option value="">なし</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">連絡ツール</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              <Button
                size="sm"
                variant={task.tool == null ? "default" : "outline"}
                className="text-xs"
                onClick={() =>
                  updateTaskMutation.mutate({ id: task.id, data: { tool: null } })
                }
              >
                なし
              </Button>
              {(Object.keys(TOOL_CONFIG) as TicketTool[]).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={task.tool === t ? "default" : "outline"}
                  className="text-xs"
                  onClick={() =>
                    updateTaskMutation.mutate({ id: task.id, data: { tool: t } })
                  }
                >
                  {TOOL_CONFIG[t].emoji} {TOOL_CONFIG[t].label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* チェックリスト */}
      <TaskChecklistSection task={task} />

      <Separator />

      {/* メモ */}
      <div>
        <Label className="text-xs text-muted-foreground">メモ</Label>
        <Textarea
          ref={memoRef}
          defaultValue={task.memo}
          className="min-h-[100px] mt-1 text-sm"
          placeholder="作業メモを入力..."
          key={`memo-${task.id}`}
        />
        <div className="flex gap-2 mt-2 justify-between">
          <Button
            size="sm"
            disabled={updateTaskMutation.isPending}
            onClick={() => {
              const val = memoRef.current?.value ?? ""
              updateTaskMutation.mutate(
                { id: task.id, data: { memo: val } },
                {
                  onSuccess: () => toast.success("メモを保存しました"),
                  onError: () => toast.error("メモの保存に失敗しました"),
                }
              )
            }}
          >
            {updateTaskMutation.isPending ? "保存中..." : "メモ保存"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (!confirm(`「${task.title}」を削除してよろしいですか？`)) return
              deleteTaskMutation.mutate(task.id, {
                onSuccess: () => {
                  toast.success("タスクを削除しました")
                  router.push("/business/tasks")
                },
                onError: () => toast.error("削除に失敗しました"),
              })
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            タスクを削除
          </Button>
        </div>
      </div>

      {/* フッター */}
      <div className="pt-3 border-t text-xs text-muted-foreground">
        作成者: {task.createdBy || "不明"}
        {task.createdAt && ` / 作成日: ${task.createdAt.split("T")[0]}`}
      </div>
    </div>
  )
}
