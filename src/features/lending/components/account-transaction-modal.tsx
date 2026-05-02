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
  initialValues?: { accountId?: string; type?: string; toAccountId?: string }
}

/**
 * 口座取引作成モーダル（複式簿記版）
 *
 * - 1取引=1レコード（fromAccountId/toAccountId 必須）
 * - 純入出金・売上・経費等は外部口座経由でバックエンド側が補完するため、
 *   このモーダルでは「対象口座」と「方向（入金/出金）」を入力する
 * - 振替は fromAccount/toAccount を直接選択
 */
export function AccountTransactionModal({ open, onOpenChange, accounts, onSave, initialValues }: Props) {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? ""

  // 12種に対応したカテゴリ
  // 「方向」が必要なものは、対象口座から見た inflow/outflow を type と組み合わせて指定
  const accountCategories = [
    { value: "deposit_withdrawal_in",  type: "deposit_withdrawal", direction: "in",  label: "純入金" },
    { value: "deposit_withdrawal_out", type: "deposit_withdrawal", direction: "out", label: "純出金" },
    { value: "investment_in",          type: "investment",         direction: "in",  label: "出資受入" },
    { value: "gain",                   type: "gain",               direction: "in",  label: "運用益" },
    { value: "loss",                   type: "loss",               direction: "out", label: "運用損" },
    { value: "revenue",                type: "revenue",            direction: "in",  label: "売上" },
    { value: "expense",                type: "expense",            direction: "out", label: "支出" },
    { value: "misc_expense",           type: "misc_expense",       direction: "out", label: "雑費" },
    { value: "misc_income",            type: "misc_income",        direction: "in",  label: "雑収入" },
    { value: "transfer",               type: "transfer",           direction: null,  label: "口座振替" },
  ]

  const [accountId, setAccountId] = useState("")
  const [categoryValue, setCategoryValue] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [memo, setMemo] = useState("")

  const selectedCategory = accountCategories.find((c) => c.value === categoryValue)
  const isTransfer = selectedCategory?.type === "transfer"

  const defaultCategoryValue = accountCategories[0].value

  useEffect(() => {
    if (open && initialValues) {
      if (initialValues.accountId) setAccountId(initialValues.accountId)
      if (initialValues.type === "transfer") {
        setCategoryValue("transfer")
      } else if (initialValues.type) {
        setCategoryValue(initialValues.type)
      } else {
        setCategoryValue(defaultCategoryValue)
      }
      setToAccountId(initialValues.toAccountId ?? "")
    }
    if (!open) {
      setCategoryValue(defaultCategoryValue)
      setAmount("")
      setMemo("")
      setToAccountId("")
    }
  }, [open, initialValues, defaultCategoryValue])

  const canSave = isTransfer
    ? accountId && toAccountId && amount && accountId !== toAccountId
    : accountId && categoryValue && amount

  const handleSave = () => {
    if (!canSave || !selectedCategory) return
    const selectedAccount = accounts.find((a) => a.id === accountId)
    const businessId = selectedAccount?.businessId || undefined

    if (isTransfer) {
      onSave({
        type: "transfer",
        fromAccountId: accountId,
        toAccountId,
        amount: Number(amount),
        date,
        memo,
        editedBy: userName,
        businessId,
      })
    } else {
      // 方向に応じて from/to を組み立て。外部口座は __EXTERNAL__ プレースホルダで送り、
      // バックエンドで実IDに置き換える前提（次セッションで実装）。
      // 現状はクライアントから外部口座IDが取れないので、type と direction を送り
      // バックエンド側で外部口座 ID を補完する設計が必要。
      onSave({
        type: selectedCategory.type,
        direction: selectedCategory.direction,
        accountId,                                  // バックエンド補完用ヒント
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
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={selectClassName}>
              <option value="">選択...</option>
              <AccountSelectItems accounts={accounts} />
            </select>
          </div>
          {isTransfer ? (
            <div>
              <Label className="text-xs">振替先</Label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={selectClassName}>
                <option value="">選択...</option>
                <AccountSelectItems accounts={accounts.filter((a) => a.id !== accountId)} />
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">カテゴリ</Label>
                <select value={categoryValue} onChange={(e) => setCategoryValue(e.target.value || defaultCategoryValue)} className={selectClassName}>
                  {accountCategories.filter((c) => c.type !== "transfer").map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
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
