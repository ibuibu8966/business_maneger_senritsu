"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Settings2, Columns2, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card" // DragOverlay用
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useDashboardLayout, useUpdateDashboardLayout } from "@/hooks/use-dashboard"
import type { DashboardCardConfig } from "@/types/dto"

import { DashboardMyTaskCard, DashboardAllTaskCard } from "./dashboard-task-card"
import { DashboardMyIssueCard, DashboardAllIssueCard } from "./dashboard-issue-card"
import { DashboardScheduleCard } from "./dashboard-schedule-card"
import { DashboardBalanceCard } from "./dashboard-balance-card"
import { DashboardAuditCard } from "./dashboard-audit-card"
import { DashboardSalonMeetingCard } from "./dashboard-salon-meeting-card"

const CARD_TYPE_LABELS: Record<string, string> = {
  "my-task": "自分のタスク",
  "all-task": "全員のタスク",
  "my-issue": "自分の課題",
  "all-issue": "全員の課題",
  schedule: "スケジュール",
  "salon-meeting": "面談予定",
  balance: "口座サマリー",
  audit: "操作履歴",
}

const CARD_TYPE_HREF: Record<string, string | null> = {
  "my-task": "/business?tab=tasks",
  "all-task": "/business?tab=tasks",
  "my-issue": "/business?tab=issues",
  "all-issue": "/business?tab=issues",
  schedule: "/schedule",
  "salon-meeting": "/crm",
  balance: "/balance",
  audit: null,
}

const ALL_CARD_TYPES = [
  "my-task", "all-task", "my-issue", "all-issue",
  "schedule", "salon-meeting", "balance", "audit",
] as const

const DEFAULT_LAYOUT: DashboardCardConfig[] = [
  { cardType: "my-task", id: "card-my-task", sortOrder: 0 },
  { cardType: "my-issue", id: "card-my-issue", sortOrder: 1 },
  { cardType: "schedule", id: "card-schedule", sortOrder: 2 },
  { cardType: "salon-meeting", id: "card-salon-meeting", sortOrder: 3 },
  { cardType: "balance", id: "card-balance", sortOrder: 4 },
  { cardType: "audit", id: "card-audit", sortOrder: 5 },
]

function CardRenderer({ cardType }: { cardType: string }) {
  switch (cardType) {
    case "my-task":
      return <DashboardMyTaskCard />
    case "all-task":
      return <DashboardAllTaskCard />
    case "my-issue":
      return <DashboardMyIssueCard />
    case "all-issue":
      return <DashboardAllIssueCard />
    case "schedule":
      return <DashboardScheduleCard />
    case "salon-meeting":
      return <DashboardSalonMeetingCard />
    case "balance":
      return <DashboardBalanceCard />
    case "audit":
      return <DashboardAuditCard />
    default:
      return null
  }
}

function SortableCard({
  card,
  onClick,
}: {
  card: DashboardCardConfig
  onClick: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const href = CARD_TYPE_HREF[card.cardType]

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const colSpan = card.colSpan ?? 1

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "rounded-lg transition-shadow [&>div]:h-full",
        isDragging && "opacity-50",
        href && "cursor-pointer",
        colSpan === 2 ? "md:col-span-2" : "col-span-1",
      )}
    >
      <CardRenderer cardType={card.cardType} />
    </div>
  )
}

export function DashboardView() {
  const router = useRouter()
  const { data: layoutData, isLoading } = useDashboardLayout()
  const updateLayout = useUpdateDashboardLayout()

  const [cards, setCards] = useState<DashboardCardConfig[]>(DEFAULT_LAYOUT)
  const [dragActiveId, setDragActiveId] = useState<string | null>(null)
  const initialized = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (layoutData && !initialized.current) {
      const raw = layoutData.layout as DashboardCardConfig[]
      if (Array.isArray(raw) && raw.length > 0) {
        // 旧カード種別を新種別にマイグレーション
        const VALID_TYPES = new Set(ALL_CARD_TYPES)
        const MIGRATION: Record<string, string> = {
          task: "my-task",
          issue: "my-issue",
        }
        const migrated = raw
          .map((c) => {
            const newType = MIGRATION[c.cardType] ?? c.cardType
            if (!VALID_TYPES.has(newType as typeof ALL_CARD_TYPES[number])) return null
            return { ...c, cardType: newType as DashboardCardConfig["cardType"] }
          })
          .filter((c): c is DashboardCardConfig => c !== null)
        setCards(migrated.length > 0 ? migrated : DEFAULT_LAYOUT)
      }
      initialized.current = true
    }
  }, [layoutData])

  const saveLayout = useCallback(
    (newCards: DashboardCardConfig[]) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        updateLayout.mutate(newCards)
      }, 500)
    },
    [updateLayout]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setDragActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    setCards((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id)
      const newIndex = prev.findIndex((c) => c.id === over.id)
      const newCards = arrayMove(prev, oldIndex, newIndex).map((c, i) => ({
        ...c,
        sortOrder: i,
      }))
      saveLayout(newCards)
      return newCards
    })
  }

  function handleCardClick(cardType: string) {
    if (dragActiveId) return
    const href = CARD_TYPE_HREF[cardType]
    if (href) router.push(href)
  }

  function handleToggleCard(cardType: string, visible: boolean) {
    setCards((prev) => {
      let newCards: DashboardCardConfig[]
      if (visible) {
        const newCard: DashboardCardConfig = {
          cardType: cardType as DashboardCardConfig["cardType"],
          id: `card-${cardType}-${Date.now()}`,
          sortOrder: prev.length,
        }
        newCards = [...prev, newCard]
      } else {
        newCards = prev
          .filter((c) => c.cardType !== cardType)
          .map((c, i) => ({ ...c, sortOrder: i }))
      }
      saveLayout(newCards)
      return newCards
    })
  }

  function handleToggleSize(cardType: string) {
    setCards((prev) => {
      const newCards = prev.map((c) =>
        c.cardType === cardType
          ? { ...c, colSpan: (c.colSpan ?? 1) === 1 ? 2 as const : 1 as const }
          : c
      )
      saveLayout(newCards)
      return newCards
    })
  }

  const dragActiveCard = dragActiveId ? cards.find((c) => c.id === dragActiveId) : null

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-end mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
            <Settings2 className="w-4 h-4" />
            表示設定
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-3">
            <p className="text-sm font-medium mb-3">カードの表示/非表示・サイズ</p>
            <div className="space-y-3">
              {ALL_CARD_TYPES.map((type) => {
                const isVisible = cards.some((c) => c.cardType === type)
                const currentCard = cards.find((c) => c.cardType === type)
                const currentSpan = currentCard?.colSpan ?? 1
                return (
                  <div key={type} className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${type}`} className="text-sm flex-1 min-w-0 truncate">
                      {CARD_TYPE_LABELS[type]}
                    </Label>
                    {isVisible && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] shrink-0"
                        onClick={() => handleToggleSize(type)}
                      >
                        {currentSpan === 1 ? (
                          <><Square className="w-3 h-3 mr-0.5" />小</>
                        ) : (
                          <><Columns2 className="w-3 h-3 mr-0.5" />大</>
                        )}
                      </Button>
                    )}
                    <Switch
                      id={`toggle-${type}`}
                      checked={isVisible}
                      onCheckedChange={(checked) => handleToggleCard(type, checked)}
                    />
                  </div>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-auto" style={{ gridAutoFlow: "dense" }}>
            {cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card.cardType)}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {dragActiveCard && (
            <Card className={cn(
              "shadow-xl ring-2 ring-primary opacity-90",
              (dragActiveCard.colSpan ?? 1) === 2 && "md:col-span-2",
            )}>
              <CardRenderer cardType={dragActiveCard.cardType} />
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
