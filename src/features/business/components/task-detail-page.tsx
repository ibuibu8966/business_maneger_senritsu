"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Trash2, Paperclip, FileText, Link2, X, Upload, Link as LinkIcon } from "lucide-react"
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
  type TaskItem,
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
import { useFileUpload } from "@/features/business/hooks/use-file-upload"

type Attachment = { id: string; name: string; url: string; type: string }

type EditForm = {
  title: string
  detail: string
  memo: string
  status: TaskStatus
  priority: Priority
  assigneeIds: string[]
  deadline: string
  executionTime: string  // "HH:MM"
  executionDate: string  // "YYYY-MM-DD" or "" （日付指定で1回のみ通知用）
  notifyEnabled: boolean
  notifyMinutesBefore: number
  contactId: string
  partnerId: string
  tool: TicketTool | ""
  issueId: string
}

function buildForm(task: TaskItem): EditForm {
  return {
    title: task.title,
    detail: task.detail ?? "",
    memo: task.memo ?? "",
    status: task.status,
    priority: task.priority,
    assigneeIds:
      task.assigneeIds && task.assigneeIds.length > 0
        ? task.assigneeIds
        : task.assigneeId
        ? [task.assigneeId]
        : [],
    deadline: task.deadline ?? "",
    // executionTime は "HH:MM" or "YYYY-MM-DD HH:MM"。後者は分割して保持
    executionTime: (() => {
      const v = task.executionTime ?? ""
      const m = v.match(/^\d{4}-\d{2}-\d{2} (\d{2}:\d{2})$/)
      return m ? m[1] : v
    })(),
    executionDate: (() => {
      const v = task.executionTime ?? ""
      const m = v.match(/^(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}$/)
      return m ? m[1] : ""
    })(),
    notifyEnabled: task.notifyEnabled,
    notifyMinutesBefore: task.notifyMinutesBefore ?? 10,
    contactId: task.contactId ?? "",
    partnerId: task.partnerId ?? "",
    tool: task.tool ?? "",
    issueId: task.issueId ?? "",
  }
}

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

  const [form, setForm] = useState<EditForm | null>(null)
  const [urlName, setUrlName] = useState("")
  const [urlValue, setUrlValue] = useState("")
  const [showUrlInput, setShowUrlInput] = useState(false)

  // タスク切り替え時のみフォームを初期化（保存後のrefetchではフォームを上書きしない）
  useEffect(() => {
    if (task) setForm(buildForm(task))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  const attachments: Attachment[] = (task?.attachments ?? []) as Attachment[]

  const { openFilePicker } = useFileUpload((result) => {
    if (!task) return
    const next: Attachment[] = [
      ...attachments,
      { id: `att-${Date.now()}`, name: result.name, url: result.url, type: "file" },
    ]
    updateTaskMutation.mutate(
      { id: task.id, data: { attachments: next } },
      {
        onSuccess: () => toast.success("添付を追加しました"),
        onError: () => toast.error("添付の保存に失敗しました"),
      }
    )
  })

  // 単一フィールド自動保存ヘルパー
  const saveField = (data: Record<string, unknown>) => {
    if (!task) return
    updateTaskMutation.mutate(
      { id: task.id, data },
      {
        onSuccess: () => toast.success("保存しました"),
        onError: () => toast.error("保存に失敗しました"),
      }
    )
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">読み込み中...</div>
  }

  if (!task || !form) {
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
  const typedIssues = issues as unknown as {
    id: string
    title: string
    projectId: string
  }[]

  const addUrlAttachment = () => {
    if (!urlName.trim() || !urlValue.trim()) return
    const next: Attachment[] = [
      ...attachments,
      { id: `att-${Date.now()}`, name: urlName.trim(), url: urlValue.trim(), type: "url" },
    ]
    updateTaskMutation.mutate(
      { id: task.id, data: { attachments: next } },
      {
        onSuccess: () => {
          toast.success("URLを追加しました")
          setUrlName("")
          setUrlValue("")
          setShowUrlInput(false)
        },
        onError: () => toast.error("URLの保存に失敗しました"),
      }
    )
  }

  const removeAttachment = (id: string) => {
    const next = attachments.filter((a) => a.id !== id)
    updateTaskMutation.mutate(
      { id: task.id, data: { attachments: next } },
      {
        onSuccess: () => toast.success("添付を削除しました"),
        onError: () => toast.error("添付の削除に失敗しました"),
      }
    )
  }

  // タイトル onBlur 保存（空欄は元に戻す）
  const handleTitleBlur = () => {
    const trimmed = form.title.trim()
    if (!trimmed) {
      toast.error("タイトルは必須です")
      setForm({ ...form, title: task.title })
      return
    }
    if (trimmed !== task.title) saveField({ title: trimmed })
  }

  // 詳細 onBlur 保存
  const handleDetailBlur = () => {
    if (form.detail !== (task.detail ?? "")) saveField({ detail: form.detail })
  }

  // メモ onBlur 保存
  const handleMemoBlur = () => {
    if (form.memo !== (task.memo ?? "")) saveField({ memo: form.memo })
  }

  // 担当者切り替え（即保存）
  const toggleAssignee = (empId: string) => {
    const next = form.assigneeIds.includes(empId)
      ? form.assigneeIds.filter((id) => id !== empId)
      : [...form.assigneeIds, empId]
    setForm({ ...form, assigneeIds: next })
    const names = employees
      .filter((em) => next.includes(em.id))
      .map((em) => em.name)
    saveField({
      assigneeIds: next,
      assigneeId: next[0] ?? null,
      assigneeName: names[0] ?? null,
      assigneeNames: names,
    })
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* ヘッダー（編集/保存/キャンセル ボタン削除済み・常時編集可能） */}
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
        {updateTaskMutation.isPending && (
          <span className="text-xs text-muted-foreground">保存中...</span>
        )}
      </div>

      {/* タイトル */}
      <div>
        <Label className="text-xs text-muted-foreground">タイトル</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onBlur={handleTitleBlur}
          className="text-lg font-semibold mt-1"
        />
      </div>

      {/* 詳細 */}
      <div>
        <Label className="text-xs text-muted-foreground">詳細</Label>
        <Textarea
          value={form.detail}
          onChange={(e) => setForm({ ...form, detail: e.target.value })}
          onBlur={handleDetailBlur}
          className="min-h-[200px] mt-1 text-sm"
          placeholder="詳細を入力..."
        />
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
                  variant={form.status === s ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => {
                    setForm({ ...form, status: s })
                    saveField({ status: s })
                  }}
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
                  variant={form.priority === p ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => {
                    setForm({ ...form, priority: p })
                    saveField({ priority: p })
                  }}
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
              value={form.issueId}
              onChange={(e) => {
                setForm({ ...form, issueId: e.target.value })
                saveField({ issueId: e.target.value || null })
              }}
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
                <span className="text-muted-foreground italic">
                  なし（設定は一覧画面の繰り返しのみフィルタから）
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 右カラム */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">担当者</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {employees.map((emp) => {
                const checked = form.assigneeIds.includes(emp.id)
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
                      onChange={() => toggleAssignee(emp.id)}
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
              value={form.deadline}
              onChange={(e) => {
                setForm({ ...form, deadline: e.target.value })
                saveField({ deadline: e.target.value || null })
              }}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">実行時刻</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              <Input
                type="date"
                value={form.executionDate}
                onChange={(e) => {
                  const newDate = e.target.value
                  setForm({ ...form, executionDate: newDate })
                  // executionTime と組み合わせて保存
                  const combined = form.executionTime
                    ? (newDate ? `${newDate} ${form.executionTime}` : form.executionTime)
                    : null
                  saveField({ executionTime: combined })
                }}
              />
              <Input
                type="time"
                value={form.executionTime}
                onChange={(e) => {
                  const newTime = e.target.value
                  setForm({ ...form, executionTime: newTime })
                  const combined = newTime
                    ? (form.executionDate ? `${form.executionDate} ${newTime}` : newTime)
                    : null
                  saveField({ executionTime: combined })
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              日付なし＝毎日 / 日付あり＝指定日時に1回のみ
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">通知</Label>
            <div className="flex items-center gap-2 mt-1">
              <label className="text-sm flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifyEnabled}
                  onChange={(e) => {
                    setForm({ ...form, notifyEnabled: e.target.checked })
                    saveField({ notifyEnabled: e.target.checked })
                  }}
                />
                有効
              </label>
              <select
                className="text-sm border rounded p-1 bg-background cursor-pointer disabled:opacity-50"
                value={String(form.notifyMinutesBefore)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setForm({ ...form, notifyMinutesBefore: n })
                  saveField({ notifyMinutesBefore: n })
                }}
                disabled={!form.notifyEnabled}
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
              value={form.contactId}
              onChange={(e) => {
                setForm({ ...form, contactId: e.target.value })
                saveField({ contactId: e.target.value || null })
              }}
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
              value={form.partnerId}
              onChange={(e) => {
                setForm({ ...form, partnerId: e.target.value })
                saveField({ partnerId: e.target.value || null })
              }}
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
                variant={form.tool === "" ? "default" : "outline"}
                className="text-xs"
                onClick={() => {
                  setForm({ ...form, tool: "" })
                  saveField({ tool: null })
                }}
              >
                なし
              </Button>
              {(Object.keys(TOOL_CONFIG) as TicketTool[]).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={form.tool === t ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => {
                    setForm({ ...form, tool: t })
                    saveField({ tool: t })
                  }}
                >
                  {TOOL_CONFIG[t].emoji} {TOOL_CONFIG[t].label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* 添付 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">
            <Paperclip className="w-3.5 h-3.5 inline mr-1" />
            添付 ({attachments.length})
          </Label>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={openFilePicker}>
              <Upload className="w-3 h-3 mr-1" />
              ファイル
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowUrlInput((v) => !v)}>
              <LinkIcon className="w-3 h-3 mr-1" />
              URL
            </Button>
          </div>
        </div>

        {showUrlInput && (
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="表示名"
              value={urlName}
              onChange={(e) => setUrlName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="https://..."
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={addUrlAttachment} disabled={!urlName.trim() || !urlValue.trim()}>
              追加
            </Button>
          </div>
        )}

        {attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">添付はありません</p>
        ) : (
          <div className="space-y-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30 group"
              >
                {att.type === "file" ? (
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate flex-1 hover:text-blue-600 hover:underline cursor-pointer"
                >
                  {att.name}
                </a>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive cursor-pointer"
                  title="削除"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* チェックリスト */}
      <TaskChecklistSection task={task} />

      <Separator />

      {/* メモ */}
      <div>
        <Label className="text-xs text-muted-foreground">メモ</Label>
        <Textarea
          value={form.memo}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
          onBlur={handleMemoBlur}
          className="min-h-[100px] mt-1 text-sm"
          placeholder="作業メモを入力..."
        />
      </div>

      {/* 削除ボタン */}
      <div className="flex justify-end pt-4">
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

      {/* フッター */}
      <div className="pt-3 border-t text-xs text-muted-foreground">
        作成者: {task.createdBy || "不明"}
        {task.createdAt && ` / 作成日: ${task.createdAt.split("T")[0]}`}
      </div>
    </div>
  )
}
