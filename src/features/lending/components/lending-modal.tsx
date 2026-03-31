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
  initialValues?: { accountId?: string }
}

export function LendingModal({ open, onOpenChange, accounts, onSave, initialValues }: Props) {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? ""
  const [accountId, setAccountId] = useState("")

  useEffect(() => {
    if (open && initialValues?.accountId) {
      setAccountId(initialValues.accountId)
    }
  }, [open, initialValues])
  const [counterpartyMode, setCounterpartyMode] = useState<"internal" | "external">("internal")
  const [counterpartyAccountId, setCounterpartyAccountId] = useState("")
  const [type, setType] = useState<"lend" | "borrow">("lend")
  const [principal, setPrincipal] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [memo, setMemo] = useState("")

  // 相手区分に応じてフィルタ
  const counterpartyAccounts = accounts.filter((a) =>
    counterpartyMode === "internal"
      ? a.ownerType === "internal" && a.id !== accountId
      : a.ownerType === "external"
  )
  const selectedCounterparty = accounts.find((a) => a.id === counterpartyAccountId)

  const canSave = accountId && counterpartyAccountId && principal

  const handleSave = () => {
    if (!canSave) return
    onSave({
      accountId,
      counterparty: selectedCounterparty?.name ?? "",
      counterpartyAccountId,
      type,
      principal: Number(principal),
      date,
      dueDate: dueDate || null,
      memo,
      editedBy: userName,
    })
    setCounterpartyAccountId("")
    setPrincipal("")
    setDate(new Date().toISOString().split("T")[0])
    setDueDate("")
    setMemo("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>貸借登録</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">自口座</Label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={selectClassName}>
              <option value="">選択...</option>
              <AccountSelectItems accounts={accounts} />
            </select>
          </div>
          <div>
            <Label className="text-xs">相手区分</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                size="sm"
                variant={counterpartyMode === "internal" ? "default" : "outline"}
                className="h-8 text-xs flex-1"
                onClick={() => { setCounterpartyMode("internal"); setCounterpartyAccountId("") }}
              >
                社内口座
              </Button>
              <Button
                type="button"
                size="sm"
                variant={counterpartyMode === "external" ? "default" : "outline"}
                className="h-8 text-xs flex-1"
                onClick={() => { setCounterpartyMode("external"); setCounterpartyAccountId("") }}
              >
                社外口座
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">相手口座</Label>
            <select value={counterpartyAccountId} onChange={(e) => setCounterpartyAccountId(e.target.value)} className={selectClassName}>
              <option value="">選択...</option>
              <AccountSelectItems accounts={counterpartyAccounts} />
            </select>
          </div>
          <div>
            <Label className="text-xs">実行日</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">貸出/借入</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={type === "lend" ? "default" : "outline"}
                  className="h-8 text-xs flex-1"
                  onClick={() => setType("lend")}
                >
                  貸出
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={type === "borrow" ? "default" : "outline"}
                  className="h-8 text-xs flex-1"
                  onClick={() => setType("borrow")}
                >
                  借入
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">元本（円）</Label>
              <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <Label className="text-xs">返済期限（任意）</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">メモ</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!canSave}>
            登録
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
