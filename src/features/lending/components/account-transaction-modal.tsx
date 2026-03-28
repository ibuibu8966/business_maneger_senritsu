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
  SelectItem,
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
  initialValues?: { accountId?: string; type?: string; toAccountId?: string }
}

export function AccountTransactionModal({ open, onOpenChange, accounts, onSave, initialValues }: Props) {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? ""

  // ハードコードカテゴリ（口座取引用）
  const accountCategories = [
    { value: "DEPOSIT", label: "純入金" },
    { value: "WITHDRAWAL", label: "純出金" },
    { value: "INVESTMENT", label: "出資" },
    { value: "GAIN", label: "運用益" },
    { value: "LOSS", label: "運用損" },
    { value: "REVENUE", label: "売上" },
    { value: "MISC_EXPENSE", label: "雑費" },
    { value: "MISC_INCOME", label: "雑収入" },
    { value: "transfer", label: "口座振替" },
  ]

  const [accountId, setAccountId] = useState("")
  const [type, setType] = useState("")  // categoryId or "transfer"
  const [toAccountId, setToAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [memo, setMemo] = useState("")

  const isTransfer = type === "transfer"

  // 最初の口座連動カテゴリをデフォルトに
  const defaultCategoryId = accountCategories.length > 1 ? accountCategories[0].value : ""

  useEffect(() => {
    if (open && initialValues) {
      if (initialValues.accountId) setAccountId(initialValues.accountId)
      setType(initialValues.type === "transfer" ? "transfer" : (initialValues.type ?? defaultCategoryId))
      setToAccountId(initialValues.toAccountId ?? "")
    }
    if (!open) {
      setType(defaultCategoryId)
      setAmount("")
      setMemo("")
      setToAccountId("")
    }
  }, [open, initialValues, defaultCategoryId])

  const canSave = isTransfer
    ? accountId && toAccountId && amount && accountId !== toAccountId
    : accountId && type && amount

  const handleSave = () => {
    if (!canSave) return
    const selectedAccount = accounts.find((a) => a.id === accountId)
    const businessId = selectedAccount?.businessId || undefined
    if (isTransfer) {
      onSave({
        accountId,
        fromAccountId: accountId,
        toAccountId,
        type: "transfer",
        amount: Number(amount),
        date,
        memo,
        editedBy: userName,
        businessId,
      })
    } else {
      onSave({
        accountId,
        categoryId: type,  // typeステートにはcategoryId（accountCategories.value = c.id）が入っている
        amount: Number(amount),
        date,
        memo,
        editedBy: userName,
        businessId,
      })
    }
    setAmount("")
    setMemo("")
    setToAccountId("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isTransfer ? "口座振替" : "入出金・運用履歴登録"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">{isTransfer ? "振替元" : "対象口座"}</Label>
            <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
              <SelectTrigger><SelectValue>{accounts.find((a) => a.id === accountId)?.name ?? "選択..."}</SelectValue></SelectTrigger>
              <SelectContent>
                <AccountSelectItems accounts={accounts} />
              </SelectContent>
            </Select>
          </div>
          {isTransfer ? (
            <div>
              <Label className="text-xs">振替先</Label>
              <Select value={toAccountId} onValueChange={(v) => setToAccountId(v ?? "")}>
                <SelectTrigger><SelectValue>{accounts.find((a) => a.id === toAccountId)?.name ?? "選択..."}</SelectValue></SelectTrigger>
                <SelectContent>
                  <AccountSelectItems accounts={accounts.filter((a) => a.id !== accountId)} />
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">カテゴリ</Label>
                <Select value={type} onValueChange={(v) => setType(v ?? defaultCategoryId)}>
                  <SelectTrigger><SelectValue>{accountCategories.find((t) => t.value === type)?.label ?? "選択..."}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {accountCategories.filter((t) => t.value !== "transfer").map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">日付</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
          )}
          {isTransfer && (
            <div>
              <Label className="text-xs">日付</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          <div>
            <Label className="text-xs">金額（円）</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">メモ</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!canSave}>
            {isTransfer ? "振替登録" : "登録"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
