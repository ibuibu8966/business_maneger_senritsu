"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useCreateScheduleEvent,
  useUpdateScheduleEvent,
  useDeleteScheduleEvent,
} from "@/hooks/use-schedule"
import type { ScheduleEventDTO, EmployeeDTO } from "@/types/dto"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

const EVENT_TYPES = [
  { value: "meeting", label: "打ち合わせ" },
  { value: "holiday", label: "休み" },
  { value: "outing", label: "外出" },
  { value: "work", label: "作業" },
  { value: "other", label: "その他" },
]

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function toDateOnly(iso: string) {
  return iso.split("T")[0]
}

interface Props {
  open: boolean
  onClose: () => void
  event: ScheduleEventDTO | null
  defaultDate: string | null
  employees: EmployeeDTO[]
}

export function EventModal({ open, onClose, event, defaultDate, employees }: Props) {
  const isEdit = !!event

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [eventType, setEventType] = useState("meeting")
  const [employeeId, setEmployeeId] = useState("")

  const createMutation = useCreateScheduleEvent()
  const updateMutation = useUpdateScheduleEvent()
  const deleteMutation = useDeleteScheduleEvent()

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description)
      setAllDay(event.allDay)
      setEventType(event.eventType)
      setEmployeeId(event.employeeId)
      if (event.allDay) {
        setStartAt(toDateOnly(event.startAt))
        setEndAt(toDateOnly(event.endAt))
      } else {
        setStartAt(toDatetimeLocal(event.startAt))
        setEndAt(toDatetimeLocal(event.endAt))
      }
    } else {
      setTitle("")
      setDescription("")
      setAllDay(false)
      setEventType("meeting")
      setEmployeeId(employees[0]?.id ?? "")
      if (defaultDate) {
        if (defaultDate.includes("T")) {
          setStartAt(toDatetimeLocal(defaultDate))
          const end = new Date(defaultDate)
          end.setHours(end.getHours() + 1)
          setEndAt(toDatetimeLocal(end.toISOString()))
        } else {
          const start = `${defaultDate}T09:00`
          const end = `${defaultDate}T10:00`
          setStartAt(start)
          setEndAt(end)
        }
      }
    }
  }, [event, defaultDate, employees])

  const handleSubmit = async () => {
    if (!title.trim() || !startAt || !endAt || !employeeId) {
      toast.error("必須項目を入力してください")
      return
    }

    // 終日イベントはUTC変換すると日付がズレるので、日付文字列をそのまま送る
    const startISO = allDay ? `${startAt}T00:00:00` : new Date(startAt).toISOString()
    const endISO = allDay ? `${endAt}T23:59:59` : new Date(endAt).toISOString()

    if (isEdit && event) {
      updateMutation.mutate(
        {
          id: event.id,
          data: { title, description, startAt: startISO, endAt: endISO, allDay, eventType, employeeId },
        },
        {
          onSuccess: () => { toast.success("予定を更新しました"); onClose() },
          onError: () => toast.error("予定の更新に失敗しました"),
        }
      )
    } else {
      createMutation.mutate(
        { title, description, startAt: startISO, endAt: endISO, allDay, eventType, employeeId },
        {
          onSuccess: () => { toast.success("予定を登録しました"); onClose() },
          onError: () => toast.error("予定の登録に失敗しました"),
        }
      )
    }
  }

  const handleDelete = () => {
    if (!event) return
    deleteMutation.mutate(event.id, {
      onSuccess: () => { toast.success("予定を削除しました"); onClose() },
      onError: () => toast.error("予定の削除に失敗しました"),
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "予定を編集" : "予定を追加"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* タイトル */}
          <div className="space-y-1.5">
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="打ち合わせ、休み など"
            />
          </div>

          {/* 従業員 */}
          <div className="space-y-1.5">
            <Label>担当者 *</Label>
            <Select value={employeeId} onValueChange={(v) => { if (v) setEmployeeId(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください">
                  {employeeId ? employees.find((e) => e.id === employeeId)?.name : "選択してください"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: emp.color }} />
                      {emp.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 予定種別 */}
          <div className="space-y-1.5">
            <Label>予定種別</Label>
            <Select value={eventType} onValueChange={(v) => { if (v) setEventType(v) }}>
              <SelectTrigger>
                <SelectValue>
                  {EVENT_TYPES.find((t) => t.value === eventType)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 終日トグル */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => {
                setAllDay(e.target.checked)
                if (e.target.checked && startAt) {
                  setStartAt(startAt.split("T")[0])
                  setEndAt(endAt.split("T")[0])
                } else if (!e.target.checked && startAt) {
                  setStartAt(`${startAt}T09:00`)
                  setEndAt(`${endAt || startAt}T10:00`)
                }
              }}
              className="rounded border-gray-300"
            />
            <Label htmlFor="allDay" className="text-sm">終日</Label>
          </div>

          {/* 日時 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startAt">開始 *</Label>
              <Input
                id="startAt"
                type={allDay ? "date" : "datetime-local"}
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endAt">終了 *</Label>
              <Input
                id="endAt"
                type={allDay ? "date" : "datetime-local"}
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          {/* メモ */}
          <div className="space-y-1.5">
            <Label htmlFor="description">メモ</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="備考など"
            />
          </div>

          {/* アクション */}
          <div className="flex justify-between pt-2">
            {isEdit ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                削除
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? "保存中..." : isEdit ? "更新" : "登録"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
