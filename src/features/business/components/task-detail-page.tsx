"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Trash2, Pencil, Paperclip, FileText, Link2, X, Upload, Link as LinkIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
  executionTime: string
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
    executionTime: task.executionTime ?? "",
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

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [urlName, setUrlName] = useState("")
  const [urlValue, setUrlValue] = useState("")
  const [showUrlInput, setShowUrlInput] = useState(false)

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
  const typedIssues = issues as unknown as {
    id: string
    title: string
    projectId: string
  }[]

  const startEditing = () => {
    setForm(buildForm(task))
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setForm(null)
    setIsEditing(false)
  }

  const save = () => {
    if (!form) return
    const data: Record<string, unknown> = {}
    if (form.title.trim() !== task.title) {
      if (!form.title.trim()) {
        toast.error("タイトルは必須です")
        return
      }
      data.title = form.title.trim()
    }
    if (form.detail !== (task.detail ?? "")) data.detail = form.detail
    if (form.memo !== (task.memo ?? "")) data.memo = form.memo
    if (form.status !== task.status) data.status = form.status
    if (form.priority !== task.priority) data.priority = form.priority
    if (form.deadline !== (task.deadline ?? "")) data.deadline = form.deadline || null
    if (form.executionTime !== (task.executionTime ?? "")) data.executionTime = form.executionTime || null
    if (form.notifyEnabled !== task.notifyEnabled) data.notifyEnabled = form.notifyEnabled
    if (form.notifyMinutesBefore !== (task.notifyMinutesBefore ?? 10)) data.notifyMinutesBefore = form.notifyMinutesBefore
    if (form.contactId !== (task.contactId ?? "")) data.contactId = form.contactId || null
    if (form.partnerId !== (task.partnerId ?? "")) data.partnerId = form.partnerId || null
    if (form.tool !== (task.tool ?? "")) data.tool = form.tool || null
    if (form.issueId !== (task.issueId ?? "")) data.issueId = form.issueId || null

    const currentAssigneeIds =
      task.assigneeIds && task.assigneeIds.length > 0
        ? task.assigneeIds
        : task.assigneeId
        ? [task.assigneeId]
        : []
    const sameAssignees =
      currentAssigneeIds.length === form.assigneeIds.length &&
      currentAssigneeIds.every((id) => form.assigneeIds.includes(id))
    if (!sameAssignees) {
      const names = employees
        .filter((em) => form.assigneeIds.includes(em.id))
        .map((em) => em.name)
      data.assigneeIds = form.assigneeIds
      data.assigneeId = form.assigneeIds[0] ?? null
      data.assigneeName = names[0] ?? null
      data.assigneeNames = names
    }

    if (Object.keys(data).length === 0) {
      toast.info("変更がありません")
      setIsEditing(false)
      setForm(null)
      return
    }

    updateTaskMutation.mutate(
      { id: task.id, data },
      {
        onSuccess: () => {
          toast.success("保存しました")
          setIsEditing(false)
          setForm(null)
        },
        onError: () => toast.error("保存に失敗しました"),
      }
    )
  }

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

  const assigneeDisplay = (() => {
    if (task.assigneeNames && task.assigneeNames.length > 0) return task.assigneeNames.join("、")
    if (task.assigneeName) return task.assigneeName
    return "未割当"
  })()

  const st = TASK_STATUS_CONFIG[task.status]
  const pr = PRIORITY_CONFIG[task.priority]

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
        {isEditing ? (
          <>
            <Button size="sm" variant="outline" onClick={cancelEditing} disabled={updateTaskMutation.isPending}>
              キャンセル
            </Button>
            <Button size="sm" onClick={save} disabled={updateTaskMutation.isPending}>
              {updateTaskMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={startEditing}>
            <Pencil className="w-3 h-3 mr-1" />
            編集
          </Button>
        )}
      </div>

      {/* タイトル */}
      {isEditing && form ? (
        <div>
          <Label className="text-xs text-muted-foreground">タイトル</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="text-lg font-semibold mt-1"
          />
        </div>
      ) : (
        <h1 className="text-2xl font-bold">{task.title}</h1>
      )}

      {/* ステータスバッジ行（表示モードのみ） */}
      {!isEditing && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`font-semibold ${st.className}`}>
            {st.label}
          </Badge>
          <Badge variant="outline" className={`${pr.className}`}>
            {pr.label}
          </Badge>
          {task.recurring && (
            <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700">
              繰り返し
            </Badge>
          )}
          {task.todayFlag && (
            <Badge variant="outline" className="text-xs text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
              今日やる
            </Badge>
          )}
        </div>
      )}

      {/* 詳細 */}
      <div>
        <Label className="text-xs text-muted-foreground">詳細</Label>
        {isEditing && form ? (
          <Textarea
            value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })}
            className="min-h-[200px] mt-1 text-sm"
            placeholder="詳細を入力..."
          />
        ) : task.detail ? (
          <div className="mt-1 p-3 bg-muted/30 rounded text-sm whitespace-pre-wrap">
            {task.detail}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground italic">未設定</p>
        )}
      </div>

      <Separator />

      {/* 2カラムメタ情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左カラム */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">状態</Label>
            {isEditing && form ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={form.status === s ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setForm({ ...form, status: s })}
                  >
                    {TASK_STATUS_CONFIG[s].label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm mt-1">{st.label}</p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">優先度</Label>
            {isEditing && form ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={form.priority === p ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setForm({ ...form, priority: p })}
                  >
                    {PRIORITY_CONFIG[p].label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm mt-1">{pr.label}</p>
            )}
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
            {isEditing && form ? (
              <select
                className="w-full mt-1 text-sm border rounded-md p-2 bg-background cursor-pointer"
                value={form.issueId}
                onChange={(e) => setForm({ ...form, issueId: e.target.value })}
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
            ) : (
              <p className="text-sm mt-1">
                {task.issueTitle ?? <span className="text-muted-foreground italic">なし</span>}
              </p>
            )}
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
                  なし{isEditing ? "（設定は右サイドパネルから）" : ""}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 右カラム */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">担当者</Label>
            {isEditing && form ? (
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
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.assigneeIds, emp.id]
                            : form.assigneeIds.filter((id) => id !== emp.id)
                          setForm({ ...form, assigneeIds: next })
                        }}
                      />
                      {emp.name}
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm mt-1">{assigneeDisplay}</p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">期限</Label>
            {isEditing && form ? (
              <Input
                type="date"
                className="mt-1"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            ) : (
              <p className="text-sm mt-1">
                {task.deadline ?? <span className="text-muted-foreground italic">未設定</span>}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">実行時刻</Label>
            {isEditing && form ? (
              <Input
                type="time"
                className="mt-1"
                value={form.executionTime}
                onChange={(e) => setForm({ ...form, executionTime: e.target.value })}
              />
            ) : (
              <p className="text-sm mt-1">
                {task.executionTime ?? <span className="text-muted-foreground italic">未設定</span>}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">通知</Label>
            {isEditing && form ? (
              <div className="flex items-center gap-2 mt-1">
                <label className="text-sm flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.notifyEnabled}
                    onChange={(e) => setForm({ ...form, notifyEnabled: e.target.checked })}
                  />
                  有効
                </label>
                <select
                  className="text-sm border rounded p-1 bg-background cursor-pointer disabled:opacity-50"
                  value={String(form.notifyMinutesBefore)}
                  onChange={(e) => setForm({ ...form, notifyMinutesBefore: Number(e.target.value) })}
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
            ) : (
              <p className="text-sm mt-1">
                {task.notifyEnabled
                  ? `有効 / ${task.notifyMinutesBefore}分前`
                  : <span className="text-muted-foreground italic">無効</span>}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">連絡先</Label>
            {isEditing && form ? (
              <select
                className="w-full mt-1 text-sm border rounded-md p-2 bg-background cursor-pointer"
                value={form.contactId}
                onChange={(e) => setForm({ ...form, contactId: e.target.value })}
              >
                <option value="">なし</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm mt-1">
                {task.contactName ?? <span className="text-muted-foreground italic">なし</span>}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">取引先</Label>
            {isEditing && form ? (
              <select
                className="w-full mt-1 text-sm border rounded-md p-2 bg-background cursor-pointer"
                value={form.partnerId}
                onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
              >
                <option value="">なし</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm mt-1">
                {task.partnerName ?? <span className="text-muted-foreground italic">なし</span>}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">連絡ツール</Label>
            {isEditing && form ? (
              <div className="flex flex-wrap gap-1 mt-1">
                <Button
                  size="sm"
                  variant={form.tool === "" ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => setForm({ ...form, tool: "" })}
                >
                  なし
                </Button>
                {(Object.keys(TOOL_CONFIG) as TicketTool[]).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={form.tool === t ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setForm({ ...form, tool: t })}
                  >
                    {TOOL_CONFIG[t].emoji} {TOOL_CONFIG[t].label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm mt-1">
                {task.tool && TOOL_CONFIG[task.tool] ? (
                  `${TOOL_CONFIG[task.tool].emoji} ${TOOL_CONFIG[task.tool].label}`
                ) : (
                  <span className="text-muted-foreground italic">なし</span>
                )}
              </p>
            )}
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
        {isEditing && form ? (
          <Textarea
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="min-h-[100px] mt-1 text-sm"
            placeholder="作業メモを入力..."
          />
        ) : task.memo ? (
          <div className="mt-1 p-3 bg-muted/30 rounded text-sm whitespace-pre-wrap">
            {task.memo}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground italic">未設定</p>
        )}
      </div>

      {/* 削除ボタン（編集モード時のみ） */}
      {isEditing && (
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
      )}

      {/* フッター */}
      <div className="pt-3 border-t text-xs text-muted-foreground">
        作成者: {task.createdBy || "不明"}
        {task.createdAt && ` / 作成日: ${task.createdAt.split("T")[0]}`}
      </div>
    </div>
  )
}
