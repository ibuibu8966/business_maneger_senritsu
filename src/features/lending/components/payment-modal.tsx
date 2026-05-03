"use client"

import { useState } from "react"
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  lendingId: string | null
  onSave: (data: Record<string, unknown>) => void
}

export function PaymentModal({ open, onOpenChange, lendingId, onSave }: Props) {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? ""
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [memo, setMemo] = useState("")

  const handleSave = () => {
    if (!lendingId || !amount) return
    onSave({
      lendingId,
      amount: Number(amount),
      date,
      memo,
      editedBy: userName,
    })
    setAmount("")
    setMemo("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>返済記録</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">返済金額（円）</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">返済日</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">メモ</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!amount}>
            記録
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
