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
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AccountDetailDTO } from "@/types/dto"
import { AccountSelectItems } from "./account-select-items"

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
    onSave({
      accountId: fromAccountId,
      fromAccountId,
      toAccountId,
      type: "transfer",
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
            <Select value={fromAccountId} onValueChange={(v) => setFromAccountId(v ?? "")}>
              <SelectTrigger><SelectValue>{accounts.find((a) => a.id === fromAccountId)?.name ?? "選択..."}</SelectValue></SelectTrigger>
              <SelectContent>
                <AccountSelectItems accounts={accounts} />
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">振替先</Label>
            <Select value={toAccountId} onValueChange={(v) => setToAccountId(v ?? "")}>
              <SelectTrigger><SelectValue>{accounts.find((a) => a.id === toAccountId)?.name ?? "選択..."}</SelectValue></SelectTrigger>
              <SelectContent>
                <AccountSelectItems accounts={accounts.filter((a) => a.id !== fromAccountId)} />
              </SelectContent>
            </Select>
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
