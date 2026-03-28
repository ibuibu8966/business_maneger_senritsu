"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { useScheduleEvents } from "@/hooks/use-schedule"
import type { ScheduleEventDTO } from "@/types/dto"

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

export function DashboardScheduleCard() {
  const today = new Date()
  const startFrom = today.toISOString().split("T")[0]
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const startTo = tomorrow.toISOString().split("T")[0]

  const { data: events, isLoading } = useScheduleEvents({ startFrom, startTo })

  const todayEvents = (events ?? []).sort(
    (a: ScheduleEventDTO, b: ScheduleEventDTO) =>
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  )

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-4 h-4 text-green-600" />
          今日の予定
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : todayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">今日の予定はありません</p>
        ) : (
          <ul className="space-y-2">
            {todayEvents.map((event: ScheduleEventDTO) => (
              <li key={event.id} className="flex items-start gap-3 text-sm">
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5 w-12">
                  {event.allDay ? "終日" : formatTime(event.startAt)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.employeeName}</p>
                </div>
                <div
                  className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: event.employeeColor }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
