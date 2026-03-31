"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { fetchMeetingsByDate } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

interface MeetingDTO {
  id: string
  contactId: string
  contactName: string
  contactType: string
  isFinalMeeting: boolean
  date: string
  summary: string
}

export function DashboardSalonMeetingCard() {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const { data: meetings, isLoading } = useQuery<MeetingDTO[]>({
    queryKey: queryKeys.meetingsByDate.date(today),
    queryFn: () => fetchMeetingsByDate(today),
  })

  const todayMeetings = useMemo(() => {
    if (!meetings) return []
    return meetings
      .filter((m) => m.contactType === "SALON_MEMBER" && !m.isFinalMeeting)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [meetings])

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="w-4 h-4 text-teal-600" />
          本日の面談予定
          {todayMeetings.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {todayMeetings.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : todayMeetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">本日の面談予定はありません</p>
        ) : (
          <ul className="space-y-2">
            {todayMeetings.map((meeting) => (
              <li key={meeting.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-muted-foreground shrink-0 w-12">
                  {formatTime(meeting.date)}
                </span>
                <p className="font-medium truncate flex-1">{meeting.contactName}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
