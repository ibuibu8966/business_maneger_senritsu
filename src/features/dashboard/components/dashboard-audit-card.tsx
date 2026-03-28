"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { History } from "lucide-react"
import { useAuditLogs } from "@/hooks/use-dashboard"
import type { AuditLogDTO } from "@/types/dto"

const ACTION_LABEL: Record<string, string> = {
  CREATE: "作成",
  UPDATE: "更新",
  DELETE: "削除",
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "たった今"
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

export function DashboardAuditCard() {
  const { data: logs, isLoading } = useAuditLogs({ limit: 10 })

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4 text-slate-600" />
          操作履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : !logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">操作履歴はありません</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log: AuditLogDTO) => (
              <li key={log.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate">
                    {log.userName}が{log.entityName}を{ACTION_LABEL[log.action] ?? log.action}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {timeAgo(log.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{log.entityType}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
