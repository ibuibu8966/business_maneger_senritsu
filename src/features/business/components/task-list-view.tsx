"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Repeat, Loader2, Check, X, Trash2, FolderOpen, ChevronRight, ChevronDown, Star, AlertCircle, CalendarDays, Pencil } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  TASK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  ISSUE_STATUS_CONFIG,
  TOOL_CONFIG,
  type TaskItem,
  type TaskStatus,
  type ProjectNode,
  type ChecklistItem,
  type IssueStatus,
  type TicketTool,
} from "./mock-data"
import {
  useBusinessDetails,
  useProjects,
  useBusinessTasks,
  useCreateBusinessTask,
  useUpdateBusinessTask,
  useDeleteBusinessTask,
  useReorderBusinessTasks,
  useAddTaskChecklistItem,
  useUpdateTaskChecklistItem,
  useDeleteTaskChecklistItem,
  useChecklistTemplates,
  useApplyChecklistTemplate,
  useCreateChecklistTemplate,
  useBusinessIssues,
  useUpdateProject,
} from "@/hooks/use-business"
import { useEmployees, useCreateScheduleEvent } from "@/hooks/use-schedule"
import { useContacts, usePartners } from "@/hooks/use-crm"
import { useSession } from "next-auth/react"
import { MemoSection } from "./memo-section"
import { STATUS_DOT, STATUS_CYCLE, STATUS_TOOLTIP } from "./task-list/constants"
import { getAncestorIds } from "./task-list/utils"
import type { BizInfo, IssueInfo } from "./task-list/types"
import { TaskCreateDialog } from "./task-list/task-create-dialog"
import { SortableTaskRow } from "./task-list/sortable-task-row"
import { TaskRowExpanded } from "./task-list/task-row-expanded"
import { TaskChecklistSection } from "./task-list/task-checklist-section"
import { ProjectTreeNode } from "./task-list/project-tree-node"
import { ProjectSidePanel } from "./task-list/project-side-panel"
import { TaskDetailPanel } from "./task-list/task-detail-panel"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { useRealtimeSync } from "@/hooks/use-realtime-sync"
import { queryKeys } from "@/lib/query-keys"




// ===== メイン =====

export function TaskListView() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const userId = session?.user?.id
  const isAdmin = userRole === "master_admin" || userRole === "admin"

  const [filterStaffId, setFilterStaffId] = useState<string>(userId ?? "all")
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all")
  const [showTodayOnly, setShowTodayOnly] = useState<boolean>(false)
  const [showRecurringOnly, setShowRecurringOnly] = useState<boolean>(false)
  const [searchKeyword, setSearchKeyword] = useState<string>("")
  const [filterPriority, setFilterPriority] = useState<"all" | "highest" | "high" | "medium" | "low">("all")
  const [filterDeadline, setFilterDeadline] = useState<"all" | "today" | "thisweek" | "overdue" | "none" | "exists">("all")
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("all")
  const [sortMode, setSortMode] = useState<"manual" | "priority" | "deadline" | "created">("manual")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [taskOrder, setTaskOrder] = useState<string[]>([])

  const { data: businesses = [], isLoading: bizLoading } = useBusinessDetails()
  const { data: projects = [], isLoading: projLoading } = useProjects()
  const { data: tasks = [], isLoading: taskLoading } = useBusinessTasks(
    !isAdmin && userId ? { assigneeId: userId } : undefined
  )
  const { data: employees = [], isLoading: empLoading } = useEmployees()
  const { data: issues = [] } = useBusinessIssues()
  const { data: contactsList = [] } = useContacts()
  const { data: partnersList = [] } = usePartners()
  const updateTaskMutation = useUpdateBusinessTask()
  const deleteTaskMutation = useDeleteBusinessTask()
  const reorderMutation = useReorderBusinessTasks()
  const memoRef = useRef<HTMLTextAreaElement>(null)
  const detailRef = useRef<HTMLTextAreaElement>(null)

  const isLoading = bizLoading || projLoading || taskLoading || empLoading

  // Cast DTO types to match mock types (fields are structurally identical)
  const allBusinesses = businesses as unknown as BizInfo[]
  const allProjects = projects as unknown as ProjectNode[]
  const allTasks = tasks as unknown as TaskItem[]
  const allEmployees = employees as unknown as { id: string; name: string }[]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // 期限判定ヘルパー
  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date(new Date().toDateString())
  }
  const isToday = (deadline: string | null) => {
    if (!deadline) return false
    return deadline === new Date().toISOString().split("T")[0]
  }
  const isThisWeek = (deadline: string | null) => {
    if (!deadline) return false
    const d = new Date(deadline)
    const today = new Date(new Date().toDateString())
    const weekLater = new Date(today)
    weekLater.setDate(weekLater.getDate() + 7)
    return d >= today && d <= weekLater
  }
  const PRIORITY_RANK: Record<string, number> = { highest: 0, high: 1, medium: 2, low: 3 }

  // フィルタリング
  const filteredTasks = allTasks.filter((t) => {
    if (filterStaffId !== "all") {
      const ids = (t.assigneeIds && t.assigneeIds.length > 0) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : [])
      if (!ids.includes(filterStaffId)) return false
    }
    if (filterStatus === "all") {
      if (t.status === "done") return false // 「すべて」でも完了は除外
    } else if (t.status !== filterStatus) return false
    if (showTodayOnly && !t.todayFlag) return false
    // 繰り返し設定本体（recurring=true）はデフォルト非表示。「繰り返しのみ」フィルタON時のみ表示
    if (showRecurringOnly) {
      if (!t.recurring) return false
    } else {
      if (t.recurring) return false
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      const hit = t.title.toLowerCase().includes(kw) || (t.detail ?? "").toLowerCase().includes(kw)
      if (!hit) return false
    }
    if (filterPriority !== "all" && t.priority !== filterPriority) return false
    if (filterDeadline === "today" && !isToday(t.deadline)) return false
    if (filterDeadline === "thisweek" && !isThisWeek(t.deadline)) return false
    if (filterDeadline === "overdue" && (!isOverdue(t.deadline) || t.status === "done")) return false
    if (filterDeadline === "none" && t.deadline) return false
    if (filterDeadline === "exists" && !t.deadline) return false
    if (filterCreatedBy !== "all" && t.createdBy !== filterCreatedBy) return false
    return true
  })

  // 担当者ごとの並び順を取得するヘルパー
  const getSortValue = (t: TaskItem) => {
    if (filterStaffId !== "all" && t.userSortOrders && t.userSortOrders[filterStaffId] !== undefined) {
      return t.userSortOrders[filterStaffId]
    }
    return t.sortOrder
  }

  // 並び替え（手動以外）
  const baseSorted = (() => {
    if (sortMode === "manual") return [...filteredTasks].sort((a, b) => getSortValue(a) - getSortValue(b))
    if (sortMode === "priority") return [...filteredTasks].sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))
    if (sortMode === "deadline") return [...filteredTasks].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline.localeCompare(b.deadline)
    })
    if (sortMode === "created") return [...filteredTasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return filteredTasks
  })()
  // どの並び替えでも「今日やる」フラグONのタスクを常に上位固定
  const sortedTasks = [
    ...baseSorted.filter((t) => t.todayFlag),
    ...baseSorted.filter((t) => !t.todayFlag),
  ]

  // 担当者フィルタのみが有効（他の絞り込みは無効）の状態を判定
  const isOnlyAssigneeFilterActive =
    filterStaffId !== "all" &&
    filterStatus === "all" &&
    !showTodayOnly &&
    !showRecurringOnly &&
    searchKeyword.trim().length === 0 &&
    filterPriority === "all" &&
    filterDeadline === "all" &&
    filterCreatedBy === "all" &&
    sortMode === "manual"

  // 絞り込み or 並び替え（手動以外）が有効なら D&D 無効化
  // ただし「担当者フィルタのみ」の状態では並び替え可能にする（人別sortOrderに保存）
  const isFilteringActive =
    !isOnlyAssigneeFilterActive && (
      filterStaffId !== "all" ||
      filterStatus !== "all" ||
      showTodayOnly ||
      showRecurringOnly ||
      searchKeyword.trim().length > 0 ||
      filterPriority !== "all" ||
      filterDeadline !== "all" ||
      filterCreatedBy !== "all" ||
      sortMode !== "manual"
    )

  const handleToggleTodayFlag = (t: TaskItem) => {
    updateTaskMutation.mutate({ id: t.id, data: { todayFlag: !t.todayFlag } })
  }

  // カスタム順序の適用（絞り込み・並び替え中は適用しない）
  const orderedTasks = isFilteringActive
    ? sortedTasks
    : (taskOrder.length > 0
        ? taskOrder
            .map((id) => sortedTasks.find((t) => t.id === id))
            .filter((t): t is TaskItem => !!t)
            .concat(sortedTasks.filter((t) => !taskOrder.includes(t.id)))
        : sortedTasks)

  const handleDragEnd = (event: DragEndEvent) => {
    if (isFilteringActive) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedTasks.findIndex((t) => t.id === active.id)
    const newIndex = orderedTasks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(orderedTasks.map((t) => t.id), oldIndex, newIndex)
    setTaskOrder(newOrder)

    // 担当者フィルタONなら、その人専用の並び順だけ更新（他の人に影響しない）
    if (isOnlyAssigneeFilterActive && filterStaffId !== "all") {
      reorderMutation.mutate({ taskIds: newOrder, employeeId: filterStaffId })
      return
    }
    // 全タスクの順序を再構築して送信（リロード後も並びが維持されるように）
    // 表示中タスクの新順序 + 非表示タスクは元の sortOrder を維持
    const visibleIdSet = new Set(newOrder)
    const hiddenTasksInOrder = allTasks
      .filter((t) => !visibleIdSet.has(t.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => t.id)
    const fullOrder = [...newOrder, ...hiddenTasksInOrder]
    reorderMutation.mutate({ taskIds: fullOrder })
  }

  // 選択中タスクの詳細
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const selectedTask = allTasks.find((t) => t.id === selectedTaskId) ?? null

  // Supabase Realtime 同期：他ユーザーの変更を即時反映
  useRealtimeSync({
    channel: "business-tasks-page",
    tables: [
      "business_tasks",
      "task_assignees",
      "task_user_sort_orders",
      "task_checklist_items",
      "projects",
      "business_issues",
      "schedule_events",
    ],
    queryKeys: [
      queryKeys.businessTasks.all,
      queryKeys.projects.all,
      queryKeys.businessIssues.all,
      queryKeys.businessDetails.all,
      queryKeys.scheduleEvents.all,
    ],
  })

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const leftColumn = (
    <div className="h-full overflow-y-auto">
        {/* 1段目: 担当者 + ステータスフィルタ + 今日やる + 繰り返しのみ */}
        <div className="px-3 pt-2 pb-1.5 border-b flex items-center gap-2 flex-wrap text-[11px]">
          {isAdmin && (
            <select
              className="text-[11px] border rounded-md px-1.5 py-1 bg-background h-7"
              value={filterStaffId}
              onChange={(e) => setFilterStaffId(e.target.value)}
            >
              <option value="all">担当者: 全員</option>
              {allEmployees.map((s) => (
                <option key={s.id} value={s.id}>担当者: {s.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-0.5">
            {(["all", "todo", "in-progress", "waiting", "done"] as (TaskStatus | "all")[]).map((s) => {
              const label = s === "all" ? "すべて" : TASK_STATUS_CONFIG[s as TaskStatus].label
              const isActive = filterStatus === s
              return (
                <span
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2 py-1 cursor-pointer text-[11px] ${isActive ? "rounded bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </span>
              )
            })}
          </div>

          <span
            onClick={() => setShowTodayOnly((v) => !v)}
            title="今日やるフラグのついたタスクのみ表示"
            className={`px-2 py-1 cursor-pointer text-[11px] flex items-center gap-1 ${showTodayOnly ? "rounded bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Star className={`w-3 h-3 ${showTodayOnly ? "fill-yellow-400 text-yellow-500" : ""}`} />
            今日やる
          </span>

          <span
            onClick={() => setShowRecurringOnly((v) => !v)}
            title="繰り返し設定がONの親タスクのみ表示"
            className={`px-2 py-1 cursor-pointer text-[11px] flex items-center gap-1 ${showRecurringOnly ? "rounded bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Repeat className={`w-3 h-3 ${showRecurringOnly ? "text-blue-600 dark:text-blue-400" : ""}`} />
            繰り返しのみ
          </span>
        </div>

        {/* 2段目: ＋タスク登録 */}
        <div className="px-3 py-1.5 border-b">
          <Button size="sm" className="h-7 text-[11px] cursor-pointer" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-3 h-3 mr-1" />タスク登録
          </Button>
        </div>

        {/* 3段目: 検索＋絞り込み＋並び順 */}
        <div className="px-3 py-1.5 border-b flex items-center gap-1 flex-wrap bg-muted/20">
          <Input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="タイトル・詳細を検索"
            className="h-7 text-[11px] flex-1 min-w-[120px]"
          />
          <select
            className="text-[11px] border rounded-md px-1.5 py-1 bg-background h-7"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)}
          >
            <option value="all">優先度：すべて</option>
            <option value="highest">最高</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <select
            className="text-[11px] border rounded-md px-1.5 py-1 bg-background h-7"
            value={filterDeadline}
            onChange={(e) => setFilterDeadline(e.target.value as typeof filterDeadline)}
          >
            <option value="all">期限：すべて</option>
            <option value="today">今日</option>
            <option value="thisweek">今週</option>
            <option value="overdue">期限切れ</option>
            <option value="exists">期限あり</option>
            <option value="none">期限なし</option>
          </select>
          <select
            className="text-[11px] border rounded-md px-1.5 py-1 bg-background h-7"
            value={filterCreatedBy}
            onChange={(e) => setFilterCreatedBy(e.target.value)}
          >
            <option value="all">作成者：すべて</option>
            {Array.from(new Set(allTasks.map((t) => t.createdBy).filter(Boolean))).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            className="text-[11px] border rounded-md px-1.5 py-1 bg-background h-7"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
          >
            <option value="manual">並び順: 手動順</option>
            <option value="priority">並び順: 優先度高い順</option>
            <option value="deadline">並び順: 期限近い順</option>
            <option value="created">並び順: 作成日新しい順</option>
          </select>
        </div>

        {/* 絞り込み中メッセージ */}
        {isFilteringActive && (
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-900">
            絞り込み中／並び替え中のためドラッグ&ドロップは無効です。手動で並び替えるには絞り込みを解除してください。
          </div>
        )}

        {/* タスクリスト（フラット表示） */}
        <div className="p-3">
          {orderedTasks.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              該当するタスクはありません
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {orderedTasks.map((t, i) => (
                    <div key={t.id}>
                      <SortableTaskRow
                        task={t}
                        index={i}
                        onClickTask={(task) => setSelectedTaskId(task.id)}
                        onToggleTodayFlag={handleToggleTodayFlag}
                        isSelected={selectedTaskId === t.id}
                      />
                      {selectedTaskId === t.id && <TaskRowExpanded task={t} />}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
    </div>
  )

  const rightColumn = (
    <ProjectSidePanel
      selectedTask={selectedTask}
      allTasks={allTasks}
      allProjects={allProjects}
      allBusinesses={allBusinesses}
      allIssues={issues as unknown as IssueInfo[]}
      onSelectTask={setSelectedTaskId}
    />
  )

  return (
    <div className="h-full">
      {selectedTask ? (
        <ResizablePanelGroup direction="horizontal" autoSaveId="task-list-with-detail" className="h-full">
          <ResizablePanel id="tasks-list" order={1} defaultSize={40} minSize={25}>
            {leftColumn}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="task-detail" order={2} defaultSize={30} minSize={20}>
            <TaskDetailPanel
              task={selectedTask}
              onClose={() => setSelectedTaskId(null)}
              updateTaskMutation={updateTaskMutation}
              deleteTaskMutation={deleteTaskMutation}
              memoRef={memoRef}
              detailRef={detailRef}
              contacts={contactsList as unknown as { id: string; name: string }[]}
              partners={partnersList as unknown as { id: string; name: string }[]}
              issues={(issues as unknown as { id: string; title: string; projectId: string }[])}
              businesses={allBusinesses as unknown as { id: string; name: string }[]}
              projects={allProjects}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="project-side" order={3} defaultSize={30} minSize={15}>
            {rightColumn}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <ResizablePanelGroup direction="horizontal" autoSaveId="task-list-no-detail" className="h-full">
          <ResizablePanel id="tasks-list" order={1} defaultSize={70} minSize={30}>
            {leftColumn}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="project-side" order={3} defaultSize={30} minSize={15}>
            {rightColumn}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <TaskCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        businesses={allBusinesses}
        projects={allProjects}
        employees={allEmployees}
        contacts={contactsList as unknown as { id: string; name: string }[]}
        partners={partnersList as unknown as { id: string; name: string }[]}
        issues={(issues as unknown as { id: string; title: string; projectId: string }[])}
        taskCount={allTasks.length}
        currentUserName={session?.user?.name ?? "野田"}
      />
    </div>
  )
}
