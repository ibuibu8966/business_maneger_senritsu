"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  useCreateScheduleEvent,
  useUpdateScheduleEvent,
  useDeleteScheduleEvent,
  useUpdateEventParticipants,
} from "@/hooks/use-schedule"
import type { ScheduleEventDTO, EmployeeDTO } from "@/types/dto"
import { toast } from "sonner"
import { Trash2, Users, X } from "lucide-react"

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
  const [participantIds, setParticipantIds] = useState<string[]>([])

  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id

  const createMutation = useCreateScheduleEvent()
  const updateMutation = useUpdateScheduleEvent()
  const deleteMutation = useDeleteScheduleEvent()
  const updateParticipantsMutation = useUpdateEventParticipants()

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description)
      setAllDay(event.allDay)
      setEventType(event.eventType)
      setEmployeeId(event.employeeId)
      // 参加者情報があれば復元（自分以外）
      if (event.participants && event.participants.length > 0) {
        setParticipantIds(event.participants.map((p) => p.id))
      } else {
        setParticipantIds([event.employeeId])
      }
      if (event.allDay) {
        setStartAt(toDateOnly(event.startAt))
        // GCal終日仕様で endAt は翌日（exclusive）が保存されているため、表示時は1日引く
        const endDate = new Date(event.endAt.slice(0, 10))
        endDate.setDate(endDate.getDate() - 1)
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`
        setEndAt(endDateStr)
      } else {
        setStartAt(toDatetimeLocal(event.startAt))
        setEndAt(toDatetimeLocal(event.endAt))
      }
    } else {
      setTitle("")
      setDescription("")
      setAllDay(false)
      setEventType("meeting")
      const me = currentUserId && employees.find((e) => e.id === currentUserId)
      setEmployeeId(me ? me.id : "")
      setParticipantIds(me ? [me.id] : [])
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
  }, [event, defaultDate, employees, currentUserId])

  const toggleParticipant = (empId: string) => {
    setParticipantIds((prev) => {
      if (prev.includes(empId)) {
        // 最低1人は残す
        if (prev.length <= 1) return prev
        const next = prev.filter((id) => id !== empId)
        // employeeId（メイン担当）が外されたら先頭に切り替え
        if (empId === employeeId && next.length > 0) {
          setEmployeeId(next[0])
        }
        return next
      }
      return [...prev, empId]
    })
  }

  const handleSubmit = async () => {
    if (!title.trim() || !startAt || !endAt || participantIds.length === 0) {
      toast.error("必須項目を入力してください")
      return
    }

    const mainEmpId = participantIds.includes(employeeId) ? employeeId : participantIds[0]
    const additionalIds = participantIds.filter((id) => id !== mainEmpId)

    const startISO = allDay ? `${startAt}T00:00:00` : new Date(startAt).toISOString()
    const endISO = allDay ? `${endAt}T00:00:00` : new Date(endAt).toISOString()

    if (isEdit && event) {
      // 編集モード
      updateMutation.mutate(
        {
          id: event.id,
          data: { title, description, startAt: startISO, endAt: endISO, allDay, eventType, employeeId: mainEmpId },
        },
        {
          onSuccess: () => {
            // 参加者も更新
            if (participantIds.length > 0) {
              updateParticipantsMutation.mutate(
                { id: event.id, participantIds },
                {
                  onSuccess: () => { toast.success("予定を更新しました"); onClose() },
                  onError: () => toast.error("参加者の更新に失敗しました"),
                }
              )
            } else {
              toast.success("予定を更新しました")
              onClose()
            }
          },
          onError: () => toast.error("予定の更新に失敗しました"),
        }
      )
    } else {
      // 新規作成
      createMutation.mutate(
        {
          title,
          description,
          startAt: startISO,
          endAt: endISO,
          allDay,
          eventType,
          employeeId: mainEmpId,
          participantIds: additionalIds.length > 0 ? additionalIds : undefined,
        },
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

  const isPending = createMutation.isPending || updateMutation.isPending || updateParticipantsMutation.isPending

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

          {/* 参加者（複数選択） */}
          <div className="space-y-1.5">
            <Label>
              <Users className="w-3.5 h-3.5 inline mr-1" />
              参加者 *
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {participantIds.map((pid) => {
                const emp = employees.find((e) => e.id === pid)
                if (!emp) return null
                return (
                  <Badge
                    key={pid}
                    variant="secondary"
                    className="text-xs group/badge cursor-pointer"
                    style={{ borderLeft: `3px solid ${emp.color}` }}
                  >
                    {emp.name}
                    {participantIds.length > 1 && (
                      <button
                        className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/badge:opacity-100 transition-opacity"
                        onClick={() => toggleParticipant(pid)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                )
              })}
            </div>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) toggleParticipant(e.target.value)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:text-foreground [&>option]:bg-background [&>option]:text-foreground"
            >
              <option value="">参加者を追加...</option>
              {employees
                .filter((emp) => !participantIds.includes(emp.id))
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
            </select>
          </div>

          {/* 予定種別 */}
          <div className="space-y-1.5">
            <Label>予定種別</Label>
            <select
              value={eventType}
              onChange={(e) => { if (e.target.value) setEventType(e.target.value) }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:text-foreground [&>option]:bg-background [&>option]:text-foreground"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
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
              className="rounded border-gray-300 dark:border-gray-600"
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
