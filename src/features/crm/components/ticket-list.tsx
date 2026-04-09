"use client"

import { useState, useMemo } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Archive, ArchiveRestore } from "lucide-react"
import type { TicketDTO } from "@/types/dto"
import { useTickets, useCreateTicket, useUpdateTicket, useContacts } from "@/hooks/use-crm"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

const TOOL_LABELS: Record<string, string> = {
  line: "LINE", telegram: "Telegram", discord: "Discord",
  phone: "電話", zoom: "Zoom", in_person: "対面",
}
const PRIORITY_LABELS: Record<string, string> = { high: "高", medium: "中", low: "低" }
const STATUS_LABELS: Record<string, string> = { open: "未着手", waiting: "確認待ち", in_progress: "対応中", completed: "完了" }

const STATUS_TO_API: Record<string, string> = {
  "未着手": "open", "確認待ち": "waiting", "対応中": "in_progress", "完了": "completed",
}
const PRIORITY_TO_API: Record<string, string> = {
  "高": "high", "中": "medium", "低": "low",
}
const TOOL_TO_API: Record<string, string> = {
  "電話": "phone", "対面": "in_person",
}

export function TicketList() {
  const [statusFilter, setStatusFilter] = useState<string>("全ステータス")
  const [priorityFilter, setPriorityFilter] = useState<string>("全優先度")
  const [showArchived, setShowArchived] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // Inline edit state
  type EditField = "title" | "tool" | "priority" | "status" | "dueDate" | "content" | null
  const [editId, setEditId] = useState<string | null>(null)
  const [editField, setEditField] = useState<EditField>(null)
  const [editValue, setEditValue] = useState("")

  const { data: tickets = [], isLoading } = useTickets({ isArchived: showArchived ? true : undefined })
  const { data: contacts = [] } = useContacts()
  const createMutation = useCreateTicket()
  const updateMutation = useUpdateTicket()

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (!showArchived && t.isArchived) return false
      if (showArchived && !t.isArchived) return false
      if (statusFilter !== "全ステータス" && t.status !== (STATUS_TO_API[statusFilter] ?? statusFilter)) return false
      if (priorityFilter !== "全優先度" && t.priority !== (PRIORITY_TO_API[priorityFilter] ?? priorityFilter)) return false
      return true
    })
  }, [tickets, statusFilter, priorityFilter, showArchived])

  const handleSave = (data: Record<string, unknown>) => {
    createMutation.mutate(data)
    setModalOpen(false)
  }

  const handleArchive = (t: TicketDTO) => {
    updateMutation.mutate({ id: t.id, data: { isArchived: !t.isArchived } })
  }

  // Inline edit functions
  const startEdit = (t: TicketDTO, field: EditField) => {
    if (!field) return
    setEditId(t.id)
    setEditField(field)
    switch (field) {
      case "title": setEditValue(t.title); break
      case "tool": setEditValue(t.tool); break
      case "priority": setEditValue(t.priority); break
      case "status": setEditValue(t.status); break
      case "dueDate": setEditValue(t.dueDate ?? ""); break
      case "content": setEditValue(t.content ?? ""); break
    }
  }

  const cancelEdit = () => { setEditId(null); setEditField(null) }

  const saveEdit = () => {
    if (!editId || !editField) return
    const tx = tickets.find(t => t.id === editId)
    if (!tx) { cancelEdit(); return }
    const oldVal = tx[editField] ?? ""
    if (editValue === oldVal) { cancelEdit(); return }
    updateMutation.mutate({ id: editId, data: { [editField]: editField === "dueDate" && !editValue ? null : editValue } })
    cancelEdit()
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) saveEdit()
    if (e.key === "Escape") cancelEdit()
  }

  const handleSelectChange = (value: string) => {
    if (!editId || !editField) return
    updateMutation.mutate({ id: editId, data: { [editField]: value } })
    cancelEdit()
  }

  const isEditing = (id: string, field: EditField) => editId === id && editField === field

  const InlineSelect = ({ id, field, value, items }: { id: string; field: EditField; value: string; items: { id: string; label: string }[] }) => (
    <select
      autoFocus
      value={value}
      onChange={(e) => handleSelectChange(e.target.value || value)}
      onBlur={() => cancelEdit()}
      className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {items.map(item => (
        <option key={item.id} value={item.id}>{item.label}</option>
      ))}
    </select>
  )

  if (isLoading) return <div className="p-4 text-muted-foreground">読み込み中...</div>

  return (
    <div className="flex flex-col h-full">
      {/* フィルター */}
      <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value || "全ステータス")}
          className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="全ステータス">全ステータス</option>
          <option value="未着手">未着手</option>
          <option value="確認待ち">確認待ち</option>
          <option value="対応中">対応中</option>
          <option value="完了">完了</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value || "全優先度")}
          className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="全優先度">全優先度</option>
          <option value="高">高</option>
          <option value="中">中</option>
          <option value="低">低</option>
        </select>
        <Button variant={showArchived ? "secondary" : "ghost"} size="sm" onClick={() => setShowArchived(!showArchived)} className="text-xs">
          <Archive className="h-3.5 w-3.5 mr-1" />{showArchived ? "アーカイブ済み" : "アーカイブ表示"}
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length}件</span>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />新規チケット
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>内容</TableHead>
              <TableHead>連絡先</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>ツール</TableHead>
              <TableHead>優先度</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>期限</TableHead>
              <TableHead>更新日</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow
                key={t.id}
                className={cn(t.isArchived && "opacity-50")}
              >
                <TableCell className="text-sm font-medium" onDoubleClick={() => startEdit(t, "title")}>
                  {isEditing(t.id, "title") ? (
                    <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleInputKeyDown} onBlur={saveEdit} className="h-7 text-sm" />
                  ) : (
                    <span className="cursor-text">{t.title}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm max-w-[200px] truncate" onDoubleClick={() => startEdit(t, "content")}>
                  {isEditing(t.id, "content") ? (
                    <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleInputKeyDown} onBlur={saveEdit} className="h-7 text-sm" />
                  ) : (
                    <span className="cursor-text">{t.content || "-"}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{t.contactName ?? t.partnerName ?? "-"}</TableCell>
                <TableCell className="text-sm">{t.assigneeName}</TableCell>
                <TableCell onDoubleClick={() => startEdit(t, "tool")}>
                  {isEditing(t.id, "tool") ? (
                    <InlineSelect id={t.id} field="tool" value={editValue} items={[
                      { id: "line", label: "LINE" },
                      { id: "telegram", label: "Telegram" },
                      { id: "discord", label: "Discord" },
                      { id: "phone", label: "電話" },
                      { id: "zoom", label: "Zoom" },
                      { id: "in_person", label: "対面" },
                    ]} />
                  ) : (
                    <Badge variant="outline" className="text-xs">{TOOL_LABELS[t.tool] ?? t.tool}</Badge>
                  )}
                </TableCell>
                <TableCell onDoubleClick={() => startEdit(t, "priority")}>
                  {isEditing(t.id, "priority") ? (
                    <InlineSelect id={t.id} field="priority" value={editValue} items={[
                      { id: "high", label: "高" },
                      { id: "medium", label: "中" },
                      { id: "low", label: "低" },
                    ]} />
                  ) : (
                    <Badge variant={t.priority === "high" ? "destructive" : t.priority === "medium" ? "default" : "secondary"} className="text-xs">
                      {PRIORITY_LABELS[t.priority]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell onDoubleClick={() => startEdit(t, "status")}>
                  {isEditing(t.id, "status") ? (
                    <InlineSelect id={t.id} field="status" value={editValue} items={[
                      { id: "open", label: "未着手" },
                      { id: "waiting", label: "確認待ち" },
                      { id: "in_progress", label: "対応中" },
                      { id: "completed", label: "完了" },
                    ]} />
                  ) : (
                    <Badge variant={t.status === "completed" ? "secondary" : t.status === "in_progress" ? "default" : t.status === "waiting" ? "default" : "outline"} className={cn("text-xs", t.status === "waiting" && "bg-yellow-500 hover:bg-yellow-600")}>
                      {STATUS_LABELS[t.status]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm" onDoubleClick={() => startEdit(t, "dueDate")}>
                  {isEditing(t.id, "dueDate") ? (
                    <Input autoFocus type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleInputKeyDown} onBlur={saveEdit} className="h-7 text-sm" />
                  ) : (
                    <span className="cursor-text">{t.dueDate ? formatDate(t.dueDate) : "-"}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(t.updatedAt.split("T")[0])}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleArchive(t) }}>
                    {t.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">チケットがありません</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 新規作成ダイアログ */}
      <TicketModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        ticket={null}
        contacts={contacts}
        onSave={handleSave}
      />
    </div>
  )
}

function TicketModal({
  open, onOpenChange, ticket, contacts, onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: TicketDTO | null
  contacts: { id: string; name: string }[]
  onSave: (data: Record<string, unknown>) => void
}) {
  const [title, setTitle] = useState("")
  const [contactId, setContactId] = useState("")
  const [tool, setTool] = useState("LINE")
  const [priority, setPriority] = useState("中")
  const [status, setStatus] = useState("未着手")
  const [content, setContent] = useState("")
  const [dueDate, setDueDate] = useState("")

  const handleOpenChange = (open: boolean) => {
    if (open && ticket) {
      setTitle(ticket.title)
      setContactId(ticket.contactId ?? "")
      setTool(TOOL_LABELS[ticket.tool] ?? ticket.tool)
      setPriority(PRIORITY_LABELS[ticket.priority] ?? ticket.priority)
      setStatus(STATUS_LABELS[ticket.status] ?? ticket.status)
      setDueDate(ticket.dueDate ?? "")
    } else if (open) {
      setTitle(""); setContactId(""); setTool("LINE"); setPriority("中"); setStatus("未着手"); setContent(""); setDueDate("")
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ticket ? "チケット編集" : "新規チケット"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">タイトル *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">連絡先 *</Label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">選択...</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">ツール</Label>
              <select
                value={tool}
                onChange={(e) => setTool(e.target.value || "LINE")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="LINE">LINE</option>
                <option value="Telegram">Telegram</option>
                <option value="Discord">Discord</option>
                <option value="電話">電話</option>
                <option value="Zoom">Zoom</option>
                <option value="対面">対面</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">優先度</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value || "中")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </div>
          </div>
          {ticket && (
            <div>
              <Label className="text-xs">ステータス</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value || "未着手")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="未着手">未着手</option>
                <option value="確認待ち">確認待ち</option>
                <option value="対応中">対応中</option>
                <option value="完了">完了</option>
              </select>
            </div>
          )}
          <div>
            <Label className="text-xs">内容</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="チケットの内容..." className="text-sm min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">期限</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-sm" />
          </div>
          <Button onClick={() => onSave({ title, contactId, tool: TOOL_TO_API[tool] ?? tool.toLowerCase(), priority: PRIORITY_TO_API[priority] ?? priority, status: STATUS_TO_API[status] ?? status, content, dueDate: dueDate || null })} disabled={!title || !contactId}>
            {ticket ? "更新" : "登録"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
