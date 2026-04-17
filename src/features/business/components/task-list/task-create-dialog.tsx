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
import { useCreateBusinessTask } from "@/hooks/use-business"

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
  const [projectId, setProjectId] = useState("")
  const [assigneeId, setAssigneeId] = useState("s1")
  const [deadline, setDeadline] = useState("")
  const [executionTime, setExecutionTime] = useState("09:00")
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(10)
  const [recurring, setRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState("")
  const [recurringDay, setRecurringDay] = useState("")
  const [recurringWeek, setRecurringWeek] = useState("")
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [contactId, setContactId] = useState("")
  const [partnerId, setPartnerId] = useState("")
  const [priority, setPriority] = useState("medium")
  const [tool, setTool] = useState("")
  const [issueId, setIssueId] = useState("")
  const createTaskMutation = useCreateBusinessTask()

  const handleCreate = () => {
    if (!title.trim() || !projectId) return
    const proj = projects.find((p) => p.id === projectId)
    const staff = employees.find((s) => s.id === assigneeId)
    createTaskMutation.mutate({
      projectId,
      projectName: proj?.name ?? "不明",
      title: title.trim(),
      detail: detail.trim(),
      assigneeId: assigneeId || null,
      assigneeName: staff?.name ?? null,
      deadline: deadline || null,
      status: "todo",
      memo: "",
      recurring,
      recurringPattern: recurring && recurringPattern ? recurringPattern : null,
      recurringDay: recurring && recurringDay !== "" ? Number(recurringDay) : null,
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
    onClose()
    setTitle("")
    setDetail("")
    setProjectId("")
    setDeadline("")
    setExecutionTime("09:00")
    setNotifyMinutesBefore(10)
    setRecurring(false)
    setRecurringPattern("")
    setRecurringDay("")
    setRecurringWeek("")
    setRecurringEndDate("")
    setContactId("")
    setPartnerId("")
    setPriority("medium")
    setTool("")
    setIssueId("")
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
            <Label className="text-xs">プロジェクト *</Label>
            <select
              className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">選択してください</option>
              {businesses.map((biz) => {
                const projs = projects.filter((p) => p.businessId === biz.id)
                if (projs.length === 0) return null
                return (
                  <optgroup key={biz.id} label={biz.name}>
                    {projs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">担当者</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                {employees.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">期限</Label>
              <Input type="date" className="mt-1 h-8 text-sm" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
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
              {issues.filter((i) => !projectId || i.projectId === projectId).map((i) => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </select>
          </div>
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
                  <Label className="text-xs">曜日</Label>
                  <select
                    className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                    value={recurringDay}
                    onChange={(e) => setRecurringDay(e.target.value)}
                  >
                    <option value="">選択してください</option>
                    <option value="1">月曜日</option>
                    <option value="2">火曜日</option>
                    <option value="3">水曜日</option>
                    <option value="4">木曜日</option>
                    <option value="5">金曜日</option>
                    <option value="6">土曜日</option>
                    <option value="0">日曜日</option>
                  </select>
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
          <Button size="sm" onClick={handleCreate} disabled={!title.trim() || !projectId || createTaskMutation.isPending}>登録</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
