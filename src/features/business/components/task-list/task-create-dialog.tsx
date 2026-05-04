"use client"

import { useState } from "react"
import { Repeat, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  TASK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  TOOL_CONFIG,
  type ProjectNode,
  type TaskStatus,
  type Priority,
  type TicketTool,
} from "../mock-data"
import { useCreateBusinessTask, useChecklistTemplates, useAddTaskChecklistItem } from "@/hooks/use-business"
import { useCreateScheduleEvent } from "@/hooks/use-schedule"
import { toast } from "sonner"

/**
 * タスク登録ダイアログ（v6 統一デザイン）
 */
export function TaskCreateDialog({
  open,
  onClose,
  businesses,
  projects,
  employees,
  contacts,
  partners,
  issues,
  taskCount,
  currentUserName,
}: {
  open: boolean
  onClose: () => void
  businesses: { id: string; name: string }[]
  projects: ProjectNode[]
  employees: { id: string; name: string }[]
  contacts: { id: string; name: string }[]
  partners: { id: string; name: string }[]
  issues: { id: string; title: string; projectId: string }[]
  taskCount: number
  currentUserName: string
}) {
  const [title, setTitle] = useState("")
  const [detail, setDetail] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [deadline, setDeadline] = useState("")
  const [executionTime, setExecutionTime] = useState("")
  const [executionDate, setExecutionDate] = useState("")
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(0)
  const [recurring, setRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState("")
  const [recurringDay, setRecurringDay] = useState("")
  const [recurringDays, setRecurringDays] = useState<number[]>([])
  const [recurringWeek, setRecurringWeek] = useState("")
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [contactId, setContactId] = useState("")
  const [partnerId, setPartnerId] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [status, setStatus] = useState<TaskStatus>("todo")
  const [tool, setTool] = useState("")
  const [issueId, setIssueId] = useState("")
  const [addToCalendar, setAddToCalendar] = useState(false)
  const [calendarDate, setCalendarDate] = useState("")
  const [calendarStartTime, setCalendarStartTime] = useState("09:00")
  const [calendarEndTime, setCalendarEndTime] = useState("10:00")
  const [calendarEventType, setCalendarEventType] = useState<"meeting" | "holiday" | "outing" | "work" | "other">("work")
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false)
  const createTaskMutation = useCreateBusinessTask()
  const createScheduleEventMutation = useCreateScheduleEvent()
  const addChecklistItemMutation = useAddTaskChecklistItem()
  const { data: checklistTemplates = [] } = useChecklistTemplates()
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")

  const resetForm = () => {
    setTitle("")
    setDetail("")
    setTargetValue("")
    setAssigneeIds([])
    setDeadline("")
    setExecutionTime("")
    setExecutionDate("")
    setNotifyMinutesBefore(0)
    setRecurring(false)
    setRecurringPattern("")
    setRecurringDay("")
    setRecurringDays([])
    setRecurringWeek("")
    setRecurringEndDate("")
    setContactId("")
    setPartnerId("")
    setPriority("medium")
    setStatus("todo")
    setTool("")
    setIssueId("")
    setAddToCalendar(false)
    setCalendarDate("")
    setCalendarStartTime("09:00")
    setCalendarEndTime("10:00")
    setCalendarEventType("work")
    setChecklistItems([])
    setSelectedTemplateId("")
  }

  const handleCreate = async () => {
    if (!title.trim() || !targetValue) return
    const [kind, id] = targetValue.split(":")
    const proj = kind === "proj" ? projects.find((p) => p.id === id) : undefined
    const biz = kind === "biz" ? businesses.find((b) => b.id === id) : undefined
    const selectedStaff = employees.filter((s) => assigneeIds.includes(s.id))
    try {
      const newTask = await createTaskMutation.mutateAsync({
        projectId: kind === "proj" ? id : null,
        businessId: kind === "biz" ? id : null,
        projectName: proj?.name ?? biz?.name ?? "不明",
        title: title.trim(),
        detail: detail.trim(),
        assigneeId: assigneeIds[0] || null,
        assigneeName: selectedStaff[0]?.name ?? null,
        assigneeIds,
        assigneeNames: selectedStaff.map((s) => s.name),
        deadline: deadline || null,
        status,
        memo: "",
        recurring,
        recurringPattern: recurring && recurringPattern ? recurringPattern : null,
        recurringDay: recurring && recurringDay !== "" ? Number(recurringDay) : null,
        recurringDays: recurring && recurringPattern === "weekly" ? recurringDays : [],
        recurringWeek: recurring && recurringWeek !== "" ? Number(recurringWeek) : null,
        recurringEndDate: recurring && recurringEndDate ? recurringEndDate : null,
        createdBy: currentUserName,
        sortOrder: taskCount + 1,
        contactId: contactId || null,
        partnerId: partnerId || null,
        priority: priority || "medium",
        tool: tool || null,
        executionTime: executionTime
          ? (executionDate ? `${executionDate} ${executionTime}` : executionTime)
          : null,
        notifyEnabled: notifyMinutesBefore !== 0,
        notifyMinutesBefore: notifyMinutesBefore === 0 ? 0 : notifyMinutesBefore,
        issueId: issueId || null,
      })

      const newTaskId = (newTask as { id?: string } | undefined)?.id
      if (newTaskId) {
        const validItems = checklistItems.map((s) => s.trim()).filter(Boolean)
        if (validItems.length > 0) {
          await Promise.all(
            validItems.map((title, i) =>
              addChecklistItemMutation.mutateAsync({ taskId: newTaskId, title, sortOrder: i })
            )
          )
        }
      }

      if (addToCalendar && calendarDate) {
        const mainEmployeeId = assigneeIds[0] ?? employees[0]?.id ?? ""
        const participantIds = assigneeIds.slice(1)
        if (!mainEmployeeId) {
          toast.error("カレンダー登録には担当者または従業員の設定が必要です")
        } else {
          try {
            await createScheduleEventMutation.mutateAsync({
              title: title.trim(),
              description: detail.trim(),
              startAt: new Date(`${calendarDate}T${calendarStartTime}:00`).toISOString(),
              endAt: new Date(`${calendarDate}T${calendarEndTime}:00`).toISOString(),
              employeeId: mainEmployeeId,
              participantIds,
              eventType: calendarEventType,
              taskId: newTaskId ?? null,
            })
          } catch {
            toast.error("カレンダー登録に失敗しました")
          }
        }
      }

      onClose()
      resetForm()
    } catch {
      toast.error("タスク作成に失敗しました")
    }
  }

  const toggleAssignee = (empId: string) => {
    setAssigneeIds((prev) => prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId])
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-5 py-3 border-b">
          <DialogTitle className="text-sm font-bold">タスクを登録</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          {/* 基本情報 */}
          <div className="px-5 py-4 border-b space-y-2.5">
            <div>
              <Label className="text-[10px] text-muted-foreground">タイトル <span className="text-red-500">*</span></Label>
              <Input
                className="mt-0.5 h-8 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タスク名を入力"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">紐づけ先 <span className="text-red-500">*</span></Label>
              <select
                className="w-full mt-0.5 h-8 text-xs border rounded-md px-2 bg-background cursor-pointer"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
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
              <Label className="text-[10px] text-muted-foreground">詳細</Label>
              <Textarea
                className="mt-0.5 text-xs min-h-[50px]"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="タスクの詳細（任意）"
              />
            </div>
          </div>

          {/* 🔁 繰り返し設定（折りたたみ） */}
          <details className="border-b" open={recurring}>
            <summary
              className="flex items-center gap-2 px-5 py-2.5 cursor-pointer text-xs font-semibold hover:bg-muted/30 list-none"
              onClick={(e) => {
                e.preventDefault()
                setRecurring(!recurring)
              }}
            >
              <Repeat className="w-3.5 h-3.5 text-blue-500" />
              🔁 繰り返しタスクにする
              {recurring && <span className="text-[10px] text-blue-600 ml-1">ON</span>}
              <span className="text-muted-foreground ml-auto text-[10px]">▼</span>
            </summary>
            {recurring && (
              <div className="px-5 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">パターン</Label>
                    <select
                      className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
                      value={recurringPattern}
                      onChange={(e) => {
                        setRecurringPattern(e.target.value)
                        setRecurringDay("")
                        setRecurringWeek("")
                      }}
                    >
                      <option value="">選択してください</option>
                      <option value="daily">毎日</option>
                      <option value="weekly">毎週</option>
                      <option value="monthly_date">毎月（日付指定）</option>
                      <option value="monthly_weekday">毎月（曜日指定）</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px]">終了日（任意）</Label>
                    <Input type="date" className="mt-0.5 h-7 text-xs" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} />
                  </div>
                </div>
                {recurringPattern === "weekly" && (
                  <div>
                    <div className="flex gap-1 mb-1.5">
                      <button type="button" className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted" onClick={() => setRecurringDays([1, 2, 3, 4, 5])}>平日のみ</button>
                      <button type="button" className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted" onClick={() => setRecurringDays([0, 6])}>週末のみ</button>
                      <button type="button" className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted" onClick={() => setRecurringDays([0, 1, 2, 3, 4, 5, 6])}>毎日</button>
                      <button type="button" className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted" onClick={() => setRecurringDays([])}>クリア</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { v: 1, l: "月" }, { v: 2, l: "火" }, { v: 3, l: "水" },
                        { v: 4, l: "木" }, { v: 5, l: "金" }, { v: 6, l: "土" }, { v: 0, l: "日" },
                      ].map(({ v, l }) => {
                        const checked = recurringDays.includes(v)
                        return (
                          <label
                            key={v}
                            className={`text-xs px-2 py-0.5 border rounded cursor-pointer ${checked ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-900 dark:text-blue-100" : "bg-background"}`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) setRecurringDays([...recurringDays, v].sort())
                                else setRecurringDays(recurringDays.filter((d) => d !== v))
                              }}
                            />
                            {l}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
                {recurringPattern === "monthly_date" && (
                  <div>
                    <Label className="text-[10px]">日付</Label>
                    <select className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background" value={recurringDay} onChange={(e) => setRecurringDay(e.target.value)}>
                      <option value="">選択してください</option>
                      {Array.from({ length: 31 }, (_, i) => (<option key={i + 1} value={String(i + 1)}>{i + 1}日</option>))}
                    </select>
                  </div>
                )}
                {recurringPattern === "monthly_weekday" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">第何週</Label>
                      <select className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background" value={recurringWeek} onChange={(e) => setRecurringWeek(e.target.value)}>
                        <option value="">選択</option>
                        <option value="1">第1週</option><option value="2">第2週</option><option value="3">第3週</option><option value="4">第4週</option><option value="5">第5週</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[10px]">曜日</Label>
                      <select className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background" value={recurringDay} onChange={(e) => setRecurringDay(e.target.value)}>
                        <option value="">選択</option>
                        <option value="1">月曜日</option><option value="2">火曜日</option><option value="3">水曜日</option><option value="4">木曜日</option><option value="5">金曜日</option><option value="6">土曜日</option><option value="0">日曜日</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </details>

          {/* 📅 カレンダーにも登録（折りたたみ） */}
          <details className="border-b" open={addToCalendar}>
            <summary
              className="flex items-center gap-2 px-5 py-2.5 cursor-pointer text-xs font-semibold hover:bg-muted/30 list-none"
              onClick={(e) => {
                e.preventDefault()
                setAddToCalendar(!addToCalendar)
              }}
            >
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              📅 カレンダーにも登録
              {addToCalendar && <span className="text-[10px] text-blue-600 ml-1">ON</span>}
              <span className="text-muted-foreground ml-auto text-[10px]">▼</span>
            </summary>
            {addToCalendar && (
              <div className="px-5 pb-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">日付</Label>
                    <Input type="date" className="mt-0.5 h-7 text-xs" value={calendarDate} onChange={(e) => setCalendarDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px]">開始</Label>
                    <Input type="time" className="mt-0.5 h-7 text-xs" value={calendarStartTime} onChange={(e) => setCalendarStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px]">終了</Label>
                    <Input type="time" className="mt-0.5 h-7 text-xs" value={calendarEndTime} onChange={(e) => setCalendarEndTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">予定種別</Label>
                  <select className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background" value={calendarEventType} onChange={(e) => setCalendarEventType(e.target.value as typeof calendarEventType)}>
                    <option value="work">作業</option>
                    <option value="meeting">打ち合わせ</option>
                    <option value="outing">外出</option>
                    <option value="holiday">休み</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>
            )}
          </details>

          {/* ① 進捗（ステータス・優先度・担当者） */}
          <div className="px-5 py-3 border-b">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">① 進捗</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">ステータス</Label>
                <select
                  className={`w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 font-semibold ${TASK_STATUS_CONFIG[status].className}`}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                >
                  {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>{TASK_STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">優先度</Label>
                <select
                  className={`w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 font-semibold ${PRIORITY_CONFIG[priority].bgClassName}`}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
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
                    {assigneeIds.length === 0
                      ? <span className="text-muted-foreground">未設定</span>
                      : employees.filter((e) => assigneeIds.includes(e.id)).map((e) => e.name).join("、")}
                  </span>
                  <span className="text-muted-foreground text-[9px] shrink-0">▼</span>
                </button>
                {showAssigneeMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowAssigneeMenu(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-20 p-1 max-h-60 overflow-y-auto">
                      {employees.map((emp) => {
                        const checked = assigneeIds.includes(emp.id)
                        return (
                          <label
                            key={emp.id}
                            className={`flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted/50 rounded cursor-pointer ${checked ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleAssignee(emp.id)} className="cursor-pointer" />
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
          <div className="px-5 py-3 border-b">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">② スケジュール</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">期限</Label>
                <Input type="date" className="mt-0.5 h-7 text-xs" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">事前通知</Label>
                <select
                  className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
                  value={notifyMinutesBefore}
                  onChange={(e) => setNotifyMinutesBefore(Number(e.target.value))}
                >
                  <option value={0}>事前通知なし</option>
                  <option value={5}>5分前</option>
                  <option value={10}>10分前</option>
                  <option value={15}>15分前</option>
                  <option value={30}>30分前</option>
                  <option value={60}>1時間前</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">実行日時（LINE通知）</Label>
              <div className="grid grid-cols-2 gap-2 mt-0.5">
                <Input type="date" className="h-7 text-xs" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
                <Input type="time" className="h-7 text-xs" value={executionTime} onChange={(e) => setExecutionTime(e.target.value)} />
              </div>
              <p className="text-[9px] text-muted-foreground italic mt-1">日付なし＝毎日 / 日付あり＝1回のみ</p>
            </div>
          </div>

          {/* ③ 分類 */}
          <div className="px-5 py-3 border-b">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">③ 分類</p>
            <div>
              <Label className="text-[10px] text-muted-foreground">紐づく課題</Label>
              <select
                className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background"
                value={issueId}
                onChange={(e) => setIssueId(e.target.value)}
              >
                <option value="">なし</option>
                {issues.filter((i) => {
                  const [kind, id] = targetValue.split(":")
                  if (!targetValue || kind !== "proj") return true
                  return i.projectId === id
                }).map((i) => (
                  <option key={i.id} value={i.id}>{i.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ④ 連絡 */}
          <div className="px-5 py-3 border-b">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">④ 連絡</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">連絡先</Label>
                <select className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                  <option value="">なし</option>
                  {contacts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">取引先</Label>
                <select className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  <option value="">なし</option>
                  {partners.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">ツール</Label>
                <select className="w-full mt-0.5 text-xs border rounded-md px-1.5 py-1 cursor-pointer h-7 bg-background" value={tool} onChange={(e) => setTool(e.target.value)}>
                  <option value="">なし</option>
                  {(Object.keys(TOOL_CONFIG) as TicketTool[]).map((t) => (
                    <option key={t} value={t}>{TOOL_CONFIG[t].emoji} {TOOL_CONFIG[t].label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ⑤ チェックリスト（任意） */}
          <div className="px-5 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">⑤ チェックリスト（任意）</p>
            <div className="flex gap-1 mb-1.5">
              <select
                className="flex-1 h-7 text-xs border rounded-md px-1.5 bg-background"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">{checklistTemplates.length === 0 ? "テンプレートなし" : "テンプレートから追加"}</option>
                {checklistTemplates.map((tpl: { id: string; name: string }) => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                disabled={!selectedTemplateId}
                onClick={() => {
                  const tpl = checklistTemplates.find((t: { id: string }) => t.id === selectedTemplateId) as { items: { title: string }[] } | undefined
                  if (tpl) {
                    setChecklistItems((prev) => [...prev, ...tpl.items.map((i: { title: string }) => i.title)])
                    setSelectedTemplateId("")
                  }
                }}
              >
                追加
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <div className="space-y-0.5 mb-1.5">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const next = [...checklistItems]
                        next[i] = e.target.value
                        setChecklistItems(next)
                      }}
                      placeholder={`項目${i + 1}`}
                      className="h-6 text-xs"
                    />
                    <Button type="button" size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => setChecklistItems(checklistItems.filter((_, idx) => idx !== i))}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" size="sm" variant="outline" className="h-6 text-xs w-full" onClick={() => setChecklistItems([...checklistItems, ""])}>
              ＋ 項目を手入力で追加
            </Button>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-5 py-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>キャンセル</Button>
          <Button size="sm" onClick={handleCreate} disabled={!title.trim() || !targetValue || createTaskMutation.isPending || createScheduleEventMutation.isPending}>
            登録
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
