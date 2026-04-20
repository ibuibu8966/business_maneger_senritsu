"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useScheduleEvents, useEmployees } from "@/hooks/use-schedule"
import type { ScheduleEventDTO } from "@/types/dto"
import { EventModal } from "./event-modal"

type ViewMode = "month" | "week" | "day"

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: "打ち合わせ",
  holiday: "休み",
  outing: "外出",
  work: "作業",
  other: "その他",
}

const EVENT_TYPE_STYLES: Record<string, string> = {
  meeting: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  holiday: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
  outing: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
  work: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
  other: "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30",
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getWeekDates(date: Date): Date[] {
  const day = date.getDay()
  const start = new Date(date)
  start.setDate(start.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

// 画面高さに応じてカレンダーに表示するイベント数を可変にする（上限なし・連続的に増減）
function useResponsiveEventLimits() {
  const [limits, setLimits] = useState({ span: 2, timed: 3 })
  useEffect(() => {
    const compute = () => {
      const h = window.innerHeight
      // ヘッダー・操作バー・曜日行分を除いた、カレンダー本体の利用可能高さ
      const available = Math.max(0, h - 220)
      // 月ビューは6週行
      const perWeekHeight = available / 6
      // 各週行から日付行(約28px)とスパン(約20px/行)を差し引いた残りを1イベント20pxで割る
      const timed = Math.max(2, Math.floor((perWeekHeight - 30) / 20))
      // スパン行はタイムドと連動させつつ、画面が大きい時は多めに
      const span = Math.max(2, Math.min(timed, Math.floor(perWeekHeight / 40)))
      setLimits({ span, timed })
    }
    compute()
    window.addEventListener("resize", compute)
    return () => window.removeEventListener("resize", compute)
  }, [])
  return limits
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"]

export function ScheduleCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<ScheduleEventDTO | null>(null)
  const [newEventDate, setNewEventDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 月表示の範囲でイベントを取得
  const startFrom = useMemo(() => {
    if (viewMode === "month") {
      const first = new Date(year, month, 1)
      first.setDate(first.getDate() - first.getDay())
      return first.toISOString()
    }
    if (viewMode === "week") {
      const dates = getWeekDates(currentDate)
      return dates[0].toISOString()
    }
    const d = new Date(currentDate)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [year, month, viewMode, currentDate])

  const startTo = useMemo(() => {
    if (viewMode === "month") {
      const last = new Date(year, month + 1, 0)
      last.setDate(last.getDate() + (6 - last.getDay()))
      last.setHours(23, 59, 59, 999)
      return last.toISOString()
    }
    if (viewMode === "week") {
      const dates = getWeekDates(currentDate)
      const end = new Date(dates[6])
      end.setHours(23, 59, 59, 999)
      return end.toISOString()
    }
    const d = new Date(currentDate)
    d.setHours(23, 59, 59, 999)
    return d.toISOString()
  }, [year, month, viewMode, currentDate])

  const { data: events = [] } = useScheduleEvents({ startFrom, startTo })
  const { data: employees = [] } = useEmployees()

  // 従業員フィルター（未選択=全員表示）
  const filteredEvents = useMemo(() => {
    if (selectedEmployees.size === 0) return events
    return events.filter((e) => selectedEmployees.has(e.employeeId))
  }, [events, selectedEmployees])

  // 日付ごとのイベントマップ（複数日イベントは各日に展開）
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEventDTO[]>()
    for (const ev of filteredEvents) {
      const start = new Date(ev.startAt)
      const end = new Date(ev.endAt)
      // 開始日から終了日まで全日に展開
      const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      // 終日イベントの終了日はGCalでは翌日になるので1日引く
      if (ev.allDay && endDate > current) endDate.setDate(endDate.getDate() - 1)
      while (current <= endDate) {
        const key = formatDate(current)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(ev)
        current.setDate(current.getDate() + 1)
      }
    }
    return map
  }, [filteredEvents])

  const navigate = (direction: -1 | 1) => {
    const next = new Date(currentDate)
    if (viewMode === "month") next.setMonth(next.getMonth() + direction)
    else if (viewMode === "week") next.setDate(next.getDate() + direction * 7)
    else next.setDate(next.getDate() + direction)
    setCurrentDate(next)
  }

  const goToday = () => setCurrentDate(new Date())

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openNewEvent = (dateStr?: string) => {
    setEditEvent(null)
    setNewEventDate(dateStr ?? formatDate(new Date()))
    setModalOpen(true)
  }

  const openEditEvent = (ev: ScheduleEventDTO) => {
    setEditEvent(ev)
    setNewEventDate(null)
    setModalOpen(true)
  }

  const headerLabel = viewMode === "month"
    ? `${year}年${month + 1}月`
    : viewMode === "week"
      ? (() => {
          const dates = getWeekDates(currentDate)
          return `${dates[0].getMonth() + 1}/${dates[0].getDate()} 〜 ${dates[6].getMonth() + 1}/${dates[6].getDate()}`
        })()
      : `${year}年${month + 1}月${currentDate.getDate()}日（${WEEKDAYS[currentDate.getDay()]}）`

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="h-[53px] border-b px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">{headerLabel}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
              今日
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* ビュー切り替え */}
          <div className="flex border rounded-md overflow-hidden">
            {(["month", "week", "day"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {mode === "month" ? "月" : mode === "week" ? "週" : "日"}
              </button>
            ))}
          </div>
          <Button size="sm" className="h-8 gap-1" onClick={() => openNewEvent()}>
            <Plus className="h-3.5 w-3.5" />
            予定追加
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* サイドバー: 従業員フィルター */}
        <div className="w-48 border-r p-3 space-y-2 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-2">従業員</p>
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => toggleEmployee(emp.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                selectedEmployees.size === 0 || selectedEmployees.has(emp.id)
                  ? "opacity-100"
                  : "opacity-40"
              )}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: emp.color }}
              />
              <div className="min-w-0">
                <div className="truncate">{emp.name}</div>
                {emp.coreTimeStart && emp.coreTimeEnd && (
                  <div className="text-[10px] text-muted-foreground">
                    {emp.coreTimeStart}〜{emp.coreTimeEnd}
                  </div>
                )}
              </div>
            </button>
          ))}
          {employees.length === 0 && (
            <p className="text-xs text-muted-foreground">従業員が未登録です</p>
          )}

          {/* 種別凡例 */}
          <div className="pt-3 border-t mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">予定種別</p>
            {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2 py-1">
                <span className={cn("w-3 h-3 rounded-sm border", EVENT_TYPE_STYLES[key])} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* カレンダー本体 */}
        <div className="flex-1 overflow-auto">
          {viewMode === "month" && (
            <MonthView
              year={year}
              month={month}
              eventsByDate={eventsByDate}
              onClickDate={(dateStr) => openNewEvent(dateStr)}
              onClickEvent={openEditEvent}
            />
          )}
          {viewMode === "week" && (
            <WeekView
              currentDate={currentDate}
              filteredEvents={filteredEvents}
              onClickTime={(dateStr) => openNewEvent(dateStr)}
              onClickEvent={openEditEvent}
            />
          )}
          {viewMode === "day" && (
            <DayView
              currentDate={currentDate}
              filteredEvents={filteredEvents}
              onClickTime={(dateStr) => openNewEvent(dateStr)}
              onClickEvent={openEditEvent}
            />
          )}
        </div>
      </div>

      {/* イベントモーダル */}
      <EventModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEvent(null); setNewEventDate(null) }}
        event={editEvent}
        defaultDate={newEventDate}
        employees={employees}
      />
    </div>
  )
}

// ===== 月ビューのスパンバー計算 =====
interface SpanEvent {
  event: ScheduleEventDTO
  startCol: number  // 0-6 (週内の開始列)
  span: number      // 何列にまたがるか
}

function getEventTypeColor(eventType: string): { bg: string; text: string; border: string } {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    meeting: { bg: "rgba(59,130,246,0.2)", text: isDark ? "#93c5fd" : "#1d4ed8", border: "rgba(59,130,246,0.3)" },
    holiday: { bg: "rgba(239,68,68,0.2)", text: isDark ? "#fca5a5" : "#b91c1c", border: "rgba(239,68,68,0.3)" },
    outing: { bg: "rgba(34,197,94,0.2)", text: isDark ? "#86efac" : "#15803d", border: "rgba(34,197,94,0.3)" },
    work: { bg: "rgba(168,85,247,0.2)", text: isDark ? "#d8b4fe" : "#7e22ce", border: "rgba(168,85,247,0.3)" },
    other: { bg: "rgba(107,114,128,0.2)", text: isDark ? "#d1d5db" : "#374151", border: "rgba(107,114,128,0.3)" },
  }
  return colors[eventType] ?? colors.other
}

// ===== 月ビュー =====
function MonthView({
  year,
  month,
  eventsByDate,
  onClickDate,
  onClickEvent,
}: {
  year: number
  month: number
  eventsByDate: Map<string, ScheduleEventDTO[]>
  onClickDate: (dateStr: string) => void
  onClickEvent: (ev: ScheduleEventDTO) => void
}) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = formatDate(new Date())

  // 前月の日数
  const prevDays = getDaysInMonth(year, month - 1)

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = []

  // 前月
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false })
  }
  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true })
  }
  // 次月
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false })
  }

  // 週ごとに分割（6週）
  const weeks: typeof cells[] = []
  for (let w = 0; w < 6; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7))
  }

  // 週ごとのスパンイベント + 単日イベントを計算
  const weekData = weeks.map((weekCells) => {
    const weekDates = weekCells.map((c) =>
      `${c.year}-${String(c.month + 1).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`
    )

    // この週に含まれる全イベントを集める（重複排除）
    const seenIds = new Set<string>()
    const allDaySpans: SpanEvent[] = []
    const timedByDay: Map<number, ScheduleEventDTO[]> = new Map()

    for (let col = 0; col < 7; col++) {
      const dayEvs = eventsByDate.get(weekDates[col]) ?? []
      for (const ev of dayEvs) {
        if (ev.allDay) {
          if (seenIds.has(ev.id)) continue
          seenIds.add(ev.id)
          // スパン計算: イベントの開始〜終了が週内でどこからどこまでか
          const evStart = new Date(ev.startAt)
          const evEnd = new Date(ev.endAt)
          // GCal終日は翌日までなので1日引く
          evEnd.setDate(evEnd.getDate() - 1)
          const evStartDate = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate())
          const evEndDate = new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate())

          // 週の開始日・終了日
          const weekStart = new Date(weekCells[0].year, weekCells[0].month, weekCells[0].day)
          const weekEnd = new Date(weekCells[6].year, weekCells[6].month, weekCells[6].day)

          const displayStart = evStartDate < weekStart ? weekStart : evStartDate
          const displayEnd = evEndDate > weekEnd ? weekEnd : evEndDate

          const startCol = Math.round((displayStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
          const endCol = Math.round((displayEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
          const span = endCol - startCol + 1

          if (startCol >= 0 && startCol < 7 && span > 0) {
            allDaySpans.push({ event: ev, startCol, span: Math.min(span, 7 - startCol) })
          }
        } else {
          if (!timedByDay.has(col)) timedByDay.set(col, [])
          // 時間付きイベントは重複排除しない（同じ日にのみ表示）
          if (!timedByDay.get(col)!.find((e) => e.id === ev.id)) {
            timedByDay.get(col)!.push(ev)
          }
        }
      }
    }

    // スパンイベントを行に配置（重なり回避）
    const spanRows: SpanEvent[][] = []
    // 開始列が早い順、次にスパンが長い順にソート
    allDaySpans.sort((a, b) => a.startCol - b.startCol || b.span - a.span)
    for (const se of allDaySpans) {
      let placed = false
      for (const row of spanRows) {
        // この行のどのイベントとも重なっていないかチェック
        const overlaps = row.some((r) =>
          se.startCol < r.startCol + r.span && se.startCol + se.span > r.startCol
        )
        if (!overlaps) {
          row.push(se)
          placed = true
          break
        }
      }
      if (!placed) {
        spanRows.push([se])
      }
    }

    return { weekCells, weekDates, spanRows, timedByDay }
  })

  const { span: MAX_SPAN_ROWS, timed: MAX_TIMED_EVENTS } = useResponsiveEventLimits()

  return (
    <div className="h-full flex flex-col">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs font-medium py-2",
              i === 0 && "text-red-500 dark:text-red-400",
              i === 6 && "text-blue-500 dark:text-blue-400"
            )}
          >
            {day}
          </div>
        ))}
      </div>
      {/* カレンダーグリッド（週行ごと） */}
      <div className="flex-1 grid grid-rows-6">
        {weekData.map(({ weekCells, weekDates, spanRows, timedByDay }, wi) => (
          <div key={wi} className="border-b flex flex-col min-h-[100px]">
            {/* 日付番号行 */}
            <div className="grid grid-cols-7">
              {weekCells.map((cell, col) => {
                const dateStr = weekDates[col]
                const isToday = dateStr === today
                return (
                  <div
                    key={col}
                    className={cn(
                      "border-r px-1 pt-1 cursor-pointer hover:bg-muted/50 transition-colors",
                      !cell.isCurrentMonth && "bg-muted/20"
                    )}
                    onClick={() => onClickDate(dateStr)}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 text-xs rounded-full",
                        isToday && "bg-primary text-primary-foreground font-bold",
                        !isToday && col === 0 && "text-red-500 dark:text-red-400",
                        !isToday && col === 6 && "text-blue-500 dark:text-blue-400",
                        !cell.isCurrentMonth && "text-muted-foreground"
                      )}
                    >
                      {cell.day}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* スパンバー（終日・複数日イベント） */}
            {spanRows.slice(0, MAX_SPAN_ROWS).map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 relative" style={{ height: 20 }}>
                {row.map((se) => {
                  const colors = getEventTypeColor(se.event.eventType)
                  return (
                    <div
                      key={se.event.id}
                      className="absolute top-0 h-[18px] rounded-sm text-[10px] px-1.5 truncate cursor-pointer flex items-center gap-1 border"
                      style={{
                        left: `${(se.startCol / 7) * 100}%`,
                        width: `${(se.span / 7) * 100}%`,
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderTopColor: colors.border,
                        borderRightColor: colors.border,
                        borderBottomColor: colors.border,
                        borderLeftColor: se.event.employeeColor,
                        borderLeftWidth: 3,
                      }}
                      onClick={(e) => { e.stopPropagation(); onClickEvent(se.event) }}
                    >
                      {se.event.title}
                    </div>
                  )
                })}
              </div>
            ))}
            {spanRows.length > MAX_SPAN_ROWS && (
              <div className="grid grid-cols-7" style={{ height: 16 }}>
                {weekCells.map((_, col) => {
                  const extraEvents = spanRows.slice(MAX_SPAN_ROWS).flatMap((row) =>
                    row.filter((se) => col >= se.startCol && col < se.startCol + se.span).map((se) => se.event)
                  )
                  return (
                    <div key={col} className="border-r text-center relative group">
                      {extraEvents.length > 0 && (
                        <>
                          <span className="text-[9px] text-muted-foreground cursor-pointer hover:text-foreground hover:underline">
                            +{extraEvents.length}件
                          </span>
                          <div className="hidden group-hover:block absolute top-full left-0 z-50 bg-popover text-popover-foreground border rounded-md shadow-lg p-2 min-w-[200px] text-left">
                            <p className="text-[10px] font-bold mb-1 text-muted-foreground">その他のイベント</p>
                            <div className="space-y-1">
                              {extraEvents.map((ev) => (
                                <div
                                  key={ev.id}
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer",
                                    EVENT_TYPE_STYLES[ev.eventType]
                                  )}
                                  style={{ borderLeftColor: ev.employeeColor, borderLeftWidth: 3 }}
                                  onClick={(e) => { e.stopPropagation(); onClickEvent(ev) }}
                                >
                                  {ev.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {/* 時間付きイベント */}
            <div className="grid grid-cols-7 flex-1">
              {weekCells.map((cell, col) => {
                const dateStr = weekDates[col]
                const dayTimedEvents = timedByDay.get(col) ?? []
                return (
                  <div
                    key={col}
                    className={cn(
                      "border-r px-0.5 pb-0.5 space-y-0.5 cursor-pointer hover:bg-muted/50 transition-colors",
                      !cell.isCurrentMonth && "bg-muted/20"
                    )}
                    onClick={() => onClickDate(dateStr)}
                  >
                    {dayTimedEvents.slice(0, MAX_TIMED_EVENTS).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onClickEvent(ev) }}
                        className={cn(
                          "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer border",
                          EVENT_TYPE_STYLES[ev.eventType]
                        )}
                        style={{ borderLeftColor: ev.employeeColor, borderLeftWidth: 3 }}
                      >
                        {`${new Date(ev.startAt).getHours()}:${String(new Date(ev.startAt).getMinutes()).padStart(2, "0")} ${ev.title}`}
                      </div>
                    ))}
                    {dayTimedEvents.length > MAX_TIMED_EVENTS && (
                      <div className="relative group">
                        <span className="text-[9px] text-muted-foreground cursor-pointer hover:text-foreground hover:underline">
                          +{dayTimedEvents.length - MAX_TIMED_EVENTS}件
                        </span>
                        <div className="hidden group-hover:block absolute top-full left-0 z-50 bg-popover text-popover-foreground border rounded-md shadow-lg p-2 min-w-[200px] text-left">
                          <p className="text-[10px] font-bold mb-1 text-muted-foreground">その他のイベント</p>
                          <div className="space-y-1">
                            {dayTimedEvents.slice(MAX_TIMED_EVENTS).map((ev) => (
                              <div
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); onClickEvent(ev) }}
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer",
                                  EVENT_TYPE_STYLES[ev.eventType]
                                )}
                                style={{ borderLeftColor: ev.employeeColor, borderLeftWidth: 3 }}
                              >
                                {`${new Date(ev.startAt).getHours()}:${String(new Date(ev.startAt).getMinutes()).padStart(2, "0")} ${ev.title}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== 週ビュー =====
function WeekView({
  currentDate,
  filteredEvents,
  onClickTime,
  onClickEvent,
}: {
  currentDate: Date
  filteredEvents: ScheduleEventDTO[]
  onClickTime: (dateStr: string) => void
  onClickEvent: (ev: ScheduleEventDTO) => void
}) {
  const dates = getWeekDates(currentDate)
  const today = formatDate(new Date())

  return (
    <div className="h-full flex flex-col">
      {/* 日付ヘッダー */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
        <div />
        {dates.map((d, i) => {
          const dateStr = formatDate(d)
          const isToday = dateStr === today
          return (
            <div key={i} className="text-center py-2 border-l">
              <div className={cn("text-xs", i === 0 && "text-red-500 dark:text-red-400", i === 6 && "text-blue-500 dark:text-blue-400")}>
                {WEEKDAYS[i]}
              </div>
              <div
                className={cn(
                  "text-sm font-medium",
                  isToday && "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto"
                )}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      {/* 終日イベント行 */}
      {(() => {
        const allDayEvents = dates.map((d) =>
          filteredEvents.filter((ev) => {
            if (!ev.allDay) return false
            const start = new Date(ev.startAt)
            const end = new Date(ev.endAt)
            end.setDate(end.getDate() - 1) // GCal終日は翌日まで
            const startD = new Date(start.getFullYear(), start.getMonth(), start.getDate())
            const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate())
            const dayD = new Date(d.getFullYear(), d.getMonth(), d.getDate())
            return dayD >= startD && dayD <= endD
          })
        )
        const hasAllDay = allDayEvents.some((evs) => evs.length > 0)
        if (!hasAllDay) return null
        return (
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
            <div className="text-[10px] text-muted-foreground text-right pr-2 py-1">終日</div>
            {allDayEvents.map((evs, di) => (
              <div key={di} className="border-l p-0.5 min-h-[28px] space-y-0.5">
                {evs.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onClickEvent(ev)}
                    className={cn(
                      "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer border",
                      EVENT_TYPE_STYLES[ev.eventType]
                    )}
                    style={{ borderLeftColor: ev.employeeColor, borderLeftWidth: 3 }}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      })()}
      {/* 時間グリッド */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="h-12 text-[10px] text-muted-foreground text-right pr-2 pt-0.5 border-b">
                {hour}:00
              </div>
              {dates.map((d, di) => {
                const dateStr = formatDate(d)
                const hourEvents = filteredEvents.filter((ev) => {
                  if (ev.allDay) return false
                  const start = new Date(ev.startAt)
                  return isSameDay(start, d) && start.getHours() === hour
                })
                return (
                  <div
                    key={di}
                    className="h-12 border-b border-l hover:bg-muted/30 cursor-pointer relative"
                    onClick={() => {
                      const dt = new Date(d)
                      dt.setHours(hour, 0, 0, 0)
                      onClickTime(dt.toISOString())
                    }}
                  >
                    {hourEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onClickEvent(ev) }}
                        className={cn(
                          "absolute inset-x-0.5 top-0.5 text-[10px] px-1 py-0.5 rounded truncate cursor-pointer border",
                          EVENT_TYPE_STYLES[ev.eventType]
                        )}
                        style={{ borderLeftColor: ev.employeeColor, borderLeftWidth: 3 }}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== 日ビュー =====
function DayView({
  currentDate,
  filteredEvents,
  onClickTime,
  onClickEvent,
}: {
  currentDate: Date
  filteredEvents: ScheduleEventDTO[]
  onClickTime: (dateStr: string) => void
  onClickEvent: (ev: ScheduleEventDTO) => void
}) {
  const todayEvents = filteredEvents.filter((ev) => {
    if (ev.allDay) {
      const start = new Date(ev.startAt)
      const end = new Date(ev.endAt)
      end.setDate(end.getDate() - 1)
      const startD = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      const dayD = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      return dayD >= startD && dayD <= endD
    }
    const start = new Date(ev.startAt)
    return isSameDay(start, currentDate)
  })

  const allDayEvents = todayEvents.filter((ev) => ev.allDay)
  const timedEvents = todayEvents.filter((ev) => !ev.allDay)

  return (
    <div className="h-full overflow-y-auto">
      {/* 終日イベント */}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-[60px_1fr] border-b">
          <div className="text-[10px] text-muted-foreground text-right pr-2 py-2">終日</div>
          <div className="border-l p-1 space-y-1">
            {allDayEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onClickEvent(ev)}
                className={cn(
                  "text-xs px-2 py-1 rounded cursor-pointer border flex items-center gap-2",
                  EVENT_TYPE_STYLES[ev.eventType]
                )}
                style={{ borderLeftColor: ev.employeeColor, borderLeftWidth: 3 }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ev.employeeColor }} />
                <span className="truncate">{ev.title}</span>
                <span className="text-[10px] opacity-70 ml-auto">
                  {ev.participants && ev.participants.length > 1
                    ? ev.participants.map((p) => p.name).join(", ")
                    : ev.employeeName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-[60px_1fr]">
        {HOURS.map((hour) => {
          const hourEvents = timedEvents.filter((ev) => new Date(ev.startAt).getHours() === hour)
          return (
            <div key={hour} className="contents">
              <div className="h-14 text-[10px] text-muted-foreground text-right pr-2 pt-1 border-b">
                {hour}:00
              </div>
              <div
                className="h-14 border-b border-l hover:bg-muted/30 cursor-pointer relative px-1"
                onClick={() => {
                  const dt = new Date(currentDate)
                  dt.setHours(hour, 0, 0, 0)
                  onClickTime(dt.toISOString())
                }}
              >
                {hourEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onClickEvent(ev) }}
                    className={cn(
                      "absolute inset-x-1 top-0.5 text-xs px-2 py-1 rounded cursor-pointer border flex items-center gap-2",
                      EVENT_TYPE_STYLES[ev.eventType]
                    )}
                    style={{ borderLeftColor: ev.employeeColor, borderLeftWidth: 3 }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ev.employeeColor }}
                    />
                    <span className="truncate">{ev.title}</span>
                    <span className="text-[10px] opacity-70 ml-auto">
                      {ev.participants && ev.participants.length > 1
                        ? ev.participants.map((p) => p.name).join(", ")
                        : ev.employeeName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
