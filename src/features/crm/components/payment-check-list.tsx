"use client"

import { useMemo, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useSession } from "next-auth/react"
import { Check, RefreshCw, Copy, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, StickyNote } from "lucide-react"
import { usePaymentChecks, useUpsertPaymentCheck, useGeneratePaymentChecks } from "@/hooks/use-crm"
import { cn } from "@/lib/utils"

type SortKey =
  | "contactName"
  | "discordId"
  | "courseName"
  | "salonName"
  | "paymentMethod"
  | "paymentServiceId"
  | "discordRoleName"
  | "isConfirmed"
  | "confirmedBy"
type SortDir = "asc" | "desc"

const METHOD_LABELS: Record<string, string> = {
  memberpay: "MemberPay", robotpay: "RobotPay", paypal: "PayPal", univpay: "UnivPay", other: "その他",
}

// リンク可能な決済サービス
const LINKABLE_METHODS = ["memberpay", "paypal", "univpay"]

export function PaymentCheckList() {
  const { data: session } = useSession()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: checks = [], isLoading } = usePaymentChecks({ year, month })
  const upsertMutation = useUpsertPaymentCheck()
  const generateMutation = useGeneratePaymentChecks()

  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [salonFilter, setSalonFilter] = useState<string>("all")

  const salonOptions = useMemo(() => {
    const set = new Set<string>()
    checks.forEach((c) => {
      if (c.salonName) set.add(c.salonName)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"))
  }, [checks])

  const filteredChecks = useMemo(() => {
    if (salonFilter === "all") return checks
    return checks.filter((c) => c.salonName === salonFilter)
  }, [checks, salonFilter])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedChecks = useMemo(() => {
    if (!sortKey) return filteredChecks
    const arr = [...filteredChecks]
    arr.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const av = (a as any)[sortKey]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bv = (b as any)[sortKey]
      const isAEmpty = av === null || av === undefined || av === ""
      const isBEmpty = bv === null || bv === undefined || bv === ""
      if (isAEmpty && isBEmpty) return 0
      if (isAEmpty) return 1
      if (isBEmpty) return -1
      if (typeof av === "boolean" && typeof bv === "boolean") {
        const cmp = av === bv ? 0 : av ? -1 : 1
        return sortDir === "asc" ? cmp : -cmp
      }
      const cmp = String(av).localeCompare(String(bv), "ja")
      return sortDir === "asc" ? cmp : -cmp
    })
    return arr
  }, [filteredChecks, sortKey, sortDir])

  const handleConfirm = (check: typeof checks[number]) => {
    upsertMutation.mutate({
      subscriptionId: check.subscriptionId,
      year,
      month,
      isConfirmed: !check.isConfirmed,
      confirmedBy: session?.user?.name ?? "",
    })
  }

  const handleGenerate = () => {
    generateMutation.mutate({ year, month })
  }

  const handleToggleNote = (check: typeof checks[number]) => {
    upsertMutation.mutate({
      subscriptionId: check.subscriptionId,
      year,
      month,
      isConfirmed: check.isConfirmed,
      confirmedBy: check.confirmedBy || session?.user?.name || "",
      hasNote: !check.hasNote,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const nonExempt = filteredChecks.filter((c) => !c.isExempt)
  const confirmed = nonExempt.filter((c) => c.isConfirmed).length
  const total = nonExempt.length
  const exemptCount = filteredChecks.filter((c) => c.isExempt).length

  if (isLoading) return <div className="p-4 text-muted-foreground">読み込み中...</div>

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap">
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-8 text-sm w-20"
          min={2020}
          max={2030}
        />
        <span className="text-sm">年</span>
        <Input
          type="number"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="h-8 text-sm w-16"
          min={1}
          max={12}
        />
        <span className="text-sm">月</span>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generateMutation.isPending}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1", generateMutation.isPending && "animate-spin")} />
          一括生成
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm">サロン:</span>
          <select
            value={salonFilter}
            onChange={(e) => setSalonFilter(e.target.value)}
            className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">全て</option>
            {salonOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            確認済み: {confirmed}/{total}
          </span>
          {total > 0 && (
            <Badge variant={confirmed === total ? "default" : "secondary"} className="text-xs">
              {Math.round((confirmed / total) * 100)}%
            </Badge>
          )}
          {exemptCount > 0 && (
            <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-200 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/40">
              免除: {exemptCount}
            </Badge>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto [&>[data-slot=table-container]]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_hsl(var(--border))]">
            <TableRow>
              <SortableHead label="顧客" sortKey="contactName" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHead label="DiscordID" sortKey="discordId" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHead label="コース" sortKey="courseName" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHead label="サロン" sortKey="salonName" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHead label="決済方法" sortKey="paymentMethod" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHead label="決済サービスID" sortKey="paymentServiceId" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHead label="ロール名" sortKey="discordRoleName" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHead label="決済確認" sortKey="isConfirmed" current={sortKey} dir={sortDir} onSort={handleSort} className="w-12" />
              <SortableHead label="確認者" sortKey="confirmedBy" current={sortKey} dir={sortDir} onSort={handleSort} />
              <TableHead className="w-12 text-center">付箋</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedChecks.map((c) => {
              const rowBg = c.hasNote
                ? "bg-pink-100 dark:bg-pink-950/50"
                : c.isExempt
                  ? "bg-amber-100/70 dark:bg-amber-900/40"
                  : c.isConfirmed
                    ? "bg-muted/50 dark:bg-muted/60"
                    : ""
              return (
              <TableRow key={c.id} className={rowBg}>
                <TableCell className="text-sm font-medium">{c.contactName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.discordId || "-"}</TableCell>
                <TableCell className="text-sm">{c.courseName}</TableCell>
                <TableCell className="text-sm">{c.salonName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {METHOD_LABELS[c.paymentMethod] ?? c.paymentMethod}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.paymentServiceId || "-"}</TableCell>
                <TableCell className="text-sm">{c.discordRoleName || "-"}</TableCell>
                <TableCell>
                  {c.isExempt ? (
                    <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-200 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/40">免除</Badge>
                  ) : (
                    <Button
                      variant={c.isConfirmed ? "default" : "outline"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleConfirm(c)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {c.confirmedBy || "-"}
                  {c.confirmedAt && (
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(c.confirmedAt).toLocaleString("ja-JP")}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleNote(c)}
                  >
                    <StickyNote className={cn("h-3.5 w-3.5", c.hasNote ? "text-pink-600 dark:text-pink-300" : "text-muted-foreground")} />
                  </Button>
                </TableCell>
              </TableRow>
              )
            })}
            {sortedChecks.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  データがありません。「一括生成」ボタンで生成してください
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function SortableHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  current: SortKey | null
  dir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = current === sortKey
  return (
    <TableHead className={cn("cursor-pointer select-none hover:bg-muted/50", className)} onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  )
}
