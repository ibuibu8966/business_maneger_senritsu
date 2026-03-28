"use client"

import { useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tag, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { AccountTagDTO } from "@/types/dto"
import { getTagColorClass } from "./tag-management"

interface TagSelectProps {
  allTags: AccountTagDTO[]
  selectedTags: string[]
  onToggle: (tagName: string) => void
  onCreate?: (name: string) => void
  /** トリガーのサイズ感。compact=テーブル行向き、default=フォーム向き */
  size?: "compact" | "default"
}

export function TagSelect({ allTags, selectedTags, onToggle, onCreate, size = "default" }: TagSelectProps) {
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredTags = search
    ? allTags.filter((tag) => tag.name.toLowerCase().includes(search.toLowerCase()))
    : allTags

  const isCompact = size === "compact"
  const canCreate = onCreate && search.trim() && !allTags.some((t) => t.name === search.trim())

  const stopEvent = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    <div
      className="flex items-center gap-1 flex-wrap"
      onClick={stopEvent}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {selectedTags.map((tagName) => {
        const tagMeta = allTags.find((at) => at.name === tagName)
        return (
          <Badge
            key={tagName}
            variant="outline"
            className={cn(
              isCompact ? "text-[10px] py-0 px-1" : "text-xs py-0",
              getTagColorClass(tagMeta?.color ?? ""),
            )}
          >
            {tagName}
          </Badge>
        )
      })}
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) {
            setSearch("")
            setTimeout(() => inputRef.current?.focus(), 50)
          }
        }}
      >
        <DropdownMenuTrigger
          className={cn(
            "flex items-center justify-center rounded hover:bg-accent",
            isCompact ? "h-5 w-5" : "h-6 w-6",
          )}
        >
          <Tag className={cn("text-muted-foreground", isCompact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <div className="px-1.5 pb-1">
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="タグを検索..."
              className="h-7 text-xs"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          {filteredTags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={selectedTags.includes(tag.name)}
              onCheckedChange={() => onToggle(tag.name)}
            >
              <span className="flex items-center gap-2">
                {tag.color && (
                  <span
                    className={cn(
                      "inline-block w-2.5 h-2.5 rounded-full",
                      getTagColorClass(tag.color).split(" ")[0],
                    )}
                  />
                )}
                {tag.name}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          {canCreate && (
            <button
              type="button"
              className="flex items-center gap-1.5 w-full px-1.5 py-1 text-xs text-primary hover:bg-accent rounded-md"
              onClick={() => {
                onCreate(search.trim())
                setSearch("")
              }}
            >
              <Plus className="h-3 w-3" />
              「{search.trim()}」を新規作成
            </button>
          )}
          {filteredTags.length === 0 && !canCreate && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {allTags.length === 0 ? "タグなし — 入力して新規作成" : "該当なし"}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
