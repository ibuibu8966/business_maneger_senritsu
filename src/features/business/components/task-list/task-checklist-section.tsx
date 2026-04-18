"use client"

import { useState } from "react"
import { Plus, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type TaskItem, type ChecklistItem } from "../mock-data"
import {
  useAddTaskChecklistItem,
  useUpdateTaskChecklistItem,
  useDeleteTaskChecklistItem,
  useChecklistTemplates,
  useApplyChecklistTemplate,
  useCreateChecklistTemplate,
} from "@/hooks/use-business"

/**
 * タスクのチェックリスト
 */
export function TaskChecklistSection({ task }: { task: TaskItem }) {
  const [newItemTitle, setNewItemTitle] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showNewTemplateInline, setShowNewTemplateInline] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")

  const addItemMutation = useAddTaskChecklistItem()
  const updateItemMutation = useUpdateTaskChecklistItem()
  const deleteItemMutation = useDeleteTaskChecklistItem()
  const { data: templates = [] } = useChecklistTemplates(task.businessId)
  const applyTemplateMutation = useApplyChecklistTemplate()
  const createTemplateMutation = useCreateChecklistTemplate()

  const items = task.checklistItems ?? []
  const checkedCount = items.filter((i) => i.checked).length

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return
    addItemMutation.mutate({ taskId: task.id, title: newItemTitle.trim(), sortOrder: items.length })
    setNewItemTitle("")
  }

  const handleToggle = (item: ChecklistItem) => {
    updateItemMutation.mutate({ taskId: task.id, itemId: item.id, data: { checked: !item.checked } })
  }

  const handleEditSave = (itemId: string) => {
    if (editingTitle.trim()) {
      updateItemMutation.mutate({ taskId: task.id, itemId, data: { title: editingTitle.trim() } })
    }
    setEditingId(null)
  }

  const handleDelete = (itemId: string) => {
    deleteItemMutation.mutate({ taskId: task.id, itemId })
  }

  const handleApplyTemplate = (templateId: string) => {
    applyTemplateMutation.mutate({ taskId: task.id, templateId })
    setShowTemplateMenu(false)
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim() || items.length === 0) return
    createTemplateMutation.mutate({
      name: templateName.trim(),
      businessId: task.businessId,
      items: items.map((i, idx) => ({ title: i.title, sortOrder: idx })),
    })
    setTemplateName("")
    setShowSaveTemplate(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          チェックリスト {items.length > 0 && <span className="text-foreground">({checkedCount}/{items.length})</span>}
        </p>
        <div className="flex gap-1">
          <div className="relative">
            <Button size="sm" variant="ghost" className="h-6 text-[10px] cursor-pointer" onClick={() => setShowTemplateMenu(!showTemplateMenu)}>
              テンプレから追加
            </Button>
            {showTemplateMenu && (
              <div className="absolute right-0 top-7 z-50 bg-background border rounded-md shadow-lg p-1 min-w-[200px]">
                {templates.length === 0 && !showNewTemplateInline && (
                  <p className="text-xs text-muted-foreground p-2">テンプレートなし</p>
                )}
                {templates.map((t: { id: string; name: string; items?: unknown[] }) => (
                  <button
                    key={t.id}
                    className="w-full text-left text-xs p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => handleApplyTemplate(t.id)}
                  >
                    {t.name} ({t.items?.length ?? 0}項目)
                  </button>
                ))}
                {templates.length > 0 && <div className="border-t my-1" />}
                {showNewTemplateInline ? (
                  <div className="p-2 space-y-1">
                    <Input
                      className="h-7 text-xs"
                      placeholder="テンプレート名"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing && newTemplateName.trim() && items.length > 0) {
                          createTemplateMutation.mutate({
                            name: newTemplateName.trim(),
                            businessId: task.businessId,
                            items: items.map((i, idx) => ({ title: i.title, sortOrder: idx })),
                          })
                          setNewTemplateName("")
                          setShowNewTemplateInline(false)
                          setShowTemplateMenu(false)
                        }
                        if (e.key === "Escape") setShowNewTemplateInline(false)
                      }}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-6 text-[10px] flex-1 cursor-pointer"
                        disabled={!newTemplateName.trim() || items.length === 0}
                        onClick={() => {
                          createTemplateMutation.mutate({
                            name: newTemplateName.trim(),
                            businessId: task.businessId,
                            items: items.map((i, idx) => ({ title: i.title, sortOrder: idx })),
                          })
                          setNewTemplateName("")
                          setShowNewTemplateInline(false)
                          setShowTemplateMenu(false)
                        }}
                      >
                        現在の項目で作成
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] cursor-pointer"
                        onClick={() => setShowNewTemplateInline(false)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    {items.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">チェック項目がありません</p>
                    )}
                  </div>
                ) : (
                  <button
                    className="w-full text-left text-xs p-2 hover:bg-muted rounded cursor-pointer text-primary font-medium"
                    onClick={() => setShowNewTemplateInline(true)}
                  >
                    ＋ 新規テンプレ作成
                  </button>
                )}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] cursor-pointer" onClick={() => setShowSaveTemplate(!showSaveTemplate)}>
              テンプレ保存
            </Button>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="w-full h-1.5 bg-muted rounded-full mb-2">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${(checkedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {showSaveTemplate && (
        <div className="flex gap-1 mb-2">
          <Input
            className="h-7 text-xs flex-1"
            placeholder="テンプレート名"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSaveTemplate()}
          />
          <Button size="sm" className="h-7 text-xs cursor-pointer" onClick={handleSaveTemplate}>保存</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs cursor-pointer" onClick={() => setShowSaveTemplate(false)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => handleToggle(item)}
              className="rounded cursor-pointer shrink-0"
            />
            {editingId === item.id ? (
              <Input
                className="h-6 text-xs flex-1"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleEditSave(item.id)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleEditSave(item.id); if (e.key === "Escape") setEditingId(null) }}
                autoFocus
              />
            ) : (
              <span
                className={`text-xs flex-1 cursor-pointer ${item.checked ? "line-through text-muted-foreground" : ""}`}
                onClick={() => { setEditingId(item.id); setEditingTitle(item.title) }}
              >
                {item.title}
              </span>
            )}
            <button
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 cursor-pointer"
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mt-2">
        <Input
          className="h-7 text-xs flex-1"
          placeholder="項目を追加..."
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleAddItem()}
        />
        <Button size="sm" className="h-7 text-xs cursor-pointer" onClick={handleAddItem} disabled={!newItemTitle.trim()}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
