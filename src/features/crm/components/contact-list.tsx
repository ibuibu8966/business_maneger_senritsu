"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { Plus, Search, Archive, ArchiveRestore } from "lucide-react"
import type { ContactDTO } from "@/types/dto"
import { useContacts, useCreateContact, useUpdateContact, useCrmTags, useCreateCrmTag } from "@/hooks/use-crm"
import { cn } from "@/lib/utils"
import { TagSelect } from "@/features/lending/components/tag-select"
import { EditableCell } from "@/components/ui/editable-cell"
import { toast } from "sonner"

const TYPE_TO_API: Record<string, string> = {
  "サロン生": "salon_member",
  "取引先連絡先": "partner_contact",
}

export function ContactList() {
  const [typeFilter, setTypeFilter] = useState<string>("すべて")
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  const { data: contacts = [], isLoading } = useContacts({
    isArchived: showArchived ? true : undefined,
  })
  const createMutation = useCreateContact()
  const updateMutation = useUpdateContact()
  const { data: crmTags = [] } = useCrmTags()
  const createTagMutation = useCreateCrmTag()

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (typeFilter !== "すべて" && c.type !== TYPE_TO_API[typeFilter]) return false
      if (!showArchived && c.isArchived) return false
      if (showArchived && !c.isArchived) return false
      if (search) {
        const hit =
          c.name.includes(search) ||
          (c.realName ?? "").includes(search) ||
          (c.nicknames ?? []).some((n) => n.includes(search)) ||
          c.email.includes(search) ||
          c.phone.includes(search)
        if (!hit) return false
      }
      return true
    })
  }, [contacts, typeFilter, showArchived, search])

  const handleSave = (data: Record<string, unknown>) => {
    createMutation.mutate(data)
    setModalOpen(false)
  }

  const handleArchive = (c: ContactDTO) => {
    updateMutation.mutate({ id: c.id, data: { isArchived: !c.isArchived } })
  }

  const saveInline = (id: string, field: string, value: string | string[]) => {
    updateMutation.mutate(
      { id, data: { [field]: value } },
      {
        onSuccess: () => toast.success("保存しました"),
        onError: () => toast.error("保存に失敗しました"),
      },
    )
  }

  if (isLoading) return <div className="p-4 text-muted-foreground">読み込み中...</div>

  return (
    <div className="flex flex-col h-full">
      {/* フィルター */}
      <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="名前・本名・ニックネーム・メール・電話で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pl-8 w-72"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value || "すべて")}
          className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="すべて">すべて</option>
          <option value="サロン生">サロン生</option>
          <option value="取引先連絡先">取引先連絡先</option>
        </select>
        <Button variant={showArchived ? "secondary" : "ghost"} size="sm" onClick={() => setShowArchived(!showArchived)} className="text-xs">
          <Archive className="h-3.5 w-3.5 mr-1" />{showArchived ? "アーカイブ済み" : "アーカイブ表示"}
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length}件</span>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />新規登録
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>本名</TableHead>
              <TableHead>ニックネーム</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>職業</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>電話</TableHead>
              <TableHead>LINE</TableHead>
              <TableHead>Discord</TableHead>
              <TableHead>最終面談</TableHead>
              <TableHead>次回面談</TableHead>
              <TableHead>タグ</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow
                key={c.id}
                className={cn("cursor-pointer", c.isArchived && "opacity-50")}
                onClick={() => router.push(`/crm/contacts/${c.id}`)}
              >
                <TableCell className="text-sm font-medium">{c.name}</TableCell>
                <TableCell>
                  <EditableCell
                    value={c.realName ?? ""}
                    onSave={(v) => saveInline(c.id, "realName", v)}
                  />
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={(c.nicknames ?? []).join(", ")}
                    onSave={(v) => saveInline(
                      c.id,
                      "nicknames",
                      v.split(/[,、,\n]/).map((s) => s.trim()).filter(Boolean),
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {c.type === "salon_member" ? "サロン生" : "取引先"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{c.occupation || "-"}</TableCell>
                <TableCell>
                  <EditableCell value={c.email ?? ""} onSave={(v) => saveInline(c.id, "email", v)} />
                </TableCell>
                <TableCell>
                  <EditableCell value={c.phone ?? ""} onSave={(v) => saveInline(c.id, "phone", v)} />
                </TableCell>
                <TableCell>
                  <EditableCell value={c.lineId ?? ""} onSave={(v) => saveInline(c.id, "lineId", v)} />
                </TableCell>
                <TableCell>
                  <EditableCell value={c.discordId ?? ""} onSave={(v) => saveInline(c.id, "discordId", v)} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.lastMeetingDate ? new Date(c.lastMeetingDate).toLocaleDateString("ja-JP") : "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.nextMeetingDate ? new Date(c.nextMeetingDate).toLocaleDateString("ja-JP") : "-"}</TableCell>
                <TableCell>
                  <TagSelect
                    allTags={crmTags}
                    selectedTags={c.tags ?? []}
                    onToggle={(tagName) => {
                      const currentTags = c.tags ?? []
                      const newTags = currentTags.includes(tagName)
                        ? currentTags.filter((t) => t !== tagName)
                        : [...currentTags, tagName]
                      updateMutation.mutate({ id: c.id, data: { tags: newTags } })
                    }}
                    onCreate={(name) => createTagMutation.mutate({ name })}
                    size="compact"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); handleArchive(c) }}
                  >
                    {c.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 作成/編集ダイアログ */}
      <ContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contact={null}
        onSave={handleSave}
      />
    </div>
  )
}

function ContactModal({
  open, onOpenChange, contact, onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactDTO | null
  onSave: (data: Record<string, unknown>) => void
}) {
  const [name, setName] = useState("")
  const [realName, setRealName] = useState("")
  const [nicknamesInput, setNicknamesInput] = useState("")
  const [type, setType] = useState<string>("サロン生")
  const [occupation, setOccupation] = useState("")
  const [age, setAge] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [lineId, setLineId] = useState("")
  const [discordId, setDiscordId] = useState("")
  const [interests, setInterests] = useState("")
  const [mindset, setMindset] = useState("")
  const [memo, setMemo] = useState("")

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(""); setRealName(""); setNicknamesInput("")
      setType("サロン生"); setOccupation(""); setAge("")
      setEmail(""); setPhone(""); setLineId(""); setDiscordId("")
      setInterests(""); setMindset(""); setMemo("")
    }
    onOpenChange(open)
  }

  const handleSubmit = () => {
    const nicknames = nicknamesInput
      .split(/[,、,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    onSave({
      name, realName, nicknames,
      type: TYPE_TO_API[type] ?? type, occupation,
      age: age ? Number(age) : null,
      email, phone, lineId, discordId,
      interests, mindset, memo,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新規連絡先</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">名前（表示用） *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">種別</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value || "サロン生")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="サロン生">サロン生</option>
                <option value="取引先連絡先">取引先連絡先</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">本名</Label>
              <Input value={realName} onChange={(e) => setRealName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">ニックネーム（カンマ区切りで複数可）</Label>
              <Input value={nicknamesInput} onChange={(e) => setNicknamesInput(e.target.value)} placeholder="例: kuma, くまさん" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">職業</Label>
              <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">年齢</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">メール</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">電話</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">LINE ID</Label>
              <Input value={lineId} onChange={(e) => setLineId(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Discord ID</Label>
              <Input value={discordId} onChange={(e) => setDiscordId(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">興味・関心</Label>
            <Input value={interests} onChange={(e) => setInterests(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">マインドセット</Label>
            <Input value={mindset} onChange={(e) => setMindset(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">メモ</Label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} className="text-sm" rows={3} />
          </div>
          <Button onClick={handleSubmit} disabled={!name}>
            登録
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
