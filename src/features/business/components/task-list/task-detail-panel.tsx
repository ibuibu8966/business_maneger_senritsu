"use client"

import { useState } from "react"
import { Plus, Repeat, X, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  TASK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  TOOL_CONFIG,
  type TaskItem,
  type TaskStatus,
  type Priority,
  type ProjectNode,
  type TicketTool,
} from "../mock-data"
import {
  useUpdateBusinessTask,
  useDeleteBusinessTask,
} from "@/hooks/use-business"
import { useEmployees, useCreateScheduleEvent } from "@/hooks/use-schedule"

export function TaskDetailPanel({
  task,
  onClose,
  updateTaskMutation,
  deleteTaskMutation,
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
  memoRef?: React.RefObject<HTMLTextAreaElement | null>
  detailRef?: React.RefObject<HTMLTextAreaElement | null>
  contacts: { id: string; name: string }[]
  partners: { id: string; name: string }[]
  issues: { id: string; title: string; projectId: string }[]
  businesses: { id: string; name: string }[]
  projects: ProjectNode[]
}) {
  const [showRecurring, setShowRecurring] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false)
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

  const currentAssigneeIds: string[] = (task.assigneeIds && task.assigneeIds.length > 0)
    ? task.assigneeIds
    : (task.assigneeId ? [task.assigneeId] : [])

  const toggleAssignee = (empId: string) => {
    const next = currentAssigneeIds.includes(empId)
      ? currentAssigneeIds.filter((id) => id !== empId)
      : [...currentAssigneeIds, empId]
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
  }

  // executionTime 分解
  const execMatch = task.executionTime?.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/) ?? null
  const execDate = execMatch ? execMatch[1] : ""
  const execTime = execMatch ? execMatch[2] : (task.executionTime ?? "")
  const buildExecValue = (date: string, time: string) =>
    time ? (date ? `${date} ${time}` : time) : null

  return (
    <div className="border-l overflow-y-auto h-full bg-card">
      {/* ヘッダー: 繰り返しバッジ + × */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
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
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg cursor-pointer shrink-0 ml-auto">&times;</button>
      </div>

      {/* 📅 カレンダー連携（最上部） */}
      <details className="border-b">
        <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer text-xs font-semibold hover:bg-muted/30 list-none">
          <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
          📅 カレンダー登録
          {task.scheduleEvents && task.scheduleEvents.length > 0 && (
            <span className="text-[10px] text-blue-600 ml-1">({task.scheduleEvents.length}件)</span>
          )}
          <span className="text-muted-foreground ml-auto text-[10px]">▼</span>
        </summary>
        <div className="px-4 pb-3 space-y-2">
          {/* 登録済み一覧 */}
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
          {/* 新規登録ボタンとフォーム */}
          {!showScheduleForm ? (
            <button
              className="text-xs text-blue-600 hover:underline w-full text-left py-1"
              onClick={() => setShowScheduleForm(true)}
            >
              + 新規登録
            </button>
          ) : (
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
                      onSuccess: () => setShowScheduleForm(false),
                    })
                  }}
                >
                  {createScheduleMutation.isPending ? "登録中..." : "カレンダーに登録"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </details>

      {/* ① 進捗（ステータス・優先度・担当者） */}
      <div className="px-4 py-3 border-b">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">① 進捗</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">ステータス</Label>
            <select
              className={`w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 font-semibold ${TASK_STATUS_CONFIG[task.status].className}`}
              value={task.status}
              onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { status: e.target.value as TaskStatus } })}
            >
              {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>{TASK_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">優先度</Label>
            <select
              className={`w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 font-semibold ${PRIORITY_CONFIG[task.priority].bgClassName}`}
              value={task.priority}
              onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { priority: e.target.value as Priority } })}
            >
              {(["highest", "high", "medium", "low"] as const).map((p) => (
                <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Label className="text-[10px] text-muted-foreground">担当者</Label>
            <button
              type="button"
              onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
              className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background flex items-center gap-1 overflow-hidden"
            >
              <span className="truncate flex-1 text-left">
                {currentAssigneeIds.length === 0
                  ? <span className="text-muted-foreground">未設定</span>
                  : employees.filter((e) => currentAssigneeIds.includes(e.id)).map((e) => e.name).join("、")}
              </span>
              <span className="text-muted-foreground text-[9px] shrink-0">▼</span>
            </button>
            {showAssigneeMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAssigneeMenu(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-20 p-1 max-h-60 overflow-y-auto">
                  {employees.map((emp) => {
                    const checked = currentAssigneeIds.includes(emp.id)
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted/50 rounded cursor-pointer ${checked ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAssignee(emp.id)}
                          className="cursor-pointer"
                        />
                        {emp.name}
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ② スケジュール */}
      <div className="px-4 py-3 border-b">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">② スケジュール</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">締切</Label>
            <Input
              type="date"
              className="mt-0.5 h-7 text-xs"
              value={task.deadline ?? ""}
              onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { deadline: e.target.value || null } })}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground flex items-center justify-between">
              <span>実行日時</span>
              {task.executionTime && (
                <button
                  type="button"
                  onClick={() => updateTaskMutation.mutate({ id: task.id, data: { executionTime: null } })}
                  className="text-red-500 hover:text-red-700 text-[9px]"
                  title="実行時刻をクリア"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </Label>
            <div className="grid grid-cols-2 gap-1 mt-0.5">
              <Input
                type="date"
                className="h-7 text-[10px] px-1"
                value={execDate}
                onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { executionTime: buildExecValue(e.target.value, execTime) } })}
              />
              <Input
                type="time"
                className="h-7 text-[10px] px-1"
                value={execTime}
                onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { executionTime: buildExecValue(execDate, e.target.value) } })}
              />
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">事前通知</Label>
            <select
              className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
              value={task.notifyEnabled === false ? 0 : (task.notifyMinutesBefore ?? 10)}
              onChange={(e) => {
                const v = Number(e.target.value)
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { notifyEnabled: v !== 0, notifyMinutesBefore: v === 0 ? 0 : v },
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
        <p className="text-[9px] text-muted-foreground italic mt-1">日付なし＝毎日 / 日付あり＝1回のみ</p>
      </div>

      {/* ③ 分類 */}
      <div className="px-4 py-3 border-b">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">③ 分類</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">事業 / プロジェクト</Label>
            <select
              className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
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
          <div>
            <Label className="text-[10px] text-muted-foreground">紐づく課題</Label>
            <select
              className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
              value={task.issueId ?? ""}
              onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { issueId: e.target.value || null } })}
            >
              <option value="">課題なし</option>
              {issues.filter((i) => i.projectId === task.projectId).map((i) => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ④ 連絡 */}
      <div className="px-4 py-3 border-b">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">④ 連絡</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">連絡先</Label>
            <select
              className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
              value={task.contactId ?? ""}
              onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { contactId: e.target.value || null } })}
            >
              <option value="">なし</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">取引先</Label>
            <select
              className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
              value={task.partnerId ?? ""}
              onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { partnerId: e.target.value || null } })}
            >
              <option value="">なし</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">ツール</Label>
            <select
              className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
              value={task.tool ?? ""}
              onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { tool: (e.target.value || null) as TicketTool | null } })}
            >
              <option value="">なし</option>
              {(Object.keys(TOOL_CONFIG) as TicketTool[]).map((t) => (
                <option key={t} value={t}>{TOOL_CONFIG[t].emoji} {TOOL_CONFIG[t].label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ⑤ 繰り返し設定（折りたたみ） */}
      {showRecurring && (
        <div className="px-4 py-3 border-b bg-blue-50/30 dark:bg-blue-950/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">⑤ 繰り返し設定</p>
            {task.recurring && (
              <button
                className="text-[10px] text-red-500 hover:text-red-700 cursor-pointer"
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
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <Label className="text-[10px]">パターン</Label>
              <select
                className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
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
            <div>
              <Label className="text-[10px]">終了日（任意）</Label>
              <Input
                type="date"
                className="mt-0.5 h-7 text-xs"
                value={task.recurringEndDate ?? ""}
                onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { recurringEndDate: e.target.value || null } })}
              />
            </div>
          </div>
          {task.recurringPattern === "weekly" && (
            <div>
              <div className="flex gap-1 mb-1.5">
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
              <div className="flex flex-wrap gap-1">
                {[
                  { v: 1, l: "月" }, { v: 2, l: "火" }, { v: 3, l: "水" },
                  { v: 4, l: "木" }, { v: 5, l: "金" }, { v: 6, l: "土" }, { v: 0, l: "日" },
                ].map(({ v, l }) => {
                  const currentDays: number[] = (task.recurringDays && task.recurringDays.length > 0)
                    ? task.recurringDays
                    : (task.recurringDay != null ? [task.recurringDay] : [])
                  const checked = currentDays.includes(v)
                  return (
                    <label
                      key={v}
                      className={`text-xs px-2 py-0.5 border rounded cursor-pointer ${checked ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100" : "bg-background"}`}
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
              <Label className="text-[10px]">日付</Label>
              <select
                className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
                value={task.recurringDay != null ? String(task.recurringDay) : ""}
                onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { recurringDay: e.target.value ? Number(e.target.value) : null } })}
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
                <Label className="text-[10px]">第何週</Label>
                <select
                  className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
                  value={task.recurringWeek != null ? String(task.recurringWeek) : ""}
                  onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { recurringWeek: e.target.value ? Number(e.target.value) : null } })}
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
                <Label className="text-[10px]">曜日</Label>
                <select
                  className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
                  value={task.recurringDay != null ? String(task.recurringDay) : ""}
                  onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { recurringDay: e.target.value ? Number(e.target.value) : null } })}
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
        </div>
      )}

      {/* フッター */}
      <div className="px-4 py-3 flex justify-between items-center bg-muted/20">
        <div className="text-[10px] text-muted-foreground">
          作成: {task.createdBy || "不明"}{task.createdAt && ` / ${task.createdAt.split("T")[0]}`}
          {task.seqNumber && <span className="ml-1 font-mono">#{task.seqNumber}</span>}
        </div>
        <button
          type="button"
          className="text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded cursor-pointer"
          onClick={() => {
            if (!confirm(`「${task.title}」を削除してよろしいですか？`)) return
            deleteTaskMutation.mutate(task.id)
            onClose()
          }}
        >
          🗑 削除
        </button>
      </div>
    </div>
  )
}
