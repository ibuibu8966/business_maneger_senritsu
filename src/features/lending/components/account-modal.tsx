"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BusinessDTO, AccountTagDTO } from "@/types/dto"
import { TagSelect } from "./tag-select"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  businesses: BusinessDTO[]
  allTags?: AccountTagDTO[]
  onCreateTag?: (name: string) => void
  onSave: (data: Record<string, unknown>) => void
}

export function AccountModal({ open, onOpenChange, businesses, allTags = [], onCreateTag, onSave }: Props) {
  const [name, setName] = useState("")
  const [ownerType, setOwnerType] = useState<"internal" | "external">("internal")
  const [accountType, setAccountType] = useState<"bank" | "securities">("bank")
  const [businessId, setBusinessId] = useState<string>("")
  const [balance, setBalance] = useState("")
  const [purpose, setPurpose] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // ダイアログを開くたびにリセット
  useEffect(() => {
    if (open) {
      setName("")
      setOwnerType("internal")
      setAccountType("bank")
      setBusinessId("")
      setBalance("")
      setPurpose("")
      setSelectedTags([])
    }
  }, [open])

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) => prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName])
  }

  const handleSave = () => {
    if (!name) return
    onSave({
      name,
      ownerType,
      accountType,
      businessId: businessId || null,
      balance: balance ? Number(balance) : 0,
      purpose,
      tags: selectedTags,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>口座追加</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">口座名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 楽天銀行" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">所有区分</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={ownerType === "internal" ? "default" : "outline"}
                  className="h-8 text-xs flex-1"
                  onClick={() => setOwnerType("internal")}
                >
                  社内
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={ownerType === "external" ? "default" : "outline"}
                  className="h-8 text-xs flex-1"
                  onClick={() => setOwnerType("external")}
                >
                  社外
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">口座種別</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={accountType === "bank" ? "default" : "outline"}
                  className="h-8 text-xs flex-1"
                  onClick={() => setAccountType("bank")}
                >
                  銀行口座
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={accountType === "securities" ? "default" : "outline"}
                  className="h-8 text-xs flex-1"
                  onClick={() => setAccountType("securities")}
                >
                  証券口座
                </Button>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">紐づく事業（任意）</Label>
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">なし</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">初期残高（円）</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">目的・用途</Label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="例: IB報酬の受取" />
          </div>
          <div>
            <Label className="text-xs">タグ</Label>
            <div className="mt-1">
              <TagSelect allTags={allTags} selectedTags={selectedTags} onToggle={toggleTag} onCreate={onCreateTag} />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!name}>
            追加
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
