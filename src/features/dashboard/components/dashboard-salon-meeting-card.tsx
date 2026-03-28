"use client"

import { useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useContacts } from "@/hooks/use-crm"
import type { ContactDTO } from "@/types/dto"

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

export function DashboardSalonMeetingCard() {
  const { data: contacts, isLoading } = useContacts({ type: "salon_member" })

  const todayMeetings = useMemo(() => {
    if (!contacts) return []
    const today = new Date().toISOString().split("T")[0]
    return (contacts as ContactDTO[])
      .filter((c) => {
        if (!c.nextMeetingDate) return false
        if (c.isFinalMeeting) return false
        return c.nextMeetingDate.startsWith(today)
      })
      .sort((a, b) =>
        new Date(a.nextMeetingDate!).getTime() - new Date(b.nextMeetingDate!).getTime()
      )
  }, [contacts])

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
            {todayMeetings.map((contact) => (
              <li key={contact.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-muted-foreground shrink-0 w-12">
                  {formatTime(contact.nextMeetingDate!)}
                </span>
                <p className="font-medium truncate flex-1">{contact.name}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
