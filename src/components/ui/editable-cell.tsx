"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"

type Props = {
  value: string
  onSave: (next: string) => void | Promise<void>
  placeholder?: string
  className?: string
}

export function EditableCell({ value, onSave, placeholder = "-", className }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [editing, value])

  const commit = async () => {
    if (draft !== value) {
      await onSave(draft)
    }
    setEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit() }
          if (e.key === "Escape") { e.preventDefault(); cancel() }
        }}
        onClick={(e) => e.stopPropagation()}
        className={`h-7 text-sm ${className ?? ""}`}
      />
    )
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className={`text-sm cursor-text min-h-[1.5rem] rounded px-1 -mx-1 hover:bg-muted/50 ${className ?? ""}`}
      title="クリックで編集"
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </div>
  )
}
