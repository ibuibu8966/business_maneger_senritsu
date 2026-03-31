"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowLeftRight, Plus, ChevronDown, ChevronRight, Pencil, Check, X, Archive } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
// Native <select> used instead of Radix Select
import {
  useAccountDetail,
  useAccountTransactions,
  useLendings,
  useCreateAccountTransaction,
  useUpdateAccountTransaction,
  useCreateLending,
  useCreateLendingPayment,
  useUpdateAccount,
  useAccountDetails,
  useUpdateLending,
  useAccountTags,
  useCreateAccountTag,
} from "@/hooks/use-lending"
import { useBusinesses } from "@/hooks/use-lending"
import { AccountTransactionModal } from "./account-transaction-modal"
import { LendingModal } from "./lending-modal"
import { PaymentModal } from "./payment-modal"
import { TagSelect } from "./tag-select"

const LENDING_STATUS_LABELS: Record<string, string> = {
  active: "返済中",
  completed: "完済",
  overdue: "延滞",
}

// 入金=緑、出金=赤、振替=グレー
const PLUS_TYPES = new Set(["deposit", "investment", "borrow", "repayment_receive", "interest_receive", "gain", "revenue", "misc_income"])
function getTxTypeColor(type: string): string {
  if (type === "transfer") return "bg-slate-100 text-slate-700 border-slate-200"
  return PLUS_TYPES.has(type)
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-red-50 text-red-700 border-red-200"
}

const OWNER_TYPE_LABELS: Record<string, string> = {
  internal: "社内",
  external: "社外",
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "銀行口座",
  securities: "証券口座",
}

// 手動編集可能な取引種別（貸借系は自動計上のみ）
const EDITABLE_TX_TYPES = [
  { value: "deposit", label: "純入金" },
  { value: "withdrawal", label: "純出金" },
  { value: "investment", label: "出資" },
  { value: "transfer", label: "振替" },
  { value: "gain", label: "運用益" },
  { value: "loss", label: "運用損" },
  { value: "revenue", label: "売上" },
  { value: "misc_expense", label: "雑費" },
  { value: "misc_income", label: "雑収入" },
]

interface Props {
  accountId: string
}

export function AccountDetailView({ accountId }: Props) {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? ""
  const router = useRouter()
  const { data: account, isLoading: accLoading } = useAccountDetail(accountId)
  const { data: allAccounts = [] } = useAccountDetails()
  const { data: businesses = [] } = useBusinesses()
  const { data: allTags = [] } = useAccountTags()
  const [showArchivedTx, setShowArchivedTx] = useState(false)
  const [showArchivedTransfer, setShowArchivedTransfer] = useState(false)
  const [showArchivedLending, setShowArchivedLending] = useState(false)
  const { data: transactions = [], isLoading: txLoading } = useAccountTransactions({ accountId, isArchived: showArchivedTx ? true : false })
  const { data: transferTxsRaw = [] } = useAccountTransactions({ accountId, isArchived: showArchivedTransfer ? true : false })
  const transferTxs = transferTxsRaw
    .filter((t: { type: string }) => t.type === "transfer")
    .filter((t: { id: string; linkedTransferId?: string | null }) => {
      // ペアのうち片方だけ表示（linkedTransferIdが自分のIDより大きい方を除外）
      if (!t.linkedTransferId) return true
      return t.id < t.linkedTransferId
    })
  const nonTransferTxs = transactions.filter((t: { type: string }) => t.type !== "transfer")
  const { data: lendings = [], isLoading: lendLoading } = useLendings({ accountId, isArchived: showArchivedLending ? true : false })

  const createTxMutation = useCreateAccountTransaction()
  const updateTxMutation = useUpdateAccountTransaction()
  const createLendingMutation = useCreateLending()
  const createPaymentMutation = useCreateLendingPayment()
  const updateAccountMutation = useUpdateAccount()
  const updateLendingMutation = useUpdateLending()
  const createTagMutation = useCreateAccountTag()
  const handleCreateTag = (name: string) => { createTagMutation.mutate({ name, color: "" }) }

  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txInitialValues, setTxInitialValues] = useState<{ accountId?: string; type?: string; toAccountId?: string } | undefined>(undefined)

  // 取引インライン編集
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [editTxDate, setEditTxDate] = useState("")
  const [editTxType, setEditTxType] = useState("")
  const [editTxAmount, setEditTxAmount] = useState("")
  const [editTxCounterparty, setEditTxCounterparty] = useState("")
  const [editTxMemo, setEditTxMemo] = useState("")

  const startEditingTx = useCallback((t: { id: string; date: string; type: string; amount: number; counterparty: string; memo: string; accountId: string; fromAccountId: string | null; toAccountId: string | null }) => {
    setEditingTxId(t.id)
    setEditTxDate(t.date)
    setEditTxType(t.type)
    setEditTxAmount(String(t.amount))
    if (t.type === "transfer") {
      const counterpartyId = t.accountId === t.fromAccountId ? t.toAccountId : t.fromAccountId
      setEditTxCounterparty(counterpartyId ?? "")
    } else {
      const match = allAccounts.find((a) => a.name === t.counterparty)
      setEditTxCounterparty(match?.id ?? t.counterparty)
    }
    setEditTxMemo(t.memo)
  }, [allAccounts])

  const cancelEditingTx = useCallback(() => setEditingTxId(null), [])

  const saveEditingTx = useCallback(() => {
    if (!editingTxId) return
    const tx = transactions.find((t) => t.id === editingTxId)
    const acct = allAccounts.find((a) => a.id === editTxCounterparty)
    const patch: Record<string, unknown> = {
      date: editTxDate,
      amount: Number(editTxAmount),
      counterparty: acct?.name ?? editTxCounterparty,
      memo: editTxMemo,
      editedBy: userName,
    }
    if (tx?.type === "transfer" && acct) {
      if (tx.accountId === tx.fromAccountId) {
        patch.toAccountId = acct.id
      } else {
        patch.fromAccountId = acct.id
      }
    }
    updateTxMutation.mutate(
      { id: editingTxId, data: patch },
      {
        onSuccess: () => { toast.success("更新しました"); setEditingTxId(null) },
        onError: () => toast.error("更新に失敗しました"),
      }
    )
  }, [editingTxId, editTxDate, editTxType, editTxAmount, editTxCounterparty, editTxMemo, updateTxMutation, transactions, allAccounts])
  const [lendingModalOpen, setLendingModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentLendingId, setPaymentLendingId] = useState<string | null>(null)
  const [expandedLendings, setExpandedLendings] = useState<Set<string>>(new Set())

  // インライン編集
  const [editing, setEditing] = useState(false)
  const [editPurpose, setEditPurpose] = useState("")
  const [editPolicy, setEditPolicy] = useState("")
  const [editBusinessId, setEditBusinessId] = useState<string | null>(null)
  const [editTags, setEditTags] = useState<string[]>([])

  useEffect(() => {
    if (account) {
      setEditPurpose(account.purpose ?? "")
      setEditPolicy(account.investmentPolicy ?? "")
      setEditBusinessId(account.businessId ?? null)
      setEditTags(account.tags ?? [])
    }
  }, [account])

  const toggleEditTag = (tagName: string) => {
    setEditTags((prev) => prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName])
  }

  const startEditing = () => setEditing(true)
  const cancelEditing = () => {
    setEditPurpose(account?.purpose ?? "")
    setEditPolicy(account?.investmentPolicy ?? "")
    setEditBusinessId(account?.businessId ?? null)
    setEditTags(account?.tags ?? [])
    setEditing(false)
  }
  const saveEditing = () => {
    updateAccountMutation.mutate(
      { id: accountId, data: { purpose: editPurpose, investmentPolicy: editPolicy, businessId: editBusinessId, tags: editTags } },
      {
        onSuccess: () => { toast.success("保存しました"); setEditing(false) },
        onError: () => toast.error("保存に失敗しました"),
      }
    )
  }

  // 口座別サマリー（貸出中・借入中を計算）
  // ペア貸借の場合、counterpartyAccountId側のレコードは除外して重複カウントを防ぐ
  const accountSummary = useMemo(() => {
    let totalLent = 0
    let totalBorrowed = 0
    for (const l of lendings) {
      if (l.status === "completed") continue
      // ペアの相手側レコードは除外（displayLendingsと同じロジック）
      if (l.linkedLendingId && l.accountId !== accountId) continue
      const amt = l.outstanding ?? 0
      const isCounterparty = l.accountId !== accountId
      if (isCounterparty) {
        // 相手口座側から見ているので反転
        if (l.type === "borrow") totalLent += amt
        if (l.type === "lend") totalBorrowed += amt
      } else {
        if (l.type === "lend") totalLent += amt
        if (l.type === "borrow") totalBorrowed += amt
      }
    }
    const balance = account?.balance ?? 0
    return { balance, totalLent, totalBorrowed, netAssets: balance + totalLent - totalBorrowed }
  }, [account, lendings, accountId])

  // 当月の売上・支出・利益
  const INCOME_TYPES = new Set(["revenue", "misc_income", "gain", "interest_receive"])
  const EXPENSE_TYPES = new Set(["misc_expense", "loss", "interest_pay"])
  const monthlyPL = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const monthTxs = transactions.filter(t => {
      if (t.isArchived) return false
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const income = monthTxs.filter(t => INCOME_TYPES.has(t.type)).reduce((s, t) => s + t.amount, 0)
    const expense = monthTxs.filter(t => EXPENSE_TYPES.has(t.type)).reduce((s, t) => s + t.amount, 0)
    return { income, expense, profit: income - expense }
  }, [transactions])

  // ペアの相手側レコードを除外（この口座のaccountId側だけ残す）
  const displayLendings = useMemo(() => {
    return lendings.filter((l) => {
      if (!l.linkedLendingId) return true
      return l.accountId === accountId
    })
  }, [lendings, accountId])

  const loading = accLoading || txLoading || lendLoading

  const toggleLendingExpand = (id: string) => {
    setExpandedLendings((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 overflow-auto">
        <CardSkeleton count={1} />
        <TableSkeleton rows={5} columns={6} />
        <TableSkeleton rows={3} columns={8} />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">口座が見つかりません</p>
        <Button variant="ghost" className="mt-2" onClick={() => router.push("/balance")}>
          <ArrowLeft className="h-4 w-4 mr-1" />戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 overflow-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/balance")} className="h-7 gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />戻る
          </Button>
          <h2 className="text-lg font-bold">{account.name}</h2>
          {account.isArchived && <Badge variant="outline" className="text-xs text-muted-foreground">アーカイブ済み</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setTxInitialValues({ accountId }); setTxModalOpen(true) }} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />入出金・運用履歴登録
          </Button>
          <Button size="sm" onClick={() => setLendingModalOpen(true)} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />貸借登録
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setTxInitialValues({ accountId, type: "transfer" }); setTxModalOpen(true) }} className="h-7 text-xs gap-1">
            <ArrowLeftRight className="h-3.5 w-3.5" />口座振替
          </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => {
            const next = !account.isArchived
            updateAccountMutation.mutate(
              { id: accountId, data: { isArchived: next } },
              {
                onSuccess: () => toast.success(next ? "アーカイブしました" : "アーカイブを解除しました"),
                onError: () => toast.error("操作に失敗しました"),
              }
            )
          }}
        >
          <Archive className="h-3.5 w-3.5" />
          {account.isArchived ? "アーカイブ解除" : "アーカイブ"}
        </Button>
        </div>
      </div>

      {/* 口座別サマリー */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">残高</p>
              <p className={cn("text-lg font-bold tabular-nums", accountSummary.balance >= 0 ? "" : "text-red-600")}>
                {formatCurrency(accountSummary.balance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">貸出中</p>
              <p className="text-lg font-bold text-blue-600 tabular-nums">{formatCurrency(accountSummary.totalLent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">借入中</p>
              <p className="text-lg font-bold text-red-600 tabular-nums">{formatCurrency(accountSummary.totalBorrowed)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">純資産</p>
              <p className={cn("text-lg font-bold tabular-nums", accountSummary.netAssets >= 0 ? "text-emerald-600" : "text-red-600")}>
                {formatCurrency(accountSummary.netAssets)}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">売上</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">{formatCurrency(monthlyPL.income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">支出</p>
              <p className="text-lg font-bold text-red-600 tabular-nums">{formatCurrency(monthlyPL.expense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">利益</p>
              <p className={cn("text-lg font-bold tabular-nums", monthlyPL.profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                {formatCurrency(monthlyPL.profit)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 口座情報カード */}
      <Card>
        <CardHeader className="px-3 py-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">口座情報</CardTitle>
          {!editing ? (
            <Button size="sm" variant="ghost" onClick={startEditing} className="h-7 text-xs gap-1">
              <Pencil className="h-3.5 w-3.5" />編集
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={saveEditing} className="h-7 text-xs gap-1" disabled={updateAccountMutation.isPending}>
                <Check className="h-3.5 w-3.5" />保存
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-7 text-xs gap-1">
                <X className="h-3.5 w-3.5" />取消
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-3 pb-2 pt-0">
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div>
              <p className="text-xs text-muted-foreground">所有区分</p>
              <p className="text-sm font-medium">{OWNER_TYPE_LABELS[account.ownerType]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">口座種別</p>
              <p className="text-sm font-medium">{ACCOUNT_TYPE_LABELS[account.accountType]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">紐づく事業</p>
              {editing ? (
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={editBusinessId ?? "none"} onChange={(e) => setEditBusinessId(e.target.value === "none" ? null : e.target.value)}>
                  <option value="none">なし</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-medium">{account.businessName || "-"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">タグ</p>
              {editing ? (
                <div className="mt-1">
                  <TagSelect allTags={allTags} selectedTags={editTags} onToggle={toggleEditTag} onCreate={handleCreateTag} />
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  <TagSelect allTags={allTags} selectedTags={account.tags ?? []} onToggle={(tagName) => {
                    const current = account.tags ?? []
                    const next = current.includes(tagName) ? current.filter((t) => t !== tagName) : [...current, tagName]
                    updateAccountMutation.mutate({ id: accountId, data: { tags: next } })
                  }} onCreate={handleCreateTag} />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1">目的・用途</p>
              {editing ? (
                <Textarea
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  placeholder="この口座の目的・用途を記入..."
                  className="text-sm min-h-[80px]"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{account.purpose || "-"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">運用方針</p>
              {editing ? (
                <Textarea
                  value={editPolicy}
                  onChange={(e) => setEditPolicy(e.target.value)}
                  placeholder="運用方針を記入..."
                  className="text-sm min-h-[80px]"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{account.investmentPolicy || "-"}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 貸借セクション */}
      <Card>
        <CardHeader className="px-3 py-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">貸借</CardTitle>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showArchivedLending} onChange={(e) => setShowArchivedLending(e.target.checked)} className="rounded" />
            アーカイブのみ表示
          </label>
        </CardHeader>
        <CardContent className="px-3 pb-2 pt-0">
          <Table className="[&_td]:py-1.5 [&_th]:py-1.5">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-24">日付</TableHead>
                <TableHead>やりとり</TableHead>
                <TableHead>貸/借</TableHead>
                <TableHead className="text-right">元本</TableHead>
                <TableHead className="text-right">未返済</TableHead>
                <TableHead>期限</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>メモ</TableHead>
                <TableHead>タグ</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLendings.map((l) => (
                <Fragment key={l.id}>
                  <TableRow className={cn(l.isArchived && "opacity-50")}>
                    <TableCell className="p-1">
                      {l.payments.length > 0 && (
                        <button onClick={() => toggleLendingExpand(l.id)} className="p-1 hover:bg-accent rounded">
                          {expandedLendings.has(l.id)
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.createdAt.split("T")[0]}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {l.linkedLendingId
                        ? (l.type === "lend"
                            ? <>{account.name} <span className="text-muted-foreground">→</span> {l.counterpartyAccountName}</>
                            : <>{l.counterpartyAccountName} <span className="text-muted-foreground">→</span> {account.name}</>)
                        : (l.counterpartyAccountName ?? l.counterparty)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs border", l.type === "lend" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                        {l.type === "lend" ? "貸出" : "借入"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatCurrency(l.principal ?? 0)}</TableCell>
                    <TableCell className={cn("text-sm text-right font-medium tabular-nums", (l.outstanding ?? 0) > 0 ? "text-red-600" : "text-emerald-600")}>
                      {formatCurrency(l.outstanding ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm">{l.dueDate ? formatDate(l.dueDate) : "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs",
                        l.status === "active" && "border-blue-300 text-blue-700",
                        l.status === "completed" && "border-emerald-300 text-emerald-700",
                        l.status === "overdue" && "border-red-300 text-red-700",
                      )}>
                        {LENDING_STATUS_LABELS[l.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px]">
                      <div className="truncate">{l.memo || <span className="text-muted-foreground">-</span>}</div>
                      {l.editedBy && <span className="text-xs text-muted-foreground">最終編集: {l.editedBy}</span>}
                    </TableCell>
                    <TableCell>
                      <TagSelect allTags={allTags} selectedTags={l.tags ?? []} onToggle={(tagName) => {
                        const current = l.tags ?? []
                        const next = current.includes(tagName) ? current.filter((t) => t !== tagName) : [...current, tagName]
                        updateLendingMutation.mutate({ id: l.id, data: { tags: next, editedBy: userName } })
                      }} onCreate={handleCreateTag} size="compact" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {l.status !== "completed" && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setPaymentLendingId(l.id); setPaymentModalOpen(true) }}>
                            返済記録
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const next = !l.isArchived
                            updateLendingMutation.mutate(
                              { id: l.id, data: { isArchived: next } },
                              {
                                onSuccess: () => toast.success(next ? "アーカイブしました" : "アーカイブを解除しました"),
                                onError: () => toast.error("操作に失敗しました"),
                              }
                            )
                          }}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedLendings.has(l.id) && l.payments.map((p) => (
                    <TableRow key={p.id} className="bg-muted/50">
                      <TableCell></TableCell>
                      <TableCell colSpan={1} className="text-xs text-muted-foreground pl-4">
                        返済 {formatDate(p.date)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-emerald-600">
                        -{formatCurrency(p.amount ?? 0)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.memo || ""}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              {displayLendings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                    貸借データなし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 振替セクション */}
      <Card>
        <CardHeader className="px-3 py-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">振替</CardTitle>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showArchivedTransfer} onChange={(e) => setShowArchivedTransfer(e.target.checked)} className="rounded" />
            アーカイブのみ表示
          </label>
        </CardHeader>
        <CardContent className="px-3 pb-2 pt-0">
          <Table className="[&_td]:py-1.5 [&_th]:py-1.5">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">日付</TableHead>
                <TableHead>やりとり</TableHead>
                <TableHead>入/出</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>メモ</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transferTxs.map((t) => {
                const isIncoming = t.toAccountId === accountId
                const fromName = t.fromAccountName ?? "不明"
                const toName = t.toAccountName ?? "不明"
                const isEditing = editingTxId === t.id

                if (isEditing) {
                  return (
                    <TableRow key={t.id} className="bg-muted/30">
                      <TableCell>
                        <Input type="date" value={editTxDate} onChange={(e) => setEditTxDate(e.target.value)} className="h-7 text-xs w-28" />
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {fromName} <span className="text-muted-foreground">→</span> {toName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs border", isIncoming ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                          {isIncoming ? "入金" : "出金"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={editTxAmount} onChange={(e) => setEditTxAmount(e.target.value)} className="h-7 text-xs text-right w-24" />
                      </TableCell>
                      <TableCell>
                        <Input value={editTxMemo} onChange={(e) => setEditTxMemo(e.target.value)} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button size="sm" variant="ghost" onClick={saveEditingTx} className="h-6 w-6 p-0" disabled={updateTxMutation.isPending}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditingTx} className="h-6 w-6 p-0">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }

                return (
                  <TableRow key={t.id} onDoubleClick={() => startEditingTx(t)} className={cn("cursor-pointer", t.isArchived && "opacity-50")}>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(t.date)}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {fromName} <span className="text-muted-foreground">→</span> {toName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs border", isIncoming ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                        {isIncoming ? "入金" : "出金"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatCurrency(t.amount ?? 0)}</TableCell>
                    <TableCell className="text-sm max-w-[200px]">
                      <div>
                        <div className="truncate">{t.memo || <span className="text-muted-foreground">-</span>}</div>
                        {t.editedBy && <span className="text-xs text-muted-foreground">最終編集: {t.editedBy}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" onClick={() => startEditingTx(t)} className="h-6 w-6 p-0">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const next = !t.isArchived
                            updateTxMutation.mutate(
                              { id: t.id, data: { isArchived: next } },
                              {
                                onSuccess: () => toast.success(next ? "アーカイブしました" : "アーカイブを解除しました"),
                                onError: () => toast.error("操作に失敗しました"),
                              }
                            )
                          }}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {transferTxs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    振替データなし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 取引履歴（振替以外） */}
      <Card>
        <CardHeader className="px-3 py-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">取引履歴</CardTitle>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showArchivedTx} onChange={(e) => setShowArchivedTx(e.target.checked)} className="rounded" />
            アーカイブのみ表示
          </label>
        </CardHeader>
        <CardContent className="px-3 pb-2 pt-0">
          <Table className="[&_td]:py-1.5 [&_th]:py-1.5">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">日付</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>メモ</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nonTransferTxs.map((t) => {
                const isPositive = ["deposit", "investment", "borrow", "repayment_receive", "interest_receive", "gain", "revenue", "misc_income"].includes(t.type)
                const isEditing = editingTxId === t.id
                const isAutoType = ["lend", "borrow", "repayment_receive", "repayment_pay", "interest_receive", "interest_pay"].includes(t.type)

                if (isEditing) {
                  return (
                    <TableRow key={t.id} className="bg-muted/30">
                      <TableCell>
                        <Input type="date" value={editTxDate} onChange={(e) => setEditTxDate(e.target.value)} className="h-7 text-xs w-28" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs border", getTxTypeColor(editTxType))}>{EDITABLE_TX_TYPES.find((tt) => tt.value === editTxType)?.label ?? editTxType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={editTxAmount} onChange={(e) => setEditTxAmount(e.target.value)} className="h-7 text-xs text-right w-24" />
                      </TableCell>
                      <TableCell>
                        <Input value={editTxMemo} onChange={(e) => setEditTxMemo(e.target.value)} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button size="sm" variant="ghost" onClick={saveEditingTx} className="h-6 w-6 p-0" disabled={updateTxMutation.isPending}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditingTx} className="h-6 w-6 p-0">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }

                return (
                  <TableRow key={t.id} onDoubleClick={() => !isAutoType && startEditingTx(t)} className={cn(!isAutoType && "cursor-pointer", t.isArchived && "opacity-50")}>
                    <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs border", getTxTypeColor(t.type))}>{t.categoryName}</Badge>
                    </TableCell>
                    <TableCell className={cn("text-sm text-right font-medium tabular-nums", isPositive ? "text-emerald-600" : "text-red-600")}>
                      {isPositive ? "+" : "-"}{formatCurrency(t.amount ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px]">
                      <div>
                        <div className="truncate">{t.memo || <span className="text-muted-foreground">-</span>}</div>
                        {t.editedBy && <span className="text-xs text-muted-foreground">最終編集: {t.editedBy}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {!isAutoType && (
                          <Button size="sm" variant="ghost" onClick={() => startEditingTx(t)} className="h-6 w-6 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const next = !t.isArchived
                            updateTxMutation.mutate(
                              { id: t.id, data: { isArchived: next } },
                              {
                                onSuccess: () => toast.success(next ? "アーカイブしました" : "アーカイブを解除しました"),
                                onError: () => toast.error("操作に失敗しました"),
                              }
                            )
                          }}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {nonTransferTxs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    取引データなし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* モーダル群 */}
      <AccountTransactionModal
        open={txModalOpen}
        onOpenChange={(open) => { setTxModalOpen(open); if (!open) setTxInitialValues(undefined) }}
        accounts={allAccounts}
        initialValues={txInitialValues}
        onSave={(data) => { createTxMutation.mutate(data, { onSuccess: () => toast.success("登録しました"), onError: () => toast.error("登録に失敗しました") }); setTxModalOpen(false) }}
      />
      <LendingModal
        open={lendingModalOpen}
        onOpenChange={setLendingModalOpen}
        accounts={allAccounts}
        initialValues={{ accountId }}
        onSave={(data) => { createLendingMutation.mutate(data, { onSuccess: () => toast.success("貸借を登録しました"), onError: () => toast.error("貸借の登録に失敗しました") }); setLendingModalOpen(false) }}
      />
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        lendingId={paymentLendingId}
        onSave={(data) => { createPaymentMutation.mutate(data, { onSuccess: () => toast.success("返済を記録しました"), onError: () => toast.error("返済の記録に失敗しました") }); setPaymentModalOpen(false) }}
      />
    </div>
  )
}
