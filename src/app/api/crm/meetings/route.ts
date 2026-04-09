import { NextRequest, NextResponse } from "next/server"
import { ContactMeetingRepository } from "@/repositories/contact-meeting.repository"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")
    if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 })

    // 日付フォーマットの検証（YYYY-MM-DD）
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date).getTime())) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 })
    }

    const from = new Date(date + "T00:00:00")
    const to = new Date(date + "T00:00:00")
    to.setDate(to.getDate() + 1)

    const meetings = await ContactMeetingRepository.findByDateRange(from, to)
    return NextResponse.json(meetings.map(m => ({
      id: m.id,
      contactId: m.contactId,
      contactName: m.contact.name,
      contactType: m.contact.type,
      isFinalMeeting: m.contact.isFinalMeeting,
      date: m.date.toISOString(),
      summary: m.summary,
    })))
  } catch {
    return NextResponse.json({ error: "面談の取得に失敗しました" }, { status: 500 })
  }
}
