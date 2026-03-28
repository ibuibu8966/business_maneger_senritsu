"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import { useAccountSummary } from "@/hooks/use-lending"

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`
}

export function DashboardBalanceCard() {
  const { data: summary, isLoading } = useAccountSummary()

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="w-4 h-4 text-purple-600" />
          口座サマリー
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : !summary ? (
          <p className="text-sm text-muted-foreground">データなし</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">総残高</p>
              <p className="text-lg font-semibold">{formatYen(summary.totalBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">純資産</p>
              <p className="text-lg font-semibold">{formatYen(summary.netAssets)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">貸出残高</p>
              <p className="text-sm font-medium">{formatYen(summary.totalLent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">借入残高</p>
              <p className="text-sm font-medium">{formatYen(summary.totalBorrowed)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
