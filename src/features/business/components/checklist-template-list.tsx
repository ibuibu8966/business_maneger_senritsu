"use client"

import { useState, useEffect } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, X } from "lucide-react"
import type { ChecklistTemplateDTO } from "@/types/dto"
import {
  useChecklistTemplates,
  useCreateChecklistTemplate,
  useUpdateChecklistTemplate,
  useDeleteChecklistTemplate,
  useBusinessDetails,
} from "@/hooks/use-business"

export function ChecklistTemplateList() {
  const { data: businesses = [] } = useBusinessDetails()
  const [filterBusinessId, setFilterBusinessId] = useState<string>("")

  const { data: templates = [], isLoading } = useChecklistTemplates(filterBusinessId || undefined)
  const createMutation = useCreateChecklistTemplate()
  const updateMutation = useUpdateChecklistTemplate()
  const deleteMutation = useDeleteChecklistTemplate()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplateDTO | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingTemplate(null)
    setModalOpen(true)
  }

  const handleEdit = (template: ChecklistTemplateDTO) => {
    setEditingTemplate(template)
    setModalOpen(true)
  }

  const handleSave = (data: { name: string; businessId?: string | null; items: { title: string; sortOrder: number }[] }) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data })
    } else {
      createMutation.mutate({
        name: data.name,
        businessId: data.businessId ?? undefined,
        items: data.items,
      })
    }
    setModalOpen(false)
    setEditingTemplate(null)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
    setDeleteConfirmId(null)
  }

  // businessIdからbusiness名を取得
  const getBusinessName = (businessId: string | null) => {
    if (!businessId) return null
    return businesses.find((b) => b.id === businessId)?.name ?? null
  }

  if (isLoading) return <div className="p-4 text-muted-foreground">読み込み中...</div>

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b flex items-center gap-3">
        {/* 事業フィルター */}
        <select
          className="h-8 text-sm border rounded-md px-2 bg-background"
          value={filterBusinessId}
          onChange={(e) => setFilterBusinessId(e.target.value)}
        >
          <option value="">すべての事業</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{templates.length}件</span>
        <div className="ml-auto">
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />新規作成
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>テンプレート名</TableHead>
              <TableHead className="w-32">事業</TableHead>
              <TableHead className="w-24">項目数</TableHead>
              <TableHead className="w-36">作成日</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t: ChecklistTemplateDTO) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm font-medium">{t.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {getBusinessName(t.businessId) ?? <span className="text-xs italic">共通</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.items.length}項目</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString("ja-JP")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  テンプレートがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 作成/編集ダイアログ */}
      <TemplateModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditingTemplate(null)
        }}
        template={editingTemplate}
        businesses={businesses}
        defaultBusinessId={filterBusinessId || null}
        onSave={handleSave}
      />

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>テンプレートの削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">このテンプレートを削除しますか？この操作は取り消せません。</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" size="sm" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              削除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateModal({
  open, onOpenChange, template, businesses, defaultBusinessId, onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: ChecklistTemplateDTO | null
  businesses: { id: string; name: string }[]
  defaultBusinessId: string | null
  onSave: (data: { name: string; businessId?: string | null; items: { title: string; sortOrder: number }[] }) => void
}) {
  const [name, setName] = useState("")
  const [businessId, setBusinessId] = useState<string>("")
  const [items, setItems] = useState<{ title: string }[]>([])
  const [newItemTitle, setNewItemTitle] = useState("")

  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name)
        setBusinessId(template.businessId ?? "")
        setItems(template.items.map((i) => ({ title: i.title })))
      } else {
        setName("")
        setBusinessId(defaultBusinessId ?? "")
        setItems([])
      }
      setNewItemTitle("")
    }
  }, [open, template, defaultBusinessId])

  const handleAddItem = () => {
    const trimmed = newItemTitle.trim()
    if (!trimmed) return
    setItems([...items, { title: trimmed }])
    setNewItemTitle("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddItem()
    }
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!name.trim() || items.length === 0) return
    onSave({
      name: name.trim(),
      businessId: businessId || null,
      items: items.map((item, i) => ({ title: item.title, sortOrder: i })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "テンプレートを編集" : "新規テンプレート"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label className="text-xs">テンプレート名 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
              placeholder="例：定例MTGチェックリスト"
            />
          </div>

          <div>
            <Label className="text-xs">事業</Label>
            <select
              className="w-full h-8 text-sm border rounded-md px-2 bg-background mt-1"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
            >
              <option value="">共通（事業指定なし）</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">チェック項目</Label>
            <div className="mt-1 space-y-1">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <span className="text-sm flex-1">{item.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={() => handleRemoveItem(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm flex-1"
                placeholder="項目を入力してEnterで追加"
              />
              <Button variant="outline" size="sm" onClick={handleAddItem} disabled={!newItemTitle.trim()}>
                追加
              </Button>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!name.trim() || items.length === 0}>
            {template ? "更新" : "作成"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
