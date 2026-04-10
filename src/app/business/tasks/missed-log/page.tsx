"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Calendar as CalendarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type MissedLog = {
  id: string
  taskId: string
  taskTitle: string
  projectId: string
  projectName: string
  assigneeId: string | null
  assigneeName: string
  scheduledDate: string
  missedAt: string
  statusAtMissed: "TODO" | "IN_PROGRESS" | "WAITING" | "DONE"
  task?: {
    id: string
    title: string
    status: string
    projectId: string
  } | null
}

const STATUS_LABEL: Record<string, string> = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  WAITING: "確認待ち",
  DONE: "完了",
}

const STATUS_CLASS: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  WAITING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
}

async function fetchMissedLogs(date: string): Promise<MissedLog[]> {
  const url = date
    ? `/api/business/tasks/missed-log?date=${date}`
    : `/api/business/tasks/missed-log`
  const res = await fetch(url)
  if (!res.ok) throw new Error("failed")
  return res.json()
}

export default function MissedLogPage() {
  const [date, setDate] = useState<string>("")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")

  const { data: rawLogs = [], isLoading, refetch } = useQuery({
    queryKey: ["missed-log", date],
    queryFn: () => fetchMissedLogs(date),
  })

  // 担当者リスト（未設定を含む）
  const assigneeOptions = Array.from(
    new Set(rawLogs.map((l) => l.assigneeName || ""))
  ).sort((a, b) => {
    if (a === "") return 1
    if (b === "") return -1
    return a.localeCompare(b, "ja")
  })

  // 担当者フィルタ適用
  const logs = rawLogs.filter((l) => {
    if (assigneeFilter === "all") return true
    if (assigneeFilter === "__none__") return !l.assigneeName
    return l.assigneeName === assigneeFilter
  })

  // 日付でグルーピング
  const grouped = logs.reduce<Record<string, MissedLog[]>>((acc, log) => {
    const d = log.scheduledDate.slice(0, 10)
    if (!acc[d]) acc[d] = []
    acc[d].push(log)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1))

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold">未達成ログ</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              「今日やる」フラグを立てたのに、その日のうちに完了できなかったタスクの記録です（深夜2時JSTに自動記録）
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="text-xs border rounded-md h-8 px-2 bg-background"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="all">全員</option>
              {assigneeOptions.map((name) => (
                <option
                  key={name || "__none__"}
                  value={name === "" ? "__none__" : name}
                >
                  {name === "" ? "担当未設定" : name}
                </option>
              ))}
            </select>
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 text-xs w-[150px]"
            />
            {date && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDate("")}
              >
                全期間
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => refetch()}
            >
              更新
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border rounded-md">
            未達成ログはありません
          </div>
        ) : (
          <div className="space-y-5">
            {dates.map((d) => (
              <div key={d}>
                <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                  <span className="text-sm font-semibold">{d}</span>
                  <span className="text-xs text-muted-foreground">
                    未達成 {grouped[d].length}件
                  </span>
                </div>
                <div className="space-y-1.5">
                  {grouped[d].map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-2 p-2.5 rounded-md border text-xs bg-background hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{log.taskTitle}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {log.projectName || "（プロジェクト不明）"}
                          {!log.task && (
                            <span className="ml-2 text-red-500">※タスクは削除済み</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {log.assigneeName ? `担当: ${log.assigneeName}` : "担当未設定"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-4 px-1.5 font-semibold ${STATUS_CLASS[log.statusAtMissed] ?? ""}`}
                        >
                          {STATUS_LABEL[log.statusAtMissed] ?? log.statusAtMissed}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          記録: {new Date(log.missedAt).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit", month: "2-digit", day: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
