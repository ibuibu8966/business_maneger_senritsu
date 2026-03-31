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
  useCreateEmployee,
  useUpdateEmployee,
} from "@/hooks/use-schedule"
import type { EmployeeDTO } from "@/types/dto"
import { toast } from "sonner"

const COLORS = [
  { value: "#3B82F6", label: "青" },
  { value: "#EF4444", label: "赤" },
  { value: "#22C55E", label: "緑" },
  { value: "#F59E0B", label: "黄" },
  { value: "#8B5CF6", label: "紫" },
  { value: "#EC4899", label: "ピンク" },
  { value: "#06B6D4", label: "シアン" },
  { value: "#F97316", label: "オレンジ" },
]

const ROLE_OPTIONS = [
  { value: "master_admin", label: "マスター管理者" },
  { value: "admin", label: "管理者" },
  { value: "employee", label: "従業員" },
]

interface Props {
  open: boolean
  onClose: () => void
  employee: EmployeeDTO | null
  myRole?: string
}

export function EmployeeModal({ open, onClose, employee, myRole }: Props) {
  const isEdit = !!employee

  const [name, setName] = useState("")
  const [color, setColor] = useState("#3B82F6")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("employee")
  const [googleCalId, setGoogleCalId] = useState("")
  const [coreTimeStart, setCoreTimeStart] = useState("")
  const [coreTimeEnd, setCoreTimeEnd] = useState("")

  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()

  useEffect(() => {
    if (employee) {
      setName(employee.name)
      setColor(employee.color)
      setEmail(employee.email ?? "")
      setPassword("")
      setRole(employee.role)
      setGoogleCalId(employee.googleCalId ?? "")
      setCoreTimeStart((employee.coreTimeStart ?? "").replace("24:00", "23:59"))
      setCoreTimeEnd((employee.coreTimeEnd ?? "").replace("24:00", "23:59"))
    } else {
      setName("")
      setColor("#3B82F6")
      setEmail("")
      setPassword("")
      setRole("employee")
      setGoogleCalId("")
      setCoreTimeStart("")
      setCoreTimeEnd("")
    }
  }, [employee, open])

  // admin は master_admin を選択できない
  const availableRoles = ROLE_OPTIONS.filter((r) => {
    if (r.value === "master_admin" && myRole !== "master_admin") return false
    return true
  })

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("名前を入力してください")
      return
    }

    if (isEdit && employee) {
      const data: Record<string, unknown> = {
        name,
        color,
        role,
        email: email || null,
        googleCalId: googleCalId || null,
        coreTimeStart: coreTimeStart || null,
        coreTimeEnd: coreTimeEnd || null,
      }
      if (password) data.password = password

      updateMutation.mutate(
        { id: employee.id, data },
        {
          onSuccess: () => { toast.success("従業員を更新しました"); onClose() },
          onError: () => toast.error("更新に失敗しました"),
        }
      )
    } else {
      const data: Record<string, unknown> = { name, color, role }
      if (email) data.email = email
      if (password) data.password = password
      if (googleCalId) data.googleCalId = googleCalId
      if (coreTimeStart) data.coreTimeStart = coreTimeStart
      if (coreTimeEnd) data.coreTimeEnd = coreTimeEnd

      createMutation.mutate(data, {
        onSuccess: () => { toast.success("従業員を登録しました"); onClose() },
        onError: () => toast.error("登録に失敗しました"),
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "従業員を編集" : "従業員を追加"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 名前 */}
          <div className="space-y-1.5">
            <Label htmlFor="emp-name">名前 *</Label>
            <Input
              id="emp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 野田"
            />
          </div>

          {/* 色 */}
          <div className="space-y-1.5">
            <Label>カレンダー表示色</Label>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <select
                value={color}
                onChange={(e) => { if (e.target.value) setColor(e.target.value) }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {COLORS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ロール */}
          <div className="space-y-1.5">
            <Label>ロール</Label>
            <select
              value={role}
              onChange={(e) => { if (e.target.value) setRole(e.target.value) }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* メール */}
          <div className="space-y-1.5">
            <Label htmlFor="emp-email">メールアドレス（ログイン用）</Label>
            <Input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@senritsu.com"
            />
          </div>

          {/* パスワード */}
          <div className="space-y-1.5">
            <Label htmlFor="emp-password">
              パスワード{isEdit ? "（変更する場合のみ入力）" : ""}
            </Label>
            <Input
              id="emp-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "変更なしなら空欄" : "6文字以上"}
            />
          </div>

          {/* GoogleカレンダーID */}
          <div className="space-y-1.5">
            <Label htmlFor="emp-gcal">GoogleカレンダーID</Label>
            <Input
              id="emp-gcal"
              value={googleCalId}
              onChange={(e) => setGoogleCalId(e.target.value)}
              placeholder="例: senritsu0201@gmail.com"
            />
          </div>

          {/* コアタイム */}
          <div className="space-y-1.5">
            <Label>コアタイム</Label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={coreTimeStart}
                onChange={(e) => setCoreTimeStart(e.target.value)}
                className="w-32 h-8 text-sm"
              />
              <span className="text-sm text-muted-foreground">〜</span>
              <Input
                type="time"
                value={coreTimeEnd}
                onChange={(e) => setCoreTimeEnd(e.target.value)}
                className="w-32 h-8 text-sm"
              />
            </div>
          </div>

          {/* アクション */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "保存中..." : isEdit ? "更新" : "登録"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
