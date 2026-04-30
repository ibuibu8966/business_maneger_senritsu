"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AccountDetailDTO } from "@/types/dto"
import { AccountSelectItems } from "./account-select-items"

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: AccountDetailDTO[]
  onSave: (data: Record<string, unknown>) => void
  initialAccountId?: string
}

export function AccountTransferModal({ open, onOpenChange, accounts, onSave, initialAccountId }: Props) {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? ""
  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [memo, setMemo] = useState("")

  useEffect(() => {
    if (open && initialAccountId) {
      setFromAccountId(initialAccountId)
    }
  }, [open, initialAccountId])

  const handleSave = () => {
    if (!fromAccountId || !toAccountId || !amount) return
    // 複式簿記版：1取引=1レコード（fromAccountId/toAccountId 必須）
    onSave({
      type: "transfer",
      fromAccountId,
      toAccountId,
      amount: Number(amount),
      date,
      memo,
      editedBy: userName,
    })
    setAmount("")
    setMemo("")
    setToAccountId("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>口座振替</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">振替元</Label>
            <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={selectClassName}>
              <option value="">選択...</option>
              <AccountSelectItems accounts={accounts} />
            </select>
          </div>
          <div>
            <Label className="text-xs">振替先</Label>
            <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={selectClassName}>
              <option value="">選択...</option>
              <AccountSelectItems accounts={accounts.filter((a) => a.id !== fromAccountId)} />
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">日付</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">金額（円）</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <Label className="text-xs">メモ</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!fromAccountId || !toAccountId || !amount || fromAccountId === toAccountId}>
            振替登録
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
