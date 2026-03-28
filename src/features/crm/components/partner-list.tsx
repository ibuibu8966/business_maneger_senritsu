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
import type { PartnerDTO } from "@/types/dto"
import { usePartners, useCreatePartner, useUpdatePartner, useCrmTags, useCreateCrmTag } from "@/hooks/use-crm"
import { cn } from "@/lib/utils"
import { TagSelect } from "@/features/lending/components/tag-select"

export function PartnerList() {
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  const { data: partners = [], isLoading } = usePartners()
  const createMutation = useCreatePartner()
  const updateMutation = useUpdatePartner()
  const { data: crmTags = [] } = useCrmTags()
  const createTagMutation = useCreateCrmTag()

  const filtered = useMemo(() => {
    return partners.filter((p) => {
      if (!showArchived && p.isArchived) return false
      if (showArchived && !p.isArchived) return false
      if (search && !p.name.includes(search)) return false
      return true
    })
  }, [partners, showArchived, search])

  const handleSave = (data: Record<string, unknown>) => {
    createMutation.mutate(data)
    setModalOpen(false)
  }

  const handleArchive = (p: PartnerDTO) => {
    updateMutation.mutate({ id: p.id, data: { isArchived: !p.isArchived } })
  }

  if (isLoading) return <div className="p-4 text-muted-foreground">読み込み中...</div>

  return (
    <div className="flex flex-col h-full">
      {/* フィルター */}
      <div className="px-4 py-3 border-b flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="取引先名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pl-8 w-60"
          />
        </div>
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
              <TableHead>取引先名</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>関連事業</TableHead>
              <TableHead>メモ</TableHead>
              <TableHead>タグ</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow
                key={p.id}
                className={cn("cursor-pointer", p.isArchived && "opacity-50")}
                onClick={() => router.push(`/crm/partners/${p.id}`)}
              >
                <TableCell className="text-sm font-medium">{p.name}</TableCell>
                <TableCell className="text-sm">
                  {p.contacts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.contacts.map((c) => (
                        <Badge key={c.contactId} variant="outline" className="text-xs">
                          {c.contactName}{c.role ? `（${c.role}）` : ""}
                        </Badge>
                      ))}
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {p.businesses.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.businesses.map((b) => (
                        <Badge key={b.businessId} variant="secondary" className="text-xs">
                          {b.businessName}
                        </Badge>
                      ))}
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{p.memo || "-"}</TableCell>
                <TableCell>
                  <TagSelect
                    allTags={crmTags}
                    selectedTags={p.tags ?? []}
                    onToggle={(tagName) => {
                      const currentTags = p.tags ?? []
                      const newTags = currentTags.includes(tagName)
                        ? currentTags.filter((t) => t !== tagName)
                        : [...currentTags, tagName]
                      updateMutation.mutate({ id: p.id, data: { tags: newTags } })
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
                    onClick={(e) => { e.stopPropagation(); handleArchive(p) }}
                  >
                    {p.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 作成/編集ダイアログ */}
      <PartnerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        partner={null}
        onSave={handleSave}
      />
    </div>
  )
}

function PartnerModal({
  open, onOpenChange, partner, onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  partner: PartnerDTO | null
  onSave: (data: Record<string, unknown>) => void
}) {
  const [name, setName] = useState("")
  const [memo, setMemo] = useState("")

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName("")
      setMemo("")
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新規取引先</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">取引先名 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">メモ</Label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} className="text-sm" rows={3} />
          </div>
          <Button onClick={() => onSave({ name, memo })} disabled={!name}>
            登録
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
