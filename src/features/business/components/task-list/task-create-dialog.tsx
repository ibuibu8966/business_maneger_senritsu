"use client"

import { useState } from "react"
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
import { PRIORITY_CONFIG, type ProjectNode } from "../mock-data"
import { useCreateBusinessTask, useChecklistTemplates, useAddTaskChecklistItem } from "@/hooks/use-business"
import { useCreateScheduleEvent } from "@/hooks/use-schedule"
import { toast } from "sonner"

/**
 * タスク登録ダイアログ
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
  // 紐づけ先: "biz:xxx"（事業直下）or "proj:xxx"（プロジェクト配下）
  const [targetValue, setTargetValue] = useState("")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [deadline, setDeadline] = useState("")
  const [executionTime, setExecutionTime] = useState("")
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(0)
  const [recurring, setRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState("")
  const [recurringDay, setRecurringDay] = useState("")
  const [recurringDays, setRecurringDays] = useState<number[]>([])
  const [recurringWeek, setRecurringWeek] = useState("")
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [contactId, setContactId] = useState("")
  const [partnerId, setPartnerId] = useState("")
  const [priority, setPriority] = useState("medium")
  const [status, setStatus] = useState<"todo" | "in-progress" | "waiting" | "done">("todo")
  const [tool, setTool] = useState("")
  const [issueId, setIssueId] = useState("")
  const [addToCalendar, setAddToCalendar] = useState(false)
  const [calendarDate, setCalendarDate] = useState("")
  const [calendarStartTime, setCalendarStartTime] = useState("09:00")
  const [calendarEndTime, setCalendarEndTime] = useState("10:00")
  const [calendarEventType, setCalendarEventType] = useState<"meeting" | "holiday" | "outing" | "work" | "other">("work")
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
        executionTime: executionTime || null,
        notifyEnabled: notifyMinutesBefore !== 0,
        notifyMinutesBefore: notifyMinutesBefore === 0 ? 0 : notifyMinutesBefore,
        issueId: issueId || null,
      })

      // チェックリスト項目を一括作成（空白除く）
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>タスクを登録</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">タイトル *</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タスク名を入力" autoFocus />
          </div>
          <div>
            <Label className="text-xs">紐づけ先 *</Label>
            <select
              className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
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
            <Label className="text-xs">詳細</Label>
            <Textarea className="mt-1 text-sm min-h-[50px]" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="タスクの詳細（任意）" />
          </div>
          <div>
            <Label className="text-xs">担当者（複数選択可）</Label>
            <div className="mt-1 flex flex-wrap gap-2 p-2 border rounded-md bg-background">
              {employees.map((s) => {
                const checked = assigneeIds.includes(s.id)
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-1 text-xs px-2 py-1 border rounded cursor-pointer ${checked ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100" : "bg-background"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setAssigneeIds([...assigneeIds, s.id])
                        else setAssigneeIds(assigneeIds.filter((id) => id !== s.id))
                      }}
                    />
                    {s.name}
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs">期限</Label>
            <Input type="date" className="mt-1 h-8 text-sm" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">実行時刻（LINE通知の対象）</Label>
              <Input
                type="time"
                className="mt-1 h-8 text-sm w-[120px]"
                value={executionTime}
                onChange={(e) => setExecutionTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">事前通知</Label>
              <select
                className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                value={notifyMinutesBefore}
                onChange={(e) => setNotifyMinutesBefore(Number(e.target.value))}
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">連絡先</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">なし</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">取引先</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                <option value="">なし</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">優先度</Label>
              <select className={`w-full mt-1 text-sm border rounded-md p-1.5 cursor-pointer ${PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.bgClassName ?? "bg-background"}`} value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="highest">最高</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">ステータス</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="todo">未着手</option>
                <option value="in-progress">進行中</option>
                <option value="waiting">確認待ち</option>
                <option value="done">完了</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">連絡ツール</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer" value={tool} onChange={(e) => setTool(e.target.value)}>
                <option value="">なし</option>
                <option value="LINE">LINE</option>
                <option value="TELEGRAM">Telegram</option>
                <option value="DISCORD">Discord</option>
                <option value="PHONE">電話</option>
                <option value="ZOOM">Zoom</option>
                <option value="IN_PERSON">対面</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">紐づく課題</Label>
            <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer" value={issueId} onChange={(e) => setIssueId(e.target.value)}>
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
          <div>
            <Label className="text-xs">チェックリスト（任意）</Label>
            {checklistTemplates.length > 0 && (
              <div className="flex gap-1 mt-1">
                <select
                  className="flex-1 text-xs border rounded-md p-1.5 bg-background"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">テンプレートから選択（任意）</option>
                  {checklistTemplates.map((tpl: { id: string; name: string }) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
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
            )}
            <div className="space-y-1 mt-1">
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
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setChecklistItems(checklistItems.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs w-full"
                onClick={() => setChecklistItems([...checklistItems, ""])}
              >
                ＋ 項目追加
              </Button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={addToCalendar} onChange={(e) => setAddToCalendar(e.target.checked)} className="rounded" />
            カレンダーにも登録
          </label>
          {addToCalendar && (
            <div className="space-y-2 pl-4 border-l-2 border-green-200">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">日付</Label>
                  <Input
                    type="date"
                    className="mt-1 h-8 text-sm"
                    value={calendarDate}
                    onChange={(e) => setCalendarDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">開始</Label>
                  <Input
                    type="time"
                    className="mt-1 h-8 text-sm"
                    value={calendarStartTime}
                    onChange={(e) => setCalendarStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">終了</Label>
                  <Input
                    type="time"
                    className="mt-1 h-8 text-sm"
                    value={calendarEndTime}
                    onChange={(e) => setCalendarEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">予定種別</Label>
                <select
                  className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                  value={calendarEventType}
                  onChange={(e) => setCalendarEventType(e.target.value as typeof calendarEventType)}
                >
                  <option value="work">作業</option>
                  <option value="meeting">打ち合わせ</option>
                  <option value="outing">外出</option>
                  <option value="holiday">休み</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="rounded" />
            繰り返しタスク
          </label>
          {recurring && (
            <div className="space-y-2 pl-4 border-l-2 border-blue-200">
              <div>
                <Label className="text-xs">繰り返しパターン</Label>
                <select
                  className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
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
              {recurringPattern === "weekly" && (
                <div>
                  <Label className="text-xs">曜日（複数選択可）</Label>
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted"
                      onClick={() => setRecurringDays([1, 2, 3, 4, 5])}
                    >
                      平日のみ
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted"
                      onClick={() => setRecurringDays([0, 6])}
                    >
                      週末のみ
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted"
                      onClick={() => setRecurringDays([0, 1, 2, 3, 4, 5, 6])}
                    >
                      毎日
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-muted"
                      onClick={() => setRecurringDays([])}
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
                      const checked = recurringDays.includes(v)
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
                  <Label className="text-xs">日付</Label>
                  <select
                    className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                    value={recurringDay}
                    onChange={(e) => setRecurringDay(e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>{i + 1}日</option>
                    ))}
                  </select>
                </div>
              )}
              {recurringPattern === "monthly_weekday" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">第何週</Label>
                    <select
                      className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                      value={recurringWeek}
                      onChange={(e) => setRecurringWeek(e.target.value)}
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
                      className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                      value={recurringDay}
                      onChange={(e) => setRecurringDay(e.target.value)}
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
              <div>
                <Label className="text-xs">終了日（任意）</Label>
                <Input type="date" className="mt-1 h-8 text-sm" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>キャンセル</Button>
          <Button size="sm" onClick={handleCreate} disabled={!title.trim() || !targetValue || createTaskMutation.isPending || createScheduleEventMutation.isPending}>登録</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
