"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePaymentChecks, useSubscriptions } from "@/hooks/use-crm"
import { useBusinessTasks } from "@/hooks/use-business"
import { cn } from "@/lib/utils"
import {
  TASK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  TOOL_CONFIG,
  type TaskStatus,
  type Priority,
  type TicketTool,
} from "@/features/business/components/mock-data"

export function CrmDashboard() {
  const { data: tasks = [] } = useBusinessTasks()
  const now = new Date()
  const { data: paymentChecks = [] } = usePaymentChecks({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const { data: thisMonthSubs = [] } = useSubscriptions({ status: "active" })

  // 先月のサブスク数を概算（今月のアクティブ数から新規追加を引く）
  const lastMonthCount = thisMonthSubs.filter(s => {
    const start = new Date(s.startDate)
    return start.getFullYear() < now.getFullYear() || (start.getFullYear() === now.getFullYear() && start.getMonth() + 1 < now.getMonth() + 1)
  }).length
  const newThisMonth = thisMonthSubs.length - lastMonthCount
  const addRate = lastMonthCount > 0 ? Math.round((newThisMonth / lastMonthCount) * 100) : 0

  // 顧客関連タスク（contactIdがあるもの）
  const contactTasks = tasks.filter((t: any) => t.contactId)
  const openContactTasks = contactTasks.filter((t: any) => t.status !== "done")
  const highPriorityCount = openContactTasks.filter((t: any) => t.priority === "highest" || t.priority === "high").length
  const unconfirmedPayments = paymentChecks.filter((p) => !p.isConfirmed)

  // 担当者別未完了数
  const assigneeMap = new Map<string, { name: string; count: number }>()
  openContactTasks.forEach((t: any) => {
    if (!t.assigneeId) return
    const existing = assigneeMap.get(t.assigneeId)
    if (existing) existing.count++
    else assigneeMap.set(t.assigneeId, { name: t.assigneeName ?? "未割当", count: 1 })
  })
  const assigneeCounts = Array.from(assigneeMap.values()).sort((a, b) => b.count - a.count)

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">CRMダッシュボード</h2>

      {/* サマリー3カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 顧客関連タスク */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">顧客関連タスク</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openContactTasks.length}</div>
            <div className="flex gap-1 mt-1">
              {highPriorityCount > 0 && (
                <Badge variant="destructive" className="text-xs">高優先度 {highPriorityCount}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 未決済確認 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">未決済確認</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unconfirmedPayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {now.getFullYear()}年{now.getMonth() + 1}月分
            </p>
          </CardContent>
        </Card>

        {/* コース追加率 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">コース追加率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{addRate > 0 ? `+${addRate}%` : `${addRate}%`}</div>
            <p className="text-xs text-muted-foreground mt-1">
              今月新規 {newThisMonth}件（先月 {lastMonthCount}件）
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 顧客関連タスク詳細 */}
      {openContactTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">直近の顧客関連タスク</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {openContactTasks.slice(0, 8).map((t: any) => {
                const st = TASK_STATUS_CONFIG[t.status as TaskStatus]
                const pri = PRIORITY_CONFIG[t.priority as Priority]
                return (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{t.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {t.tool && TOOL_CONFIG[t.tool as TicketTool] ? TOOL_CONFIG[t.tool as TicketTool].emoji + " " : ""}
                        {t.contactName ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{t.assigneeName ?? ""}</span>
                      {t.deadline && new Date(t.deadline) < now && (
                        <Badge variant="destructive" className="text-xs">期限超過</Badge>
                      )}
                      {pri && t.priority !== "medium" && (
                        <Badge variant={t.priority === "highest" || t.priority === "high" ? "destructive" : "secondary"} className="text-xs">
                          {pri.label}
                        </Badge>
                      )}
                      {st && (
                        <Badge variant="outline" className={cn("text-xs", st.className)}>
                          {st.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 担当者別未完了タスク */}
      {assigneeCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">担当者別未完了タスク</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {assigneeCounts.map(a => (
                <div key={a.name} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
                  <span className="text-sm font-medium">{a.name}</span>
                  <Badge variant="secondary" className="text-xs">{a.count}件</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
