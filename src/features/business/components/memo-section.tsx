"use client"

import { useState } from "react"
import { Plus, Trash2, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useBusinessMemos, useCreateBusinessMemo, useDeleteBusinessMemo } from "@/hooks/use-business"
import type { BusinessMemoDTO } from "@/types/dto"

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}

function MemoItem({ memo, onDelete }: { memo: BusinessMemoDTO; onDelete: (id: string) => void }) {
  return (
    <div className="group p-2 rounded-md border bg-muted/20 text-xs space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {formatDate(memo.date)}
          {memo.author && ` / ${memo.author}`}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
          onClick={() => onDelete(memo.id)}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <p className="whitespace-pre-wrap text-xs leading-relaxed">{memo.content}</p>
    </div>
  )
}

export function MemoSection({
  businessId,
  projectId,
  compact = false,
}: {
  businessId?: string
  projectId?: string
  compact?: boolean
}) {
  const { data: memos = [] } = useBusinessMemos({ businessId, projectId })
  const createMemo = useCreateBusinessMemo()
  const deleteMemo = useDeleteBusinessMemo()

  const [showAdd, setShowAdd] = useState(false)
  const [newContent, setNewContent] = useState("")

  const handleAdd = () => {
    if (!newContent.trim()) return
    createMemo.mutate({
      businessId,
      projectId,
      date: new Date().toISOString().split("T")[0],
      content: newContent.trim(),
      author: "野田",
    })
    setNewContent("")
    setShowAdd(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm("このメモを削除しますか？")) return
    deleteMemo.mutate(id)
  }

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground">
            <StickyNote className="w-3 h-3 inline mr-1" />
            メモ ({memos.length})
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => setShowAdd(!showAdd)}
          >
            <Plus className="w-3 h-3 mr-0.5" />追加
          </Button>
        </div>

        {showAdd && (
          <div className="mb-2 p-2 rounded border bg-muted/30 space-y-1">
            <Textarea
              placeholder="メモを入力"
              className="text-xs min-h-[60px]"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              autoFocus
            />
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] cursor-pointer" onClick={() => { setShowAdd(false); setNewContent("") }}>キャンセル</Button>
              <Button size="sm" className="h-6 text-[10px] cursor-pointer" onClick={handleAdd} disabled={!newContent.trim() || createMemo.isPending}>追加</Button>
            </div>
          </div>
        )}

        {memos.length === 0 && !showAdd ? (
          <p className="text-xs text-muted-foreground">なし</p>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {memos.map((m) => (
              <MemoItem key={m.id} memo={m} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // フルサイズ表示（パネルとして使う場合）
  return (
    <div className="w-[280px] border-l bg-card h-full flex flex-col shrink-0">
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
        <p className="text-sm font-bold">
          <StickyNote className="w-4 h-4 inline mr-1.5" />
          メモ ({memos.length})
        </p>
        <Button size="sm" className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />追加
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {showAdd && (
          <div className="mb-2 p-2 rounded border bg-muted/30 space-y-1">
            <Textarea
              placeholder="メモを入力"
              className="text-xs min-h-[80px]"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              autoFocus
            />
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] cursor-pointer" onClick={() => { setShowAdd(false); setNewContent("") }}>キャンセル</Button>
              <Button size="sm" className="h-6 text-[10px] cursor-pointer" onClick={handleAdd} disabled={!newContent.trim() || createMemo.isPending}>追加</Button>
            </div>
          </div>
        )}
        {memos.length === 0 && !showAdd ? (
          <p className="text-xs text-muted-foreground">メモなし</p>
        ) : (
          <div className="space-y-2">
            {memos.map((m) => (
              <MemoItem key={m.id} memo={m} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
