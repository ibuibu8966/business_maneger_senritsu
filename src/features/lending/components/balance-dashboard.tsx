"use client"

import { Fragment, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
// Native <select> used instead of Radix Select
// Tabs removed — using nav buttons matching accounting layout
import { Badge } from "@/components/ui/badge"
import { Plus, ChevronDown, ChevronRight, Archive, ArrowLeftRight } from "lucide-react"
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import {
  useAccountDetails,
  useAccountSummary,
  useAccountTransactions,
  useLendings,
  useCreateAccount,
  useCreateAccountTransaction,
  useCreateLending,
  useCreateLendingPayment,
  useUpdateAccountTransaction,
  useUpdateLending,
  useUpdateAccount,
  useAccountTags,
  useCreateAccountTag,
} from "@/hooks/use-lending"
import { useBusinesses } from "@/hooks/use-lending"
import { AccountModal } from "./account-modal"
import { AccountTransactionModal } from "./account-transaction-modal"
import { LendingModal } from "./lending-modal"
import { PaymentModal } from "./payment-modal"
import { TagManagement, getTagColorClass } from "./tag-management"
import { AccountSelectItems } from "./account-select-items"
import type { AccountTransactionDTO, LendingDTO } from "@/types/dto"
import { TagSelect } from "./tag-select"

import { TRANSACTION_TYPE_LABELS, PLUS_TYPES, getTxTypeColor, LENDING_STATUS_LABELS } from "./balance-dashboard/constants"
import type { TxEditField, LendingEditField } from "./balance-dashboard/types"

// ── ドラッグ＆ドロップ対応口座カード ──
function DraggableAccountCard({ account, onClick, allTags, onToggleTag, onCreateTag }: {
  account: { id: string; name: string; balance: number | null; businessName?: string | null; purpose?: string | null; tags?: string[] }
  onClick: () => void
  allTags?: { id: string; name: string; color: string }[]
  onToggleTag?: (tagName: string) => void
  onCreateTag?: (name: string) => void
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: account.id })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: account.id })

  return (
    <div ref={(node) => { setDragRef(node); setDropRef(node) }}>
      <Card
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer",
          isDragging && "opacity-50",
          isOver && !isDragging && "ring-2 ring-primary shadow-lg",
        )}
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        <CardContent className="px-2.5 py-0.5">
          <div className="flex items-center justify-between">
            <p className="text-base font-medium truncate">{account.name}</p>
            {account.businessName && (
              <Badge variant="outline" className="text-xs shrink-0 ml-1 py-0">{account.businessName}</Badge>
            )}
          </div>
          <p className={cn("text-xl font-bold tabular-nums leading-tight", (account.balance ?? 0) >= 0 ? "" : "text-red-600")}>
            {formatCurrency(account.balance ?? 0)}
          </p>
          {allTags && onToggleTag && (
            <div className="mt-0.5">
              <TagSelect allTags={allTags} selectedTags={account.tags ?? []} onToggle={onToggleTag} onCreate={onCreateTag} size="compact" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function BalanceDashboard() {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? ""
  const { data: accounts = [], isLoading: accLoading } = useAccountDetails()
  const { data: summary, isLoading: sumLoading } = useAccountSummary()
  const { data: transactions = [], isLoading: txLoading } = useAccountTransactions()
  const { data: lendings = [], isLoading: lendLoading } = useLendings()
  const { data: businesses = [] } = useBusinesses()
  const { data: allTags = [] } = useAccountTags()
  const router = useRouter()
  const searchParams = useSearchParams()

  const createAccountMutation = useCreateAccount()
  const createTxMutation = useCreateAccountTransaction()
  const createLendingMutation = useCreateLending()
  const createPaymentMutation = useCreateLendingPayment()
  const updateTxMutation = useUpdateAccountTransaction()
  const updateLendingMutation = useUpdateLending()
  const updateAccountMutation = useUpdateAccount()
  const createTagMutation = useCreateAccountTag()

  const handleCreateTag = (name: string) => {
    createTagMutation.mutate({ name, color: "" })
  }

  // ── DnD振替 ──
  const [dragActiveId, setDragActiveId] = useState<string | null>(null)
  const [txInitialValues, setTxInitialValues] = useState<{ accountId?: string; type?: string; toAccountId?: string } | undefined>(undefined)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const handleDragEnd = (event: DragEndEvent) => {
    setDragActiveId(null)
    const { active, over } = event
    if (over && active.id !== over.id) {
      setTxInitialValues({ accountId: String(active.id), type: "transfer", toAccountId: String(over.id) })
      setTxModalOpen(true)
    }
  }

  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [lendingModalOpen, setLendingModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentLendingId, setPaymentLendingId] = useState<string | null>(null)
  const [expandedLendings, setExpandedLendings] = useState<Set<string>>(new Set())

  // フィルター
  const [selectedTag, setSelectedTag] = useState<string>("all")
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all")
  const [txAccountFilter, setTxAccountFilter] = useState<string>("all")
  const [lendingTypeFilter, setLendingTypeFilter] = useState<string>("all")
  const [lendingStatusFilter, setLendingStatusFilter] = useState<string>("all")
  const [showArchived, setShowArchived] = useState(false)
  const [showArchivedTx, setShowArchivedTx] = useState(false)
  const [showArchivedLending, setShowArchivedLending] = useState(false)
  const activeTab = searchParams.get("tab") ?? "overview"
  const setActiveTab = (tab: string) => {
    router.push(tab === "overview" ? "/balance" : `/balance?tab=${tab}`)
  }

  // ── 取引インライン編集 ──
  const [txEditId, setTxEditId] = useState<string | null>(null)
  const [txEditField, setTxEditField] = useState<TxEditField | null>(null)
  const [txEditValue, setTxEditValue] = useState("")


  const startTxEdit = (t: AccountTransactionDTO, field: TxEditField) => {
    setTxEditId(t.id)
    setTxEditField(field)
    switch (field) {
      case "date": setTxEditValue(t.date); break
      case "type": setTxEditValue(t.type); break
      case "amount": setTxEditValue(String(t.amount)); break
      case "counterparty": {
        if (t.type === "transfer") {
          // 自分がfrom側なら相手はto、自分がto側なら相手はfrom
          const counterpartyId = t.accountId === t.fromAccountId ? t.toAccountId : t.fromAccountId
          setTxEditValue(counterpartyId ?? "")
        } else {
          const match = accounts.find((a) => a.name === t.counterparty)
          setTxEditValue(match?.id ?? "")
        }
        break
      }
      case "memo": setTxEditValue(t.memo); break
    }
  }
  const isTxEditing = (id: string, field: TxEditField) => txEditId === id && txEditField === field
  const cancelTxEdit = () => { setTxEditId(null); setTxEditField(null); setTxEditValue("") }
  const saveTxEdit = () => {
    if (!txEditId || !txEditField) return
    const tx = transactions.find((t) => t.id === txEditId)
    if (!tx) { cancelTxEdit(); return }
    let oldVal: string
    if (txEditField === "amount") oldVal = String(tx.amount)
    else if (txEditField === "counterparty") oldVal = tx.counterparty ?? ""
    else oldVal = tx[txEditField]
    if (txEditValue === oldVal) { cancelTxEdit(); return }
    const patch: Record<string, unknown> = { editedBy: userName }
    if (txEditField === "amount") patch.amount = Number(txEditValue)
    else patch[txEditField] = txEditValue
    updateTxMutation.mutate({ id: txEditId, data: patch })
    cancelTxEdit()
  }
  const saveTxSelect = (value: string) => {
    if (!txEditId || !txEditField) return
    const patch: Record<string, unknown> = { editedBy: userName }
    if (txEditField === "counterparty") {
      const tx = transactions.find((t) => t.id === txEditId)
      const acct = accounts.find((a) => a.id === value)
      patch.counterparty = acct?.name ?? value
      if (tx?.type === "transfer") {
        // 自分がfrom側なら相手はto、自分がto側なら相手はfrom
        if (tx.accountId === tx.fromAccountId) {
          patch.toAccountId = value
        } else {
          patch.fromAccountId = value
        }
      }
    } else {
      patch[txEditField] = value
    }
    updateTxMutation.mutate({ id: txEditId, data: patch })
    cancelTxEdit()
  }
  const handleTxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) saveTxEdit()
    if (e.key === "Escape") cancelTxEdit()
  }

  // ── 貸借インライン編集 ──
  const [lendEditId, setLendEditId] = useState<string | null>(null)
  const [lendEditField, setLendEditField] = useState<LendingEditField | null>(null)
  const [lendEditValue, setLendEditValue] = useState("")

  const startLendEdit = (l: LendingDTO, field: LendingEditField) => {
    setLendEditId(l.id)
    setLendEditField(field)
    switch (field) {
      case "counterparty": setLendEditValue(l.counterpartyAccountId ?? ""); break
      case "outstanding": setLendEditValue(String(l.outstanding ?? 0)); break
      case "dueDate": setLendEditValue(l.dueDate ?? ""); break
      case "status": setLendEditValue(l.status); break
      case "memo": setLendEditValue(l.memo); break
    }
  }
  const isLendEditing = (id: string, field: LendingEditField) => lendEditId === id && lendEditField === field
  const cancelLendEdit = () => { setLendEditId(null); setLendEditField(null); setLendEditValue("") }
  const saveLendEdit = () => {
    if (!lendEditId || !lendEditField) return
    const l = lendings.find((x) => x.id === lendEditId)
    if (!l) { cancelLendEdit(); return }
    let oldVal: string
    if (lendEditField === "outstanding") oldVal = String(l.outstanding ?? 0)
    else if (lendEditField === "dueDate") oldVal = l.dueDate ?? ""
    else if (lendEditField === "counterparty") oldVal = l.counterparty ?? ""
    else oldVal = l[lendEditField]
    if (lendEditValue === oldVal) { cancelLendEdit(); return }
    const patch: Record<string, unknown> = { editedBy: userName }
    if (lendEditField === "outstanding") patch.outstanding = Number(lendEditValue)
    else if (lendEditField === "dueDate") patch.dueDate = lendEditValue || null
    else patch[lendEditField] = lendEditValue
    updateLendingMutation.mutate({ id: lendEditId, data: patch })
    cancelLendEdit()
  }
  const saveLendSelect = (value: string) => {
    if (!lendEditId || !lendEditField) return
    const patch: Record<string, unknown> = { editedBy: userName }
    if (lendEditField === "counterparty") {
      const acct = accounts.find((a) => a.id === value)
      patch.counterparty = acct?.name ?? value
      patch.counterpartyAccountId = value
    } else {
      patch[lendEditField] = value
    }
    updateLendingMutation.mutate({ id: lendEditId, data: patch })
    cancelLendEdit()
  }
  const handleLendKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) saveLendEdit()
    if (e.key === "Escape") cancelLendEdit()
  }

  const loading = accLoading || sumLoading || txLoading || lendLoading

  // タグ連動サマリー（タグ選択時はクライアントサイドで再計算）
  const filteredSummary = useMemo(() => {
    if (selectedTag === "all") return summary
    const taggedAccountIds = new Set(
      accounts.filter(a => !a.isArchived && a.ownerType === "internal" && (a.tags ?? []).includes(selectedTag)).map(a => a.id)
    )
    let totalBalance = 0
    for (const a of accounts) {
      if (taggedAccountIds.has(a.id)) totalBalance += a.balance
    }
    let totalLent = 0, totalBorrowed = 0
    const countedPairs = new Set<string>()
    for (const l of lendings) {
      if (l.status === "completed") continue
      if (!taggedAccountIds.has(l.accountId)) continue
      if (l.linkedLendingId) {
        const pairKey = [l.id, l.linkedLendingId].sort().join("-")
        if (countedPairs.has(pairKey)) continue
        countedPairs.add(pairKey)
      }
      if (l.type === "lend") totalLent += l.outstanding
      if (l.type === "borrow") totalBorrowed += l.outstanding
    }
    return { totalBalance, totalLent, totalBorrowed, netAssets: totalBalance + totalLent - totalBorrowed }
  }, [selectedTag, summary, accounts, lendings])

  // タグフィルタ済み口座IDセット（取引・貸借テーブルの連動用）
  const taggedAccountIdSet = useMemo(() => {
    if (selectedTag === "all") return null
    return new Set(accounts.filter(a => (a.tags ?? []).includes(selectedTag)).map(a => a.id))
  }, [selectedTag, accounts])

  // 当月の売上・支出・利益
  const INCOME_TYPES = new Set(["revenue", "misc_income", "gain", "interest_receive"])
  const EXPENSE_TYPES = new Set(["misc_expense", "loss", "interest_pay"])
  const monthlyPL = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const monthTxs = transactions.filter(t => {
      if (t.isArchived) return false
      if (taggedAccountIdSet && !taggedAccountIdSet.has(t.accountId)) return false
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const income = monthTxs.filter(t => INCOME_TYPES.has(t.type)).reduce((s, t) => s + t.amount, 0)
    const expense = monthTxs.filter(t => EXPENSE_TYPES.has(t.type)).reduce((s, t) => s + t.amount, 0)
    return { income, expense, profit: income - expense, month: now.getMonth() + 1 }
  }, [transactions, taggedAccountIdSet])

  // アーカイブフィルタ + タグフィルタ
  const visibleAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (showArchived ? !a.isArchived : a.isArchived) return false
      if (selectedTag !== "all" && !(a.tags ?? []).includes(selectedTag)) return false
      return true
    })
  }, [accounts, showArchived, selectedTag])

  // 口座をセクション分け
  const accountSections = useMemo(() => {
    const sections = [
      { key: "internal-bank", label: "社内銀行口座", items: visibleAccounts.filter((a) => a.ownerType === "internal" && a.accountType === "bank") },
      { key: "internal-securities", label: "社内証券口座", items: visibleAccounts.filter((a) => a.ownerType === "internal" && a.accountType === "securities") },
      { key: "external-bank", label: "社外銀行口座", items: visibleAccounts.filter((a) => a.ownerType === "external" && a.accountType === "bank") },
      { key: "external-other", label: "社外証券口座", items: visibleAccounts.filter((a) => a.ownerType === "external" && a.accountType === "securities") },
    ]
    return sections.filter((s) => s.items.length > 0)
  }, [visibleAccounts])

  // フィルタリング
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 振替は別セクションで表示
      if (t.type === "transfer") return false
      // アーカイブフィルタ
      if (showArchivedTx ? !t.isArchived : t.isArchived) return false
      if (txTypeFilter !== "all" && t.type !== txTypeFilter) return false
      if (txAccountFilter !== "all" && t.accountId !== txAccountFilter) return false
      // タグフィルタ
      if (taggedAccountIdSet && !taggedAccountIdSet.has(t.accountId)) return false
      return true
    })
  }, [transactions, txTypeFilter, txAccountFilter, showArchivedTx, taggedAccountIdSet])

  const filteredTransfers = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== "transfer") return false
      // ペアの片方だけ表示
      if (t.linkedTransferId && t.id > t.linkedTransferId) return false
      if (showArchivedTx ? !t.isArchived : t.isArchived) return false
      if (txAccountFilter !== "all" && t.accountId !== txAccountFilter) return false
      if (taggedAccountIdSet && !taggedAccountIdSet.has(t.accountId)) return false
      return true
    })
  }, [transactions, txAccountFilter, showArchivedTx, taggedAccountIdSet])

  const filteredLendings = useMemo(() => {
    return lendings.filter((l) => {
      // ペアの相手側を除外（IDが若い方だけ残す）
      if (l.linkedLendingId && l.id > l.linkedLendingId) return false
      // アーカイブフィルタ
      if (showArchivedLending ? !l.isArchived : l.isArchived) return false
      if (lendingTypeFilter !== "all" && l.type !== lendingTypeFilter) return false
      if (lendingStatusFilter !== "all" && l.status !== lendingStatusFilter) return false
      // タグフィルタ
      if (taggedAccountIdSet && !taggedAccountIdSet.has(l.accountId)) return false
      return true
    })
  }, [lendings, lendingTypeFilter, lendingStatusFilter, showArchivedLending, taggedAccountIdSet])

  const toggleLendingExpand = (id: string) => {
    setExpandedLendings((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleLendingTag = (l: LendingDTO, tagName: string) => {
    const current = l.tags ?? []
    const next = current.includes(tagName) ? current.filter((t) => t !== tagName) : [...current, tagName]
    updateLendingMutation.mutate({ id: l.id, data: { tags: next, editedBy: userName } })
  }

  // アーカイブ操作
  const archiveTx = (id: string, isArchived: boolean) => {
    updateTxMutation.mutate(
      { id, data: { isArchived } },
      { onSuccess: () => toast.success(isArchived ? "アーカイブしました" : "アーカイブを解除しました") }
    )
  }
  const archiveLending = (id: string, isArchived: boolean) => {
    updateLendingMutation.mutate(
      { id, data: { isArchived } },
      { onSuccess: () => toast.success(isArchived ? "アーカイブしました" : "アーカイブを解除しました") }
    )
  }

  const toggleTxTag = (tx: AccountTransactionDTO, tagName: string) => {
    const current = tx.tags ?? []
    const next = current.includes(tagName) ? current.filter((t) => t !== tagName) : [...current, tagName]
    updateTxMutation.mutate({ id: tx.id, data: { tags: next } })
  }

  const toggleAccountTag = (accountId: string, currentTags: string[], tagName: string) => {
    const next = currentTags.includes(tagName) ? currentTags.filter((t) => t !== tagName) : [...currentTags, tagName]
    updateAccountMutation.mutate({ id: accountId, data: { tags: next } })
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 overflow-auto">
        <CardSkeleton count={4} />
        <CardSkeleton count={4} />
        <TableSkeleton rows={5} columns={10} />
        <TableSkeleton rows={5} columns={6} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-[53px] border-b px-4 overflow-x-auto">
        <nav className="flex gap-2 h-full items-center min-w-max">
          {[
            { key: "overview", label: "全体" },
            { key: "accounts", label: "口座一覧" },
            { key: "transactions", label: "入出金・運用履歴" },
            { key: "lending", label: "貸借履歴" },
            { key: "tags", label: "タグ管理" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* ── 全体タブ ── */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* タグフィルター */}
            {allTags.length > 0 && (
              <div className="inline-flex items-center rounded-lg border bg-muted p-0.5 gap-0.5">
                <button
                  onClick={() => setSelectedTag("all")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
                    selectedTag === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  すべて
                </button>
                {allTags.map((tag) => {
                  const isActive = selectedTag === tag.name
                  return (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTag(isActive ? "all" : tag.name)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tag.color && (
                        <span className={cn(
                          "inline-block w-2 h-2 rounded-full shrink-0",
                          getTagColorClass(tag.color).split(" ")[0] || "bg-muted-foreground"
                        )} />
                      )}
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            )}

            {/* サマリーカード */}
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <Card>
                  <CardContent className="px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">総残高</p>
                    <p className="text-lg font-bold tabular-nums">{formatCurrency(filteredSummary?.totalBalance ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">貸付残高</p>
                    <p className="text-lg font-bold text-blue-600 tabular-nums">{formatCurrency(filteredSummary?.totalLent ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">借入残高</p>
                    <p className="text-lg font-bold text-red-600 tabular-nums">{formatCurrency(filteredSummary?.totalBorrowed ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">純資産</p>
                    <p className={cn("text-lg font-bold tabular-nums", (filteredSummary?.netAssets ?? 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {formatCurrency(filteredSummary?.netAssets ?? 0)}
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

            {/* アクションボタン */}
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setAccountModalOpen(true)} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />口座登録
              </Button>
              <Button size="sm" onClick={() => setTxModalOpen(true)} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />入出金・運用履歴登録
              </Button>
              <Button size="sm" onClick={() => setLendingModalOpen(true)} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />貸借登録
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setTxInitialValues({ type: "transfer" }); setTxModalOpen(true) }} className="h-7 text-xs gap-1">
                <ArrowLeftRight className="h-3.5 w-3.5" />口座振替
              </Button>
            </div>

            {/* 口座カードグリッド（DnD対応） */}
            <DndContext id="balance-dnd-main" sensors={sensors} onDragStart={(e) => setDragActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
              {accountSections.map((section) => (
                <div key={section.key}>
                  <h3 className="text-sm font-semibold border-l-[3px] border-primary pl-2 mb-2">{section.label}</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {section.items.map((a) => (
                      <DraggableAccountCard
                        key={a.id}
                        account={a}
                        onClick={() => router.push(`/balance/${a.id}`)}
                        allTags={allTags}
                        onToggleTag={(tagName) => toggleAccountTag(a.id, a.tags ?? [], tagName)}
                        onCreateTag={handleCreateTag}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <DragOverlay>
                {dragActiveId ? (() => {
                  const a = accounts.find((acc) => acc.id === dragActiveId)
                  if (!a) return null
                  return (
                    <Card className="shadow-lg opacity-80 w-[200px]">
                      <CardContent className="px-3 py-1">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className={cn("text-lg font-bold tabular-nums", (a.balance ?? 0) >= 0 ? "" : "text-red-600")}>
                          {formatCurrency(a.balance ?? 0)}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })() : null}
              </DragOverlay>
            </DndContext>

            {/* 最近の貸借 */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">最近の貸借</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Table>
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
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lendings.filter((l) => !l.isArchived && l.status !== "completed" && !(l.linkedLendingId && l.id > l.linkedLendingId)).slice(0, 5).map((l) => (
                      <Fragment key={l.id}>
                        <TableRow className="">
                          <TableCell className="p-1">
                            {l.payments.length > 0 && (
                              <button onClick={() => toggleLendingExpand(l.id)} className="p-1 hover:bg-accent rounded">
                                {expandedLendings.has(l.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.createdAt.split("T")[0]}</TableCell>
                          <TableCell className="text-sm font-medium" onDoubleClick={() => startLendEdit(l, "counterparty")}>
                            {isLendEditing(l.id, "counterparty") ? (
                              <select autoFocus className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={lendEditValue} onChange={(e) => { if (e.target.value) saveLendSelect(e.target.value) }} onBlur={() => { setTimeout(() => cancelLendEdit(), 150) }}>
                                  <AccountSelectItems accounts={accounts} />
                              </select>
                            ) : (
                              <span className="cursor-text">
                                {l.type === "lend"
                                  ? <>{l.accountName} <span className="text-muted-foreground">→</span> {l.counterpartyAccountName ?? l.counterparty}</>
                                  : <>{l.counterpartyAccountName ?? l.counterparty} <span className="text-muted-foreground">→</span> {l.accountName}</>}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs border", l.type === "lend" ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800")}>
                              {l.type === "lend" ? "貸出" : "借入"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{formatCurrency(l.principal ?? 0)}</TableCell>
                          <TableCell className={cn("text-sm text-right font-medium tabular-nums", (l.outstanding ?? 0) > 0 ? "text-red-600" : "text-emerald-600")} onDoubleClick={() => startLendEdit(l, "outstanding")}>
                            {isLendEditing(l.id, "outstanding") ? (
                              <Input type="number" autoFocus value={lendEditValue} onChange={(e) => setLendEditValue(e.target.value)} onKeyDown={handleLendKeyDown} onBlur={saveLendEdit} className="h-7 text-sm text-right w-28" />
                            ) : (
                              <span className="cursor-text">{formatCurrency(l.outstanding ?? 0)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm" onDoubleClick={() => startLendEdit(l, "dueDate")}>
                            {isLendEditing(l.id, "dueDate") ? (
                              <Input type="date" autoFocus value={lendEditValue} onChange={(e) => setLendEditValue(e.target.value)} onKeyDown={handleLendKeyDown} onBlur={saveLendEdit} className="h-7 text-sm w-32" />
                            ) : (
                              <span className="cursor-text">{l.dueDate ? formatDate(l.dueDate) : "-"}</span>
                            )}
                          </TableCell>
                          <TableCell onDoubleClick={() => startLendEdit(l, "status")}>
                            {isLendEditing(l.id, "status") ? (
                              <select autoFocus className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-24" value={lendEditValue} onChange={(e) => { if (e.target.value) saveLendSelect(e.target.value) }} onBlur={() => { setTimeout(() => cancelLendEdit(), 150) }}>
                                <option value="active">返済中</option>
                                <option value="completed">完済</option>
                                <option value="overdue">延滞</option>
                              </select>
                            ) : (
                              <Badge variant="outline" className={cn("text-xs cursor-text",
                                l.status === "active" && "border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300",
                                l.status === "completed" && "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300",
                                l.status === "overdue" && "border-red-300 dark:border-red-700 text-red-700 dark:text-red-300",
                              )}>
                                {LENDING_STATUS_LABELS[l.status]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px]" onDoubleClick={() => startLendEdit(l, "memo")}>
                            {isLendEditing(l.id, "memo") ? (
                              <Input autoFocus value={lendEditValue} onChange={(e) => setLendEditValue(e.target.value)} onKeyDown={handleLendKeyDown} onBlur={saveLendEdit} className="h-7 text-sm" />
                            ) : (
                              <div className="cursor-text">
                                <div className="truncate">{l.memo || <span className="text-muted-foreground">-</span>}</div>
                                {l.editedBy && <span className="text-xs text-muted-foreground">最終編集: {l.editedBy}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <TagSelect allTags={allTags} selectedTags={l.tags ?? []} onToggle={(tagName) => toggleLendingTag(l, tagName)} onCreate={handleCreateTag} size="compact" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {l.status !== "completed" && (
                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setPaymentLendingId(l.id); setPaymentModalOpen(true) }}>
                                  返済
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => archiveLending(l.id, !l.isArchived)}>
                                <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedLendings.has(l.id) && l.payments.map((p) => (
                          <TableRow key={p.id} className="bg-muted/50">
                            <TableCell></TableCell>
                            <TableCell colSpan={2} className="text-xs text-muted-foreground pl-8">
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
                    {lendings.filter((l) => !l.isArchived && l.status !== "completed" && !(l.linkedLendingId && l.id > l.linkedLendingId)).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">未返済の貸借なし</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 最近の振替 */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">最近の振替</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">日付</TableHead>
                      <TableHead>やりとり</TableHead>
                      <TableHead>入/出</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>メモ</TableHead>
                      <TableHead>タグ</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransfers.filter((t) => !t.isArchived).slice(0, 10).map((t) => {
                      const isIncoming = t.toAccountId === t.accountId
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(t.date)}</TableCell>
                          <TableCell className="text-sm">{t.fromAccountName ?? "-"} → {t.toAccountName ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs border", isIncoming ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800")}>
                              {isIncoming ? "入金" : "出金"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-right font-medium tabular-nums" onDoubleClick={() => startTxEdit(t, "amount")}>
                            {isTxEditing(t.id, "amount") ? (
                              <Input type="number" autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm text-right w-24" />
                            ) : (
                              <span className="cursor-text">{formatCurrency(t.amount ?? 0)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px]" onDoubleClick={() => startTxEdit(t, "memo")}>
                            {isTxEditing(t.id, "memo") ? (
                              <Input autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm" />
                            ) : (
                              <div className="cursor-text">
                                <div className="truncate">{t.memo || <span className="text-muted-foreground">-</span>}</div>
                                {t.editedBy && <span className="text-xs text-muted-foreground">最終編集: {t.editedBy}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <TagSelect allTags={allTags} selectedTags={t.tags ?? []} onToggle={(tagName) => toggleTxTag(t, tagName)} onCreate={handleCreateTag} size="compact" />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => archiveTx(t.id, !t.isArchived)}>
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredTransfers.filter((t) => !t.isArchived).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">振替データなし</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 最近の入出金・運用履歴 */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">最近の入出金・運用履歴</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">No.</TableHead>
                      <TableHead className="w-24">日付</TableHead>
                      <TableHead>口座</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>メモ</TableHead>
                      <TableHead>タグ</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.filter((t) => !t.isArchived && t.type !== "transfer").slice(0, 10).map((t) => {
                      const isPositive = ["initial", "deposit", "investment", "borrow", "repayment_receive", "interest_receive", "gain"].includes(t.type)
                      return (
                        <TableRow key={t.id} className="">
                          <TableCell className="text-xs text-muted-foreground tabular-nums">#{t.serialNumber}</TableCell>
                          <TableCell className="text-sm" onDoubleClick={() => startTxEdit(t, "date")}>
                            {isTxEditing(t.id, "date") ? (
                              <Input type="date" autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm w-32" />
                            ) : (
                              <span className="cursor-text">{formatDate(t.date)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{t.accountName}</TableCell>
                          <TableCell>
                              <Badge variant="outline" className={cn("text-xs border", getTxTypeColor(t.type))}>{t.categoryName}</Badge>
                          </TableCell>
                          <TableCell className={cn("text-sm text-right font-medium tabular-nums", isPositive ? "text-emerald-600" : "text-red-600")} onDoubleClick={() => startTxEdit(t, "amount")}>
                            {isTxEditing(t.id, "amount") ? (
                              <Input type="number" autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm text-right w-24" />
                            ) : (
                              <span className="cursor-text">{isPositive ? "+" : "-"}{formatCurrency(t.amount ?? 0)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px]" onDoubleClick={() => startTxEdit(t, "memo")}>
                            {isTxEditing(t.id, "memo") ? (
                              <Input autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm" />
                            ) : (
                              <div className="cursor-text">
                                <div className="truncate">{t.memo || <span className="text-muted-foreground">-</span>}</div>
                                {t.editedBy && <span className="text-xs text-muted-foreground">最終編集: {t.editedBy}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <TagSelect allTags={allTags} selectedTags={t.tags ?? []} onToggle={(tagName) => toggleTxTag(t, tagName)} onCreate={handleCreateTag} size="compact" />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => archiveTx(t.id, !t.isArchived)}>
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {transactions.filter((t) => !t.isArchived && t.type !== "transfer").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">取引データなし</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── 口座一覧タブ ── */}
        {activeTab === "accounts" && (
          <div className="space-y-4">
            {/* タグフィルター */}
            {allTags.length > 0 && (
              <div className="inline-flex items-center rounded-lg border bg-muted p-0.5 gap-0.5">
                <button
                  onClick={() => setSelectedTag("all")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
                    selectedTag === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  すべて
                </button>
                {allTags.map((tag) => {
                  const isActive = selectedTag === tag.name
                  return (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTag(isActive ? "all" : tag.name)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tag.color && (
                        <span className={cn(
                          "inline-block w-2 h-2 rounded-full shrink-0",
                          getTagColorClass(tag.color).split(" ")[0] || "bg-muted-foreground"
                        )} />
                      )}
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived((v) => !v)} className="h-7 text-xs">
                アーカイブ
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAccountModalOpen(true)} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />口座追加
              </Button>
            </div>
            <DndContext id="balance-dnd-mobile" sensors={sensors} onDragStart={(e) => setDragActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
              {accountSections.map((section) => (
                <div key={section.key}>
                  <h3 className="text-sm font-semibold border-l-[3px] border-primary pl-2 mb-2">{section.label}</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {section.items.map((a) => (
                      <DraggableAccountCard
                        key={a.id}
                        account={a}
                        onClick={() => router.push(`/balance/${a.id}`)}
                        allTags={allTags}
                        onToggleTag={(tagName) => toggleAccountTag(a.id, a.tags ?? [], tagName)}
                        onCreateTag={handleCreateTag}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <DragOverlay>
                {dragActiveId ? (() => {
                  const a = accounts.find((acc) => acc.id === dragActiveId)
                  if (!a) return null
                  return (
                    <Card className="shadow-lg opacity-80 w-[200px]">
                      <CardContent className="px-3 py-1">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className={cn("text-lg font-bold tabular-nums", (a.balance ?? 0) >= 0 ? "" : "text-red-600")}>
                          {formatCurrency(a.balance ?? 0)}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })() : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* ── 入出金・運用履歴タブ ── */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            {/* 振替 */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">振替</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">日付</TableHead>
                      <TableHead>やりとり</TableHead>
                      <TableHead>入/出</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>メモ</TableHead>
                      <TableHead>タグ</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransfers.slice(0, 50).map((t) => {
                      const isIncoming = t.toAccountId === t.accountId
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(t.date)}</TableCell>
                          <TableCell className="text-sm">{t.fromAccountName ?? "-"} → {t.toAccountName ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs border", isIncoming ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800")}>
                              {isIncoming ? "入金" : "出金"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-right font-medium tabular-nums" onDoubleClick={() => startTxEdit(t, "amount")}>
                            {isTxEditing(t.id, "amount") ? (
                              <Input type="number" autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm text-right w-24" />
                            ) : (
                              <span className="cursor-text">{formatCurrency(t.amount ?? 0)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px]" onDoubleClick={() => startTxEdit(t, "memo")}>
                            {isTxEditing(t.id, "memo") ? (
                              <Input autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm" />
                            ) : (
                              <div className="cursor-text">
                                <div className="truncate">{t.memo || <span className="text-muted-foreground">-</span>}</div>
                                {t.editedBy && <span className="text-xs text-muted-foreground">最終編集: {t.editedBy}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <TagSelect allTags={allTags} selectedTags={t.tags ?? []} onToggle={(tagName) => toggleTxTag(t, tagName)} onCreate={handleCreateTag} size="compact" />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => archiveTx(t.id, !t.isArchived)}>
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredTransfers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">振替データなし</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 入出金・運用履歴 */}
            <Card>
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-medium">入出金・運用履歴</CardTitle>
                  <Button size="sm" onClick={() => setTxModalOpen(true)} className="h-7 text-xs gap-1">
                    <Plus className="h-3.5 w-3.5" />新規登録
                  </Button>
                </div>
                <div className="flex gap-2">
                  <select className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-28" value={txTypeFilter} onChange={(e) => setTxTypeFilter(e.target.value)}>
                    <option value="all">全カテゴリ</option>
                    {Object.entries(TRANSACTION_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <select className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-32" value={txAccountFilter} onChange={(e) => setTxAccountFilter(e.target.value)}>
                    <option value="all">全口座</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <Button size="sm" variant={showArchivedTx ? "default" : "outline"} className="h-7 text-xs" onClick={() => setShowArchivedTx((v) => !v)}>
                    アーカイブ
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">No.</TableHead>
                      <TableHead className="w-24">日付</TableHead>
                      <TableHead>口座</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>メモ</TableHead>
                      <TableHead>タグ</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.slice(0, 50).map((t) => {
                      const isPositive = ["initial", "deposit", "investment", "borrow", "repayment_receive", "interest_receive", "gain"].includes(t.type)
                      return (
                        <TableRow key={t.id} className="">
                          <TableCell className="text-xs text-muted-foreground tabular-nums">#{t.serialNumber}</TableCell>
                          <TableCell className="text-sm" onDoubleClick={() => startTxEdit(t, "date")}>
                            {isTxEditing(t.id, "date") ? (
                              <Input type="date" autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm w-32" />
                            ) : (
                              <span className="cursor-text">{formatDate(t.date)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{t.accountName}</TableCell>
                          <TableCell>
                              <Badge variant="outline" className={cn("text-xs border", getTxTypeColor(t.type))}>{t.categoryName}</Badge>
                          </TableCell>
                          <TableCell className={cn("text-sm text-right font-medium tabular-nums", isPositive ? "text-emerald-600" : "text-red-600")} onDoubleClick={() => startTxEdit(t, "amount")}>
                            {isTxEditing(t.id, "amount") ? (
                              <Input type="number" autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm text-right w-24" />
                            ) : (
                              <span className="cursor-text">{isPositive ? "+" : "-"}{formatCurrency(t.amount ?? 0)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px]" onDoubleClick={() => startTxEdit(t, "memo")}>
                            {isTxEditing(t.id, "memo") ? (
                              <Input autoFocus value={txEditValue} onChange={(e) => setTxEditValue(e.target.value)} onKeyDown={handleTxKeyDown} onBlur={saveTxEdit} className="h-7 text-sm" />
                            ) : (
                              <div className="cursor-text">
                                <div className="truncate">{t.memo || <span className="text-muted-foreground">-</span>}</div>
                                {t.editedBy && <span className="text-xs text-muted-foreground">最終編集: {t.editedBy}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <TagSelect allTags={allTags} selectedTags={t.tags ?? []} onToggle={(tagName) => toggleTxTag(t, tagName)} onCreate={handleCreateTag} size="compact" />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => archiveTx(t.id, !t.isArchived)}>
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                          取引データなし
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── 貸借履歴タブ ── */}
        {activeTab === "lending" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-medium">貸借履歴</CardTitle>
                  <Button size="sm" onClick={() => setLendingModalOpen(true)} className="h-7 text-xs gap-1">
                    <Plus className="h-3.5 w-3.5" />新規登録
                  </Button>
                </div>
                <div className="flex gap-2">
                  <select className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-24" value={lendingTypeFilter} onChange={(e) => setLendingTypeFilter(e.target.value)}>
                    <option value="all">全て</option>
                    <option value="lend">貸出</option>
                    <option value="borrow">借入</option>
                  </select>
                  <select className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-24" value={lendingStatusFilter} onChange={(e) => setLendingStatusFilter(e.target.value)}>
                    <option value="all">全て</option>
                    <option value="active">返済中</option>
                    <option value="completed">完済</option>
                    <option value="overdue">延滞</option>
                  </select>
                  <Button size="sm" variant={showArchivedLending ? "default" : "outline"} className="h-7 text-xs" onClick={() => setShowArchivedLending((v) => !v)}>
                    アーカイブ
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Table>
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
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLendings.map((l) => (
                      <Fragment key={l.id}>
                        <TableRow className="">
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
                          <TableCell className="text-sm font-medium" onDoubleClick={() => startLendEdit(l, "counterparty")}>
                            {isLendEditing(l.id, "counterparty") ? (
                              <select autoFocus className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={lendEditValue} onChange={(e) => { if (e.target.value) saveLendSelect(e.target.value) }} onBlur={() => { setTimeout(() => cancelLendEdit(), 150) }}>
                                  <AccountSelectItems accounts={accounts} />
                              </select>
                            ) : (
                              <span className="cursor-text">
                                {l.type === "lend"
                                  ? <>{l.accountName} <span className="text-muted-foreground">→</span> {l.counterpartyAccountName ?? l.counterparty}</>
                                  : <>{l.counterpartyAccountName ?? l.counterparty} <span className="text-muted-foreground">→</span> {l.accountName}</>}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs border", l.type === "lend" ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800")}>
                              {l.type === "lend" ? "貸出" : "借入"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{formatCurrency(l.principal ?? 0)}</TableCell>
                          <TableCell className={cn("text-sm text-right font-medium tabular-nums", (l.outstanding ?? 0) > 0 ? "text-red-600" : "text-emerald-600")} onDoubleClick={() => startLendEdit(l, "outstanding")}>
                            {isLendEditing(l.id, "outstanding") ? (
                              <Input type="number" autoFocus value={lendEditValue} onChange={(e) => setLendEditValue(e.target.value)} onKeyDown={handleLendKeyDown} onBlur={saveLendEdit} className="h-7 text-sm text-right w-28" />
                            ) : (
                              <span className="cursor-text">{formatCurrency(l.outstanding ?? 0)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm" onDoubleClick={() => startLendEdit(l, "dueDate")}>
                            {isLendEditing(l.id, "dueDate") ? (
                              <Input type="date" autoFocus value={lendEditValue} onChange={(e) => setLendEditValue(e.target.value)} onKeyDown={handleLendKeyDown} onBlur={saveLendEdit} className="h-7 text-sm w-32" />
                            ) : (
                              <span className="cursor-text">{l.dueDate ? formatDate(l.dueDate) : "-"}</span>
                            )}
                          </TableCell>
                          <TableCell onDoubleClick={() => startLendEdit(l, "status")}>
                            {isLendEditing(l.id, "status") ? (
                              <select autoFocus className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-24" value={lendEditValue} onChange={(e) => { if (e.target.value) saveLendSelect(e.target.value) }} onBlur={() => { setTimeout(() => cancelLendEdit(), 150) }}>
                                <option value="active">返済中</option>
                                <option value="completed">完済</option>
                                <option value="overdue">延滞</option>
                              </select>
                            ) : (
                              <Badge variant="outline" className={cn("text-xs cursor-text",
                                l.status === "active" && "border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300",
                                l.status === "completed" && "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300",
                                l.status === "overdue" && "border-red-300 dark:border-red-700 text-red-700 dark:text-red-300",
                              )}>
                                {LENDING_STATUS_LABELS[l.status]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px]" onDoubleClick={() => startLendEdit(l, "memo")}>
                            {isLendEditing(l.id, "memo") ? (
                              <Input autoFocus value={lendEditValue} onChange={(e) => setLendEditValue(e.target.value)} onKeyDown={handleLendKeyDown} onBlur={saveLendEdit} className="h-7 text-sm" />
                            ) : (
                              <div className="cursor-text">
                                <div className="truncate">{l.memo || <span className="text-muted-foreground">-</span>}</div>
                                {l.editedBy && <span className="text-xs text-muted-foreground">最終編集: {l.editedBy}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <TagSelect allTags={allTags} selectedTags={l.tags ?? []} onToggle={(tagName) => toggleLendingTag(l, tagName)} onCreate={handleCreateTag} size="compact" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {l.status !== "completed" && (
                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setPaymentLendingId(l.id); setPaymentModalOpen(true) }}>
                                  返済
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => archiveLending(l.id, !l.isArchived)}>
                                <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedLendings.has(l.id) && l.payments.map((p) => (
                          <TableRow key={p.id} className="bg-muted/50">
                            <TableCell></TableCell>
                            <TableCell colSpan={2} className="text-xs text-muted-foreground pl-8">
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
                    {filteredLendings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                          貸借データなし
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "tags" && <TagManagement />}
      </div>

      {/* モーダル群 */}
      <AccountModal
        open={accountModalOpen}
        onOpenChange={setAccountModalOpen}
        businesses={businesses}
        allTags={allTags}
        onCreateTag={handleCreateTag}
        onSave={(data) => { createAccountMutation.mutate(data, { onSuccess: () => toast.success("口座を追加しました"), onError: () => toast.error("口座の追加に失敗しました") }); setAccountModalOpen(false) }}
      />
      <AccountTransactionModal
        open={txModalOpen}
        onOpenChange={(open) => { setTxModalOpen(open); if (!open) setTxInitialValues(undefined) }}
        accounts={accounts}
        onSave={(data) => { createTxMutation.mutate(data, { onSuccess: () => toast.success("取引を登録しました"), onError: () => toast.error("取引の登録に失敗しました") }); setTxModalOpen(false); setTxInitialValues(undefined) }}
        initialValues={txInitialValues}
      />
      <LendingModal
        open={lendingModalOpen}
        onOpenChange={setLendingModalOpen}
        accounts={accounts}
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
