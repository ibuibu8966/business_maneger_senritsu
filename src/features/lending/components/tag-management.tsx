"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { AccountTagDTO } from "@/types/dto"
import {
  useAccountTags,
  useCreateAccountTag,
  useUpdateAccountTag,
  useDeleteAccountTag,
} from "@/hooks/use-lending"

const TAG_COLORS = [
  { value: "", label: "デフォルト" },
  { value: "blue", label: "青" },
  { value: "red", label: "赤" },
  { value: "green", label: "緑" },
  { value: "yellow", label: "黄" },
  { value: "purple", label: "紫" },
  { value: "orange", label: "オレンジ" },
  { value: "pink", label: "ピンク" },
]

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  red: "bg-red-100 text-red-800 border-red-300",
  green: "bg-green-100 text-green-800 border-green-300",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
  orange: "bg-orange-100 text-orange-800 border-orange-300",
  pink: "bg-pink-100 text-pink-800 border-pink-300",
}

export function getTagColorClass(color: string) {
  return COLOR_CLASSES[color] ?? ""
}

export function TagManagement() {
  const { data: tags = [], isLoading } = useAccountTags()
  const createMutation = useCreateAccountTag()
  const updateMutation = useUpdateAccountTag()
  const deleteMutation = useDeleteAccountTag()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<AccountTagDTO | null>(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState("")

  const openNew = () => {
    setEditingTag(null)
    setName("")
    setColor("")
    setModalOpen(true)
  }

  const openEdit = (tag: AccountTagDTO) => {
    setEditingTag(tag)
    setName(tag.name)
    setColor(tag.color)
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!name.trim()) return
    if (editingTag) {
      updateMutation.mutate(
        { id: editingTag.id, data: { name: name.trim(), color } },
        {
          onSuccess: () => {
            toast.success("タグを更新しました")
            setModalOpen(false)
          },
          onError: () => toast.error("タグの更新に失敗しました"),
        },
      )
    } else {
      createMutation.mutate(
        { name: name.trim(), color },
        {
          onSuccess: () => {
            toast.success("タグを作成しました")
            setModalOpen(false)
          },
          onError: () => toast.error("タグの作成に失敗しました"),
        },
      )
    }
  }

  const handleDelete = (tag: AccountTagDTO) => {
    if (!confirm(`タグ「${tag.name}」を削除しますか？\n関連する口座・取引からも除去されます。`)) return
    deleteMutation.mutate(tag.id, {
      onSuccess: () => toast.success("タグを削除しました"),
      onError: () => toast.error("タグの削除に失敗しました"),
    })
  }

  if (isLoading) return <div className="p-4 text-muted-foreground text-sm">読み込み中...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold border-l-[3px] border-primary pl-2">タグ管理</h2>
          <span className="text-xs text-muted-foreground">{tags.length}件</span>
        </div>
        <Button size="sm" onClick={openNew} className="h-7 text-xs gap-1">
          <Plus className="h-3.5 w-3.5" />タグ追加
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          タグがありません。「タグ追加」から作成してください。
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 bg-card"
            >
              <Badge
                variant="outline"
                className={`text-xs ${getTagColorClass(tag.color)}`}
              >
                {tag.name}
              </Badge>
              <button
                onClick={() => openEdit(tag)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleDelete(tag)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "タグ編集" : "タグ追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">タグ名</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="タグ名を入力"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
              />
            </div>
            <div>
              <Label className="text-xs">色</Label>
              <Select value={color} onValueChange={(v) => setColor(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>
                    {TAG_COLORS.find((c) => c.value === color)?.label ?? "デフォルト"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TAG_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        {c.value && (
                          <span className={`inline-block w-3 h-3 rounded-full ${COLOR_CLASSES[c.value]?.split(" ")[0] ?? "bg-muted"}`} />
                        )}
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {name.trim() && (
              <div>
                <Label className="text-xs">プレビュー</Label>
                <div className="mt-1">
                  <Badge variant="outline" className={`text-xs ${getTagColorClass(color)}`}>
                    {name.trim()}
                  </Badge>
                </div>
              </div>
            )}
            <Button
              onClick={handleSave}
              className="w-full"
              disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editingTag ? "更新" : "作成"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
