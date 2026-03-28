"use client"

import { useState, useMemo, useRef } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useSubscriptions, useUpdateSubscription } from "@/hooks/use-crm"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { SubscriptionDTO } from "@/types/dto"

const METHOD_LABELS: Record<string, string> = {
  memberpay: "メンバーペイ", robotpay: "ロボットペイ", paypal: "PayPal", univpay: "UnivaPay", other: "その他",
}
const STATUS_LABELS: Record<string, string> = { active: "有効", cancelled: "解約" }
const EXEMPT_LABELS: Record<string, string> = { "true": "免除", "false": "-" }

export function SubscriptionList() {
  const [statusFilter, setStatusFilter] = useState<string>("すべて")
  const [exemptFilter, setExemptFilter] = useState<string>("すべて")

  // Inline edit state
  type EditField = "paymentMethod" | "status" | "isExempt" | "paymentServiceId" | "endDate" | null
  const [editId, setEditId] = useState<string | null>(null)
  const [editField, setEditField] = useState<EditField>(null)
  const [editValue, setEditValue] = useState("")
  const selectOpenRef = useRef(false)

  const { data: subscriptions = [], isLoading } = useSubscriptions()
  const updateMutation = useUpdateSubscription()

  const filtered = useMemo(() => {
    return subscriptions.filter((s: SubscriptionDTO) => {
      if (statusFilter !== "すべて") {
        const statusMap: Record<string, string> = { "有効": "active", "解約": "cancelled" }
        if (s.status !== statusMap[statusFilter]) return false
      }
      if (exemptFilter === "免除のみ" && !s.isExempt) return false
      return true
    })
  }, [subscriptions, statusFilter, exemptFilter])

  // Inline edit functions
  const startEdit = (s: SubscriptionDTO, field: EditField) => {
    if (!field) return
    setEditId(s.id)
    setEditField(field)
    switch (field) {
      case "paymentMethod": setEditValue(s.paymentMethod); break
      case "status": setEditValue(s.status); break
      case "isExempt": setEditValue(s.isExempt ? "exempt" : "not_exempt"); break
      case "paymentServiceId": setEditValue(s.paymentServiceId ?? ""); break
      case "endDate": setEditValue(s.endDate ?? ""); break
    }
  }

  const cancelEdit = () => { setEditId(null); setEditField(null) }

  const saveEdit = () => {
    if (!editId || !editField) return
    const sub = subscriptions.find((s: SubscriptionDTO) => s.id === editId)
    if (!sub) { cancelEdit(); return }

    let oldVal: string
    switch (editField) {
      case "paymentServiceId": oldVal = sub.paymentServiceId ?? ""; break
      case "endDate": oldVal = sub.endDate ?? ""; break
      default: oldVal = ""; break
    }
    if (editValue === oldVal) { cancelEdit(); return }

    if (editField === "endDate") {
      updateMutation.mutate({ id: editId, data: { endDate: editValue || null } })
    } else {
      updateMutation.mutate({ id: editId, data: { [editField]: editValue } })
    }
    cancelEdit()
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit()
    if (e.key === "Escape") cancelEdit()
  }

  const handleSelectChange = (value: string) => {
    if (!editId || !editField) return
    if (editField === "isExempt") {
      updateMutation.mutate({ id: editId, data: { isExempt: value === "exempt" } })
    } else {
      updateMutation.mutate({ id: editId, data: { [editField]: value } })
    }
    cancelEdit()
  }

  const isEditing = (id: string, field: EditField) => editId === id && editField === field

  const InlineSelect = ({ id, field, value, items }: { id: string; field: EditField; value: string; items: { id: string; label: string }[] }) => (
    <Select
      defaultOpen
      value={value}
      onValueChange={(v) => handleSelectChange(v ?? value)}
      onOpenChange={(open) => {
        selectOpenRef.current = open
        if (!open) setTimeout(() => { if (!selectOpenRef.current) cancelEdit() }, 150)
      }}
    >
      <SelectTrigger className="h-7 text-sm">
        <SelectValue>{items.find(item => item.id === value)?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map(item => (
          <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (isLoading) return <div className="p-4 text-muted-foreground">読み込み中...</div>

  return (
    <div className="flex flex-col h-full">
      {/* フィルター */}
      <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "すべて")}>
          <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="すべて">全て</SelectItem>
            <SelectItem value="有効">有効</SelectItem>
            <SelectItem value="解約">解約</SelectItem>
          </SelectContent>
        </Select>
        <Select value={exemptFilter} onValueChange={(v) => setExemptFilter(v ?? "すべて")}>
          <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="すべて">全て</SelectItem>
            <SelectItem value="免除のみ">免除のみ</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length}件</span>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>顧客名</TableHead>
              <TableHead>コース</TableHead>
              <TableHead>サロン</TableHead>
              <TableHead>決済方法</TableHead>
              <TableHead>決済サービスID</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>免除</TableHead>
              <TableHead>Discordロール</TableHead>
              <TableHead>開始日</TableHead>
              <TableHead>終了日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s: SubscriptionDTO) => (
              <TableRow key={s.id}>
                <TableCell className="text-sm font-medium">{s.contactName}</TableCell>
                <TableCell className="text-sm">{s.courseName}</TableCell>
                <TableCell className="text-sm">{s.salonName}</TableCell>
                <TableCell onDoubleClick={() => startEdit(s, "paymentMethod")}>
                  {isEditing(s.id, "paymentMethod") ? (
                    <InlineSelect id={s.id} field="paymentMethod" value={editValue} items={[
                      { id: "memberpay", label: "メンバーペイ" },
                      { id: "robotpay", label: "ロボットペイ" },
                      { id: "paypal", label: "PayPal" },
                      { id: "univpay", label: "UnivaPay" },
                      { id: "other", label: "その他" },
                    ]} />
                  ) : (
                    <Badge variant="outline" className="text-xs">{METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm" onDoubleClick={() => startEdit(s, "paymentServiceId")}>
                  {isEditing(s.id, "paymentServiceId") ? (
                    <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleInputKeyDown} onBlur={saveEdit} className="h-7 text-sm" />
                  ) : (
                    <span className="cursor-text">{s.paymentServiceId || "-"}</span>
                  )}
                </TableCell>
                <TableCell onDoubleClick={() => startEdit(s, "status")}>
                  {isEditing(s.id, "status") ? (
                    <InlineSelect id={s.id} field="status" value={editValue} items={[
                      { id: "active", label: "有効" },
                      { id: "cancelled", label: "解約" },
                    ]} />
                  ) : (
                    <Badge variant="outline" className={cn("text-xs", s.status === "active" ? "border-emerald-300 text-emerald-700" : "border-red-300 text-red-700")}>
                      {STATUS_LABELS[s.status]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell onDoubleClick={() => startEdit(s, "isExempt")}>
                  {isEditing(s.id, "isExempt") ? (
                    <InlineSelect id={s.id} field="isExempt" value={editValue} items={[
                      { id: "exempt", label: "免除" },
                      { id: "not_exempt", label: "-" },
                    ]} />
                  ) : (
                    s.isExempt ? (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">免除</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )
                  )}
                </TableCell>
                <TableCell className="text-sm">{s.discordRoleAssigned ? s.discordRoleName : "-"}</TableCell>
                <TableCell className="text-sm">{formatDate(s.startDate)}</TableCell>
                <TableCell className="text-sm" onDoubleClick={() => startEdit(s, "endDate")}>
                  {isEditing(s.id, "endDate") ? (
                    <Input autoFocus type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleInputKeyDown} onBlur={saveEdit} className="h-7 text-sm" />
                  ) : (
                    <span className="cursor-text">{s.endDate ? formatDate(s.endDate) : "-"}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">サブスクリプションがありません</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
