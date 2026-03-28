import { google, calendar_v3 } from "googleapis"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

const calendar = google.calendar({ version: "v3", auth: oauth2Client })

// ---------- 型 ----------

export type EventType = "meeting" | "holiday" | "outing" | "work" | "other"

export interface GCalEvent {
  id: string
  title: string
  description: string
  startAt: string // ISO-8601
  endAt: string // ISO-8601
  allDay: boolean
  calendarId: string
  eventType: EventType
}

// ---------- ヘルパー ----------

function toGCalEvent(
  item: calendar_v3.Schema$Event,
  calendarId: string
): GCalEvent {
  const allDay = !item.start?.dateTime
  const eventType =
    (item.extendedProperties?.private?.eventType as EventType) ?? "other"
  return {
    id: item.id ?? "",
    title: item.summary ?? "(無題)",
    description: item.description ?? "",
    startAt: allDay
      ? `${item.start?.date}T00:00:00`
      : item.start?.dateTime ?? "",
    endAt: allDay ? `${item.end?.date}T00:00:00` : item.end?.dateTime ?? "",
    allDay,
    calendarId,
    eventType,
  }
}

// ---------- 公開API ----------

/** 指定カレンダーのイベント一覧を取得 */
export async function listEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GCalEvent[]> {
  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  })
  return (res.data.items ?? []).map((item) => toGCalEvent(item, calendarId))
}

/** 複数カレンダーのイベントを並行取得 */
export async function listEventsMulti(
  calendarIds: string[],
  timeMin: string,
  timeMax: string
): Promise<GCalEvent[]> {
  const results = await Promise.all(
    calendarIds.map((id) => listEvents(id, timeMin, timeMax))
  )
  return results.flat()
}

/** イベント作成 */
export async function createEvent(
  calendarId: string,
  event: {
    title: string
    description?: string
    startAt: string
    endAt: string
    allDay?: boolean
    eventType?: EventType
  }
): Promise<GCalEvent> {
  const body: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description ?? "",
    extendedProperties: {
      private: {
        eventType: event.eventType ?? "other",
      },
    },
  }

  if (event.allDay) {
    body.start = { date: event.startAt.slice(0, 10) }
    body.end = { date: event.endAt.slice(0, 10) }
  } else {
    body.start = { dateTime: event.startAt, timeZone: "Asia/Tokyo" }
    body.end = { dateTime: event.endAt, timeZone: "Asia/Tokyo" }
  }

  const res = await calendar.events.insert({ calendarId, requestBody: body })
  return toGCalEvent(res.data, calendarId)
}

/** イベント更新 */
export async function updateEvent(
  calendarId: string,
  eventId: string,
  event: {
    title?: string
    description?: string
    startAt?: string
    endAt?: string
    allDay?: boolean
    eventType?: EventType
  }
): Promise<GCalEvent> {
  const existing = await calendar.events.get({ calendarId, eventId })
  const body: calendar_v3.Schema$Event = { ...existing.data }

  if (event.title !== undefined) body.summary = event.title
  if (event.description !== undefined) body.description = event.description
  if (event.eventType !== undefined) {
    body.extendedProperties = {
      ...body.extendedProperties,
      private: {
        ...body.extendedProperties?.private,
        eventType: event.eventType,
      },
    }
  }

  if (event.allDay !== undefined || event.startAt || event.endAt) {
    const allDay = event.allDay ?? !existing.data.start?.dateTime
    if (allDay) {
      if (event.startAt) body.start = { date: event.startAt.slice(0, 10) }
      if (event.endAt) body.end = { date: event.endAt.slice(0, 10) }
    } else {
      if (event.startAt)
        body.start = { dateTime: event.startAt, timeZone: "Asia/Tokyo" }
      if (event.endAt)
        body.end = { dateTime: event.endAt, timeZone: "Asia/Tokyo" }
    }
  }

  const res = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: body,
  })
  return toGCalEvent(res.data, calendarId)
}

/** イベント削除 */
export async function deleteEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  await calendar.events.delete({ calendarId, eventId })
}
