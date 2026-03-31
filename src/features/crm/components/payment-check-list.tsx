"use client"

import { useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useSession } from "next-auth/react"
import { Check, RefreshCw, Copy, ExternalLink } from "lucide-react"
import { usePaymentChecks, useUpsertPaymentCheck, useGeneratePaymentChecks } from "@/hooks/use-crm"
import { cn } from "@/lib/utils"

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

  const handleRoleChange = (check: typeof checks[number], assigned: boolean) => {
    upsertMutation.mutate({
      subscriptionId: check.subscriptionId,
      year,
      month,
      isConfirmed: check.isConfirmed,
      confirmedBy: check.confirmedBy || session?.user?.name || "",
      discordRoleAssigned: assigned,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const nonExempt = checks.filter((c) => !c.isExempt)
  const confirmed = nonExempt.filter((c) => c.isConfirmed).length
  const total = nonExempt.length
  const exemptCount = checks.filter((c) => c.isExempt).length

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
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              免除: {exemptCount}
            </Badge>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>顧客</TableHead>
              <TableHead>DiscordID</TableHead>
              <TableHead>コース</TableHead>
              <TableHead>サロン</TableHead>
              <TableHead>決済方法</TableHead>
              <TableHead>決済サービスID</TableHead>
              <TableHead>ロール名</TableHead>
              <TableHead className="w-12">決済確認</TableHead>
              <TableHead className="w-24">ロール付与</TableHead>
              <TableHead>確認者</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((c) => (
              <TableRow key={c.id} className={cn(c.isConfirmed && !c.isExempt && "bg-muted/30", c.isExempt && "bg-amber-50/50")}>
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
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">免除</Badge>
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
                <TableCell>
                  <select
                    value={c.discordRoleAssigned ? "付与済" : "未付与"}
                    onChange={(e) => handleRoleChange(c, e.target.value === "付与済")}
                    className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="付与済">付与済</option>
                    <option value="未付与">未付与</option>
                  </select>
                </TableCell>
                <TableCell className="text-sm">
                  {c.confirmedBy || "-"}
                  {c.confirmedAt && (
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(c.confirmedAt).toLocaleString("ja-JP")}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {checks.length === 0 && (
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
