"use client"

import { useState, useEffect } from "react"
import { Plus, Repeat, X, CalendarDays, AlertCircle, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  TASK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  TOOL_CONFIG,
  type TaskItem,
  type TaskStatus,
  type ProjectNode,
  type TicketTool,
} from "../mock-data"
import {
  useUpdateBusinessTask,
  useDeleteBusinessTask,
} from "@/hooks/use-business"
import { useEmployees, useCreateScheduleEvent } from "@/hooks/use-schedule"
import { TaskChecklistSection } from "./task-checklist-section"

export function TaskDetailPanel({
  task,
  onClose,
  updateTaskMutation,
  deleteTaskMutation,
  memoRef,
  detailRef,
  contacts,
  partners,
  issues,
  businesses,
  projects,
}: {
  task: TaskItem
  onClose: () => void
  updateTaskMutation: ReturnType<typeof useUpdateBusinessTask>
  deleteTaskMutation: ReturnType<typeof useDeleteBusinessTask>
  memoRef: React.RefObject<HTMLTextAreaElement | null>
  detailRef: React.RefObject<HTMLTextAreaElement | null>
  contacts: { id: string; name: string }[]
  partners: { id: string; name: string }[]
  issues: { id: string; title: string; projectId: string }[]
  businesses: { id: string; name: string }[]
  projects: ProjectNode[]
}) {
  const [showRecurring, setShowRecurring] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [schedDate, setSchedDate] = useState(task.deadline ?? new Date().toISOString().split("T")[0])
  const [schedStartTime, setSchedStartTime] = useState(task.executionTime ?? "09:00")
  const [schedEndTime, setSchedEndTime] = useState(() => {
    const start = task.executionTime ?? "09:00"
    const [h, m] = start.split(":").map(Number)
    return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  })
  const [schedTitle, setSchedTitle] = useState(task.title)
  const createScheduleMutation = useCreateScheduleEvent()
  const { data: employees = [] } = useEmployees()

  // タイトル編集用 state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(task.title)
  useEffect(() => {
    setDraftTitle(task.title)
    setIsEditingTitle(false)
  }, [task.id, task.title])
  const commitTitleEdit = () => {
    const trimmed = draftTitle.trim()
    if (!trimmed || trimmed === task.title) {
      setDraftTitle(task.title)
      setIsEditingTitle(false)
      return
    }
    updateTaskMutation.mutate(
      { id: task.id, data: { title: trimmed } },
      {
        onSuccess: () => toast.success("タスク名を更新しました"),
        onError: () => {
          toast.error("更新に失敗しました")
          setDraftTitle(task.title)
        },
      }
    )
    setIsEditingTitle(false)
  }
  const cancelTitleEdit = () => {
    setDraftTitle(task.title)
    setIsEditingTitle(false)
  }

  const WEEKDAY_LABELS: Record<number, string> = { 0: "日曜日", 1: "月曜日", 2: "火曜日", 3: "水曜日", 4: "木曜日", 5: "金曜日", 6: "土曜日" }
  const PATTERN_LABELS: Record<string, string> = { daily: "毎日", weekly: "毎週", monthly_date: "毎月（日付）", monthly_weekday: "毎月（曜日）" }

  const recurringLabel = task.recurringPattern
    ? (() => {
        const p = PATTERN_LABELS[task.recurringPattern] ?? task.recurringPattern
        if (task.recurringPattern === "weekly") {
          const days = (task.recurringDays && task.recurringDays.length > 0)
            ? task.recurringDays
            : (task.recurringDay != null ? [task.recurringDay] : [])
          if (days.length === 0) return p
          // 平日／週末のプリセット表示
          const sorted = [...days].sort()
          const sortedStr = sorted.join(",")
          if (sortedStr === "1,2,3,4,5") return `${p} 平日`
          if (sortedStr === "0,6") return `${p} 週末`
          if (sortedStr === "0,1,2,3,4,5,6") return `${p} 毎日`
          const SHORT: Record<number, string> = { 0: "日", 1: "月", 2: "火", 3: "水", 4: "木", 5: "金", 6: "土" }
          return `${p} ${sorted.map((d) => SHORT[d]).join("・")}`
        }
        if (task.recurringPattern === "monthly_date" && task.recurringDay != null) return `${p} ${task.recurringDay}日`
        if (task.recurringPattern === "monthly_weekday" && task.recurringWeek != null && task.recurringDay != null) return `${p} 第${task.recurringWeek}${WEEKDAY_LABELS[task.recurringDay] ?? ""}`
        return p
      })()
    : "繰り返し"

  return (
    <div className="border-l overflow-y-auto p-4 space-y-4 h-full">
      <div className="flex items-center justify-between gap-2">
        {isEditingTitle ? (
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitTitleEdit()
              } else if (e.key === "Escape") {
                e.preventDefault()
                cancelTitleEdit()
              }
            }}
            className="text-base font-bold flex-1 min-w-0 bg-background border border-primary/50 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
            autoFocus
            disabled={updateTaskMutation.isPending}
          />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="text-base font-bold truncate">{task.title}</h3>
            <button
              onClick={() => {
                setDraftTitle(task.title)
                setIsEditingTitle(true)
              }}
              className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="タスク名を編集"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg cursor-pointer shrink-0">&times;</button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`font-semibold ${TASK_STATUS_CONFIG[task.status].className}`}>
          {TASK_STATUS_CONFIG[task.status].label}
        </Badge>
        {task.recurring ? (
          <Badge
            variant="outline"
            className="text-xs text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40"
            onClick={() => setShowRecurring(!showRecurring)}
          >
            <Repeat className="w-3 h-3 mr-1" />{recurringLabel}
          </Badge>
        ) : (
          <button
            className="text-xs text-muted-foreground hover:text-blue-600 cursor-pointer flex items-center gap-1"
            onClick={() => setShowRecurring(!showRecurring)}
          >
            <Plus className="w-3 h-3" />繰り返し設定
          </button>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {task.seqNumber && <span className="font-mono font-bold mr-1">#{task.seqNumber}</span>}
          {task.projectName ? `${task.businessName} > ${task.projectName}` : `${task.businessName}（事業直下）`}
        </span>
      </div>

      {/* 紐づけ先（事業/プロジェクト） */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">紐づけ先（事業/プロジェクト）</p>
        <select
          className="w-full text-sm border rounded-md p-1.5 bg-background cursor-pointer"
          value={task.projectId ? `proj:${task.projectId}` : (task.businessId ? `biz:${task.businessId}` : "")}
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            const [kind, id] = v.split(":")
            if (kind === "proj") {
              updateTaskMutation.mutate({ id: task.id, data: { projectId: id, businessId: null } })
            } else {
              updateTaskMutation.mutate({ id: task.id, data: { projectId: null, businessId: id } })
            }
          }}
        >
          <option value="">選択してください</option>
          {businesses.map((biz) => {
            const projs = projects.filter((p) => p.businessId === biz.id)
            return (
              <optgroup key={biz.id} label={biz.name}>
                <option value={`biz:${biz.id}`}>（事業直下）{biz.name}</option>
                {projs.map((p) => (
                  <option key={p.id} value={`proj:${p.id}`}>{p.name}</option>
                ))}
              </optgroup>
            )
          })}
        </select>
      </div>

      {/* 紐づく課題 */}
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3 h-3 text-orange-500 shrink-0" />
        <select
          className="text-xs border rounded px-1.5 py-0.5 bg-background cursor-pointer flex-1"
          value={task.issueId ?? ""}
          onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { issueId: e.target.value || null } })}
        >
          <option value="">課題なし</option>
          {issues.filter((i) => i.projectId === task.projectId).map((i) => (
            <option key={i.id} value={i.id}>{i.title}</option>
          ))}
        </select>
      </div>

      {/* スケジュール */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <CalendarDays className="w-3 h-3" />スケジュール
          </div>
          <button
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 cursor-pointer"
            onClick={() => setShowScheduleForm(!showScheduleForm)}
          >
            {showScheduleForm ? "閉じる" : "+ 登録"}
          </button>
        </div>

        {/* 登録済みスケジュール一覧 */}
        {task.scheduleEvents && task.scheduleEvents.length > 0 && (
          <div className="space-y-1">
            {task.scheduleEvents.map((se: any) => (
              <div key={se.id} className="text-[10px] p-1.5 rounded bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-400 flex items-center gap-2">
                <CalendarDays className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="truncate flex-1">{se.title}</span>
                <span className="text-muted-foreground shrink-0">
                  {se.allDay
                    ? new Date(se.startAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
                    : `${new Date(se.startAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} ${new Date(se.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* スケジュール登録フォーム */}
        {showScheduleForm && (
          <div className="space-y-2 border rounded-md p-3 bg-blue-50/50 dark:bg-blue-900/10">
            <div>
              <Label className="text-xs">タイトル</Label>
              <Input className="mt-1 h-7 text-xs" value={schedTitle} onChange={(e) => setSchedTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">日付</Label>
                <Input type="date" className="mt-1 h-7 text-xs" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">開始</Label>
                <Input type="time" className="mt-1 h-7 text-xs" value={schedStartTime} onChange={(e) => setSchedStartTime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">終了</Label>
                <Input type="time" className="mt-1 h-7 text-xs" value={schedEndTime} onChange={(e) => setSchedEndTime(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowScheduleForm(false)}>
                キャンセル
              </Button>
              <Button
                size="sm"
                className="h-6 text-[10px]"
                disabled={!schedTitle.trim() || !schedDate || createScheduleMutation.isPending}
                onClick={() => {
                  const startAt = `${schedDate}T${schedStartTime}:00`
                  const endAt = `${schedDate}T${schedEndTime}:00`
                  // 複数担当者対応: 先頭をメイン、残りをparticipantIdsに
                  const allAssigneeIds: string[] = (task.assigneeIds && task.assigneeIds.length > 0)
                    ? task.assigneeIds
                    : (task.assigneeId ? [task.assigneeId] : [])
                  const mainEmployeeId = allAssigneeIds[0] ?? employees[0]?.id ?? ""
                  const participantIds = allAssigneeIds.slice(1)
                  createScheduleMutation.mutate({
                    title: schedTitle.trim(),
                    startAt: new Date(startAt).toISOString(),
                    endAt: new Date(endAt).toISOString(),
                    employeeId: mainEmployeeId,
                    participantIds,
                    eventType: "work",
                    taskId: task.id,
                  }, {
                    onSuccess: () => {
                      setShowScheduleForm(false)
                    },
                  })
                }}
              >
                {createScheduleMutation.isPending ? "登録中..." : "スケジュール登録"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 繰り返し設定セクション */}
      {showRecurring && (
        <div className="space-y-2 border rounded-md p-3 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">繰り返し設定</p>
            {task.recurring && (
              <button
                className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                onClick={() => {
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: { recurring: false, recurringPattern: null, recurringDay: null, recurringWeek: null, recurringEndDate: null }
                  })
                  setShowRecurring(false)
                }}
              >
                繰り返しを停止
              </button>
            )}
          </div>
          <div>
            <Label className="text-xs">パターン</Label>
            <select
              className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer"
              value={task.recurringPattern ?? ""}
              onChange={(e) => {
                const pattern = e.target.value || null
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { recurring: !!pattern, recurringPattern: pattern, recurringDay: null, recurringWeek: null }
                })
              }}
            >
              <option value="">なし</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
              <option value="monthly_date">毎月（日付指定）</option>
              <option value="monthly_weekday">毎月（曜日指定）</option>
            </select>
          </div>
          {task.recurringPattern === "weekly" && (
            <div>
              <Label className="text-xs">曜日（複数選択可）</Label>
              <div className="flex gap-1 mt-1">
                <button
                  type="button"
                  className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted"
                  onClick={() => updateTaskMutation.mutate({ id: task.id, data: { recurringDays: [1, 2, 3, 4, 5], recurringDay: null } })}
                >
                  平日のみ
                </button>
                <button
                  type="button"
                  className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted"
                  onClick={() => updateTaskMutation.mutate({ id: task.id, data: { recurringDays: [0, 6], recurringDay: null } })}
                >
                  週末のみ
                </button>
                <button
                  type="button"
                  className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted"
                  onClick={() => updateTaskMutation.mutate({ id: task.id, data: { recurringDays: [0, 1, 2, 3, 4, 5, 6], recurringDay: null } })}
                >
                  毎日
                </button>
                <button
                  type="button"
                  className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted"
                  onClick={() => updateTaskMutation.mutate({ id: task.id, data: { recurringDays: [], recurringDay: null } })}
                >
                  クリア
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[
                  { v: 1, l: "月" },
                  { v: 2, l: "火" },
                  { v: 3, l: "水" },
                  { v: 4, l: "木" },
                  { v: 5, l: "金" },
                  { v: 6, l: "土" },
                  { v: 0, l: "日" },
                ].map(({ v, l }) => {
                  const currentDays: number[] = (task.recurringDays && task.recurringDays.length > 0)
                    ? task.recurringDays
                    : (task.recurringDay != null ? [task.recurringDay] : [])
                  const checked = currentDays.includes(v)
                  return (
                    <label
                      key={v}
                      className={`text-xs px-2 py-1 border rounded cursor-pointer ${checked ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100" : "bg-background"}`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...currentDays, v].sort()
                            : currentDays.filter((d) => d !== v)
                          updateTaskMutation.mutate({ id: task.id, data: { recurringDays: next, recurringDay: null } })
                        }}
                      />
                      {l}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          {task.recurringPattern === "monthly_date" && (
            <div>
              <Label className="text-xs">日付</Label>
              <select
                className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer"
                value={task.recurringDay != null ? String(task.recurringDay) : ""}
                onChange={(e) => {
                  updateTaskMutation.mutate({ id: task.id, data: { recurringDay: e.target.value ? Number(e.target.value) : null } })
                }}
              >
                <option value="">選択してください</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>{i + 1}日</option>
                ))}
              </select>
            </div>
          )}
          {task.recurringPattern === "monthly_weekday" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">第何週</Label>
                <select
                  className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer"
                  value={task.recurringWeek != null ? String(task.recurringWeek) : ""}
                  onChange={(e) => {
                    updateTaskMutation.mutate({ id: task.id, data: { recurringWeek: e.target.value ? Number(e.target.value) : null } })
                  }}
                >
                  <option value="">選択</option>
                  <option value="1">第1週</option>
                  <option value="2">第2週</option>
                  <option value="3">第3週</option>
                  <option value="4">第4週</option>
                  <option value="5">第5週</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">曜日</Label>
                <select
                  className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer"
                  value={task.recurringDay != null ? String(task.recurringDay) : ""}
                  onChange={(e) => {
                    updateTaskMutation.mutate({ id: task.id, data: { recurringDay: e.target.value ? Number(e.target.value) : null } })
                  }}
                >
                  <option value="">選択</option>
                  <option value="1">月曜日</option>
                  <option value="2">火曜日</option>
                  <option value="3">水曜日</option>
                  <option value="4">木曜日</option>
                  <option value="5">金曜日</option>
                  <option value="6">土曜日</option>
                  <option value="0">日曜日</option>
                </select>
              </div>
            </div>
          )}
          {task.recurringPattern && (
            <div>
              <Label className="text-xs">終了日（任意）</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-sm"
                value={task.recurringEndDate ?? ""}
                onChange={(e) => {
                  updateTaskMutation.mutate({ id: task.id, data: { recurringEndDate: e.target.value || null } })
                }}
              />
            </div>
          )}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">詳細</p>
        <Textarea
          ref={detailRef}
          className="text-sm min-h-[80px]"
          placeholder="詳細を入力..."
          defaultValue={task.detail ?? ""}
          key={`detail-${task.id}`}
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">担当者（複数選択可）</p>
          <div className="flex flex-wrap gap-1">
            {employees.map((emp) => {
              const currentIds: string[] = (task.assigneeIds && task.assigneeIds.length > 0)
                ? task.assigneeIds
                : (task.assigneeId ? [task.assigneeId] : [])
              const checked = currentIds.includes(emp.id)
              return (
                <label
                  key={emp.id}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 border rounded cursor-pointer ${checked ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100" : "bg-background"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...currentIds, emp.id]
                        : currentIds.filter((id) => id !== emp.id)
                      const names = employees.filter((em) => next.includes(em.id)).map((em) => em.name)
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
          <p className="text-xs font-medium text-muted-foreground mb-1">作成者</p>
          <p className="text-sm">{task.createdBy || "不明"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">作成日</p>
          <p className="text-sm">{task.createdAt ? task.createdAt.split("T")[0] : "不明"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">締切</p>
          <p className={`text-sm ${task.deadline && new Date(task.deadline) < new Date() && task.status !== "done" ? "text-red-600 font-medium" : ""}`}>
            {task.deadline ?? "なし"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">実行時刻（LINE通知）</p>
          {task.executionTime ? (() => {
            // executionTime は "HH:MM" or "YYYY-MM-DD HH:MM"
            const m = task.executionTime.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/)
            const currentDate = m ? m[1] : ""
            const currentTime = m ? m[2] : task.executionTime
            const buildValue = (date: string, time: string) =>
              time ? (date ? `${date} ${time}` : time) : null
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    className="h-7 text-xs w-[140px]"
                    value={currentDate}
                    onChange={(e) => {
                      updateTaskMutation.mutate({ id: task.id, data: { executionTime: buildValue(e.target.value, currentTime) } })
                    }}
                  />
                  <Input
                    type="time"
                    className="h-7 text-xs w-[110px]"
                    value={currentTime}
                    onChange={(e) => {
                      updateTaskMutation.mutate({ id: task.id, data: { executionTime: buildValue(currentDate, e.target.value) } })
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateTaskMutation.mutate({ id: task.id, data: { executionTime: null } })
                    }}
                    className="h-7 w-7 rounded border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
                    title="実行時刻をクリア"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">日付なし＝毎日 / 日付あり＝指定日時に1回のみ</p>
              </div>
            )
          })() : (
            <button
              type="button"
              onClick={() => {
                updateTaskMutation.mutate({ id: task.id, data: { executionTime: "09:00" } })
              }}
              className="h-7 px-3 text-xs border border-dashed border-primary/50 text-primary rounded-md hover:bg-primary/5 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />実行時刻を設定
            </button>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">事前通知</p>
          <select
            className="h-7 text-xs border rounded-md px-2 bg-background"
            value={task.notifyEnabled === false ? 0 : (task.notifyMinutesBefore ?? 10)}
            onChange={(e) => {
              const v = Number(e.target.value)
              updateTaskMutation.mutate({
                id: task.id,
                data: {
                  notifyEnabled: v !== 0,
                  notifyMinutesBefore: v === 0 ? 0 : v,
                },
              })
            }}
          >
            <option value={0}>なし</option>
            <option value={5}>5分前</option>
            <option value={10}>10分前</option>
            <option value={15}>15分前</option>
            <option value={30}>30分前</option>
            <option value={60}>1時間前</option>
          </select>
        </div>
      </div>

      <Separator />

      {/* ステータス変更 */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">ステータス</p>
        <div className="flex gap-2">
          {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              className={`text-xs flex-1 cursor-pointer ${task.status === s ? TASK_STATUS_CONFIG[s].className + " font-bold border-2" : ""}`}
              onClick={() => {
                updateTaskMutation.mutate({ id: task.id, data: { status: s } })
              }}
            >
              {TASK_STATUS_CONFIG[s].label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* 優先度 */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">優先度</p>
        <div className="flex gap-2">
          {(["highest", "high", "medium", "low"] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant="outline"
              className={`text-xs flex-1 cursor-pointer ${task.priority === p ? PRIORITY_CONFIG[p].bgClassName + " font-bold border-2" : ""}`}
              onClick={() => {
                updateTaskMutation.mutate({ id: task.id, data: { priority: p } })
              }}
            >
              {PRIORITY_CONFIG[p].label}
            </Button>
          ))}
        </div>
      </div>

      {/* 連絡先・取引先・ツール */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">連絡先</p>
          <select
            className="w-full text-sm border rounded-md p-1.5 bg-background cursor-pointer"
            value={task.contactId ?? ""}
            onChange={(e) => {
              updateTaskMutation.mutate({ id: task.id, data: { contactId: e.target.value || null } })
            }}
          >
            <option value="">なし</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">取引先</p>
          <select
            className="w-full text-sm border rounded-md p-1.5 bg-background cursor-pointer"
            value={task.partnerId ?? ""}
            onChange={(e) => {
              updateTaskMutation.mutate({ id: task.id, data: { partnerId: e.target.value || null } })
            }}
          >
            <option value="">なし</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">連絡ツール</p>
          <div className="flex gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className={`text-xs cursor-pointer ${!task.tool ? "font-bold border-2" : ""}`}
              onClick={() => {
                updateTaskMutation.mutate({ id: task.id, data: { tool: null } })
              }}
            >
              なし
            </Button>
            {(Object.keys(TOOL_CONFIG) as TicketTool[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant="outline"
                className={`text-xs cursor-pointer ${task.tool === t ? "font-bold border-2 bg-blue-50 dark:bg-blue-950/40" : ""}`}
                onClick={() => {
                  updateTaskMutation.mutate({ id: task.id, data: { tool: t } })
                }}
              >
                {TOOL_CONFIG[t].emoji} {TOOL_CONFIG[t].label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* チェックリスト */}
      <TaskChecklistSection task={task} />

      <Separator />

      {/* メモ */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">メモ</p>
        <Textarea
          ref={memoRef}
          className="text-sm min-h-[80px]"
          placeholder="作業メモを入力..."
          defaultValue={task.memo}
          key={`memo-${task.id}`}
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
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="destructive"
            className="text-xs cursor-pointer ml-auto"
            onClick={() => {
              if (!confirm(`「${task.title}」を削除してよろしいですか？`)) return
              deleteTaskMutation.mutate(task.id)
              onClose()
            }}
          >
            タスクを削除
          </Button>
        </div>
      </div>
    </div>
  )
}
