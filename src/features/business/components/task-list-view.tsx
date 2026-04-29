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
import { TaskChecklistSection } from "./task-list/task-checklist-section"
import { ProjectTreeNode } from "./task-list/project-tree-node"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"



// ===== 左パネル: プロジェクトサイドパネル =====

// BizInfo, IssueInfo は ./task-list/types に移動

function ProjectSidePanel({
  selectedTask,
  allTasks,
  allProjects,
  allBusinesses,
  allIssues,
  onSelectTask,
}: {
  selectedTask: TaskItem | null
  allTasks: TaskItem[]
  allProjects: ProjectNode[]
  allBusinesses: BizInfo[]
  allIssues: IssueInfo[]
  onSelectTask: (id: string) => void
}) {
  const [expandedBizIds, setExpandedBizIds] = useState<Set<string>>(new Set())
  const [expandedProjIds, setExpandedProjIds] = useState<Set<string>>(new Set())

  // タスク選択時、該当の事業+PJ階層を自動展開
  const autoExpandedBizIds = new Set(expandedBizIds)
  const autoExpandedProjIds = new Set(expandedProjIds)
  if (selectedTask) {
    const proj = allProjects.find((p) => p.id === selectedTask.projectId)
    if (proj) {
      autoExpandedBizIds.add(proj.businessId)
      autoExpandedProjIds.add(proj.id)
      getAncestorIds(proj.id, allProjects).forEach((id) => autoExpandedProjIds.add(id))
    }
  }

  const toggleBiz = (id: string) => {
    setExpandedBizIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleProj = (id: string) => {
    setExpandedProjIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const updateProjectMutation = useUpdateProject()
  const handleUpdateProject = (id: string, data: Record<string, unknown>) => {
    updateProjectMutation.mutate({ id, data })
  }

  const bizGroups = allBusinesses.filter((biz) =>
    allProjects.some((p) => p.businessId === biz.id)
  )

  return (
    <div className="border-l bg-card h-full flex flex-col">
      <div className="px-3 py-2.5 border-b shrink-0">
        <h3 className="text-sm font-bold">事業・プロジェクト</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {bizGroups.map((biz) => {
          const isExpanded = autoExpandedBizIds.has(biz.id)
          const topProjects = allProjects.filter((p) => p.businessId === biz.id && !p.parentId)
          return (
            <div key={biz.id}>
              {/* 事業ヘッダー */}
              <div
                onClick={() => toggleBiz(biz.id)}
                className="flex items-center gap-1 py-1.5 px-1 rounded hover:bg-muted/50 cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[biz.status] ?? "bg-gray-300 dark:bg-gray-500"}`} />
                <span className="text-sm font-bold truncate">{biz.name}</span>
              </div>

              {/* 事業展開時 */}
              {isExpanded && (
                <div className="ml-3 border-l border-muted pl-2 space-y-2 pb-1">
                  {biz.purpose && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">目的</p>
                      <p className="text-xs">{biz.purpose}</p>
                    </div>
                  )}

                  {biz.assignees?.length > 0 && (
                    <p className="text-xs"><span className="text-muted-foreground">担当:</span> {biz.assignees.map(a => a.name).join(", ")}</p>
                  )}
                  {biz.accountNames && biz.accountNames.length > 0 && (
                    <p className="text-xs"><span className="text-muted-foreground">口座:</span> {biz.accountNames.join(", ")}</p>
                  )}
                  {biz.partnerNames && biz.partnerNames.length > 0 && (
                    <p className="text-xs"><span className="text-muted-foreground">取引先:</span> {biz.partnerNames.join(", ")}</p>
                  )}

                  {/* 関係者 */}
                  {biz.relatedContacts && biz.relatedContacts.length > 0 && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">関係者</p>
                      <div className="space-y-0.5">
                        {biz.relatedContacts.map((c) => (
                          <p key={c.id} className="text-xs"><span className="font-medium">{c.name}</span>{c.role && <span className="text-muted-foreground ml-1">({c.role})</span>}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {biz.contractMemo && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">契約メモ</p>
                      <p className="text-xs bg-muted/50 rounded p-1.5">{biz.contractMemo}</p>
                    </div>
                  )}

                  {/* 資料 */}
                  {biz.attachments && biz.attachments.length > 0 && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">資料</p>
                      <div className="space-y-0.5">
                        {biz.attachments.map((a) => (
                          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 dark:text-blue-400 hover:underline truncate">
                            {a.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 事業全体の課題件数 */}
                  {(() => {
                    const bizProjIds = allProjects.filter((p) => p.businessId === biz.id).map((p) => p.id)
                    const bizIssues = allIssues.filter((i) => bizProjIds.includes(i.projectId))
                    const bizUnresolved = bizIssues.filter((i) => i.status !== "resolved").length
                    if (bizIssues.length === 0) return null
                    return (
                      <p className="text-xs"><span className="text-muted-foreground">課題:</span> <span className={bizUnresolved > 0 ? "text-red-600 font-medium" : ""}>{bizUnresolved}件未解決</span> / {bizIssues.length}件</p>
                    )
                  })()}

                  {/* メモ */}
                  <MemoSection businessId={biz.id} compact />

                  {/* 配下のプロジェクト（再帰ツリー） */}
                  {topProjects.map((proj) => (
                    <ProjectTreeNode
                      key={proj.id}
                      proj={proj}
                      depth={0}
                      allProjects={allProjects}
                      allTasks={allTasks}
                      allIssues={allIssues}
                      expandedIds={autoExpandedProjIds}
                      onToggle={toggleProj}
                      selectedTaskId={selectedTask?.id ?? null}
                      onSelectTask={onSelectTask}
                      onUpdateProject={handleUpdateProject}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== タスク詳細パネル =====

function TaskDetailPanel({
  task,
  onClose,
  updateTaskMutation,
  deleteTaskMutation,
  memoRef,
  detailRef,
  contacts,
  partners,
  issues,
}: {
  task: TaskItem
  onClose: () => void
  updateTaskMutation: ReturnType<typeof useUpdateBusinessTask>
  deleteTaskMutation: ReturnType<typeof useDeleteBusinessTask>
  memoRef: React.RefObject<HTMLTextAreaElement | null>
  detailRef: React.RefObject<HTMLTextAreaElement | null>
  contacts: { id: string; name: string }[]
  partners: { id: string; name: string }[]
  issues: { id: string; title: string; projectId: string }[]
}) {
  const [showRecurring, setShowRecurring] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [schedDate, setSchedDate] = useState(task.deadline ?? new Date().toISOString().split("T")[0])
  const [schedStartTime, setSchedStartTime] = useState(task.executionTime ?? "09:00")
  const [schedEndTime, setSchedEndTime] = useState(() => {
    const start = task.executionTime ?? "09:00"
    const [h, m] = start.split(":").map(Number)
    return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  })
  const [schedTitle, setSchedTitle] = useState(task.title)
  const createScheduleMutation = useCreateScheduleEvent()
  const { data: employees = [] } = useEmployees()

  // タイトル編集用 state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(task.title)
  useEffect(() => {
    setDraftTitle(task.title)
    setIsEditingTitle(false)
  }, [task.id, task.title])
  const commitTitleEdit = () => {
    const trimmed = draftTitle.trim()
    if (!trimmed || trimmed === task.title) {
      setDraftTitle(task.title)
      setIsEditingTitle(false)
      return
    }
    updateTaskMutation.mutate(
      { id: task.id, data: { title: trimmed } },
      {
        onSuccess: () => toast.success("タスク名を更新しました"),
        onError: () => {
          toast.error("更新に失敗しました")
          setDraftTitle(task.title)
        },
      }
    )
    setIsEditingTitle(false)
  }
  const cancelTitleEdit = () => {
    setDraftTitle(task.title)
    setIsEditingTitle(false)
  }

  const WEEKDAY_LABELS: Record<number, string> = { 0: "日曜日", 1: "月曜日", 2: "火曜日", 3: "水曜日", 4: "木曜日", 5: "金曜日", 6: "土曜日" }
  const PATTERN_LABELS: Record<string, string> = { daily: "毎日", weekly: "毎週", monthly_date: "毎月（日付）", monthly_weekday: "毎月（曜日）" }

  const recurringLabel = task.recurringPattern
    ? (() => {
        const p = PATTERN_LABELS[task.recurringPattern] ?? task.recurringPattern
        if (task.recurringPattern === "weekly" && task.recurringDay != null) return `${p} ${WEEKDAY_LABELS[task.recurringDay] ?? ""}`
        if (task.recurringPattern === "monthly_date" && task.recurringDay != null) return `${p} ${task.recurringDay}日`
        if (task.recurringPattern === "monthly_weekday" && task.recurringWeek != null && task.recurringDay != null) return `${p} 第${task.recurringWeek}${WEEKDAY_LABELS[task.recurringDay] ?? ""}`
        return p
      })()
    : "繰り返し"

  return (
    <div className="border-l overflow-y-auto p-4 space-y-4 h-full">
      <div className="flex items-center justify-between gap-2">
        {isEditingTitle ? (
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitTitleEdit()
              } else if (e.key === "Escape") {
                e.preventDefault()
                cancelTitleEdit()
              }
            }}
            className="text-base font-bold flex-1 min-w-0 bg-background border border-primary/50 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
            autoFocus
            disabled={updateTaskMutation.isPending}
          />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="text-base font-bold truncate">{task.title}</h3>
            <button
              onClick={() => {
                setDraftTitle(task.title)
                setIsEditingTitle(true)
              }}
              className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="タスク名を編集"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg cursor-pointer shrink-0">&times;</button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`font-semibold ${TASK_STATUS_CONFIG[task.status].className}`}>
          {TASK_STATUS_CONFIG[task.status].label}
        </Badge>
        {task.recurring ? (
          <Badge
            variant="outline"
            className="text-xs text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40"
            onClick={() => setShowRecurring(!showRecurring)}
          >
            <Repeat className="w-3 h-3 mr-1" />{recurringLabel}
          </Badge>
        ) : (
          <button
            className="text-xs text-muted-foreground hover:text-blue-600 cursor-pointer flex items-center gap-1"
            onClick={() => setShowRecurring(!showRecurring)}
          >
            <Plus className="w-3 h-3" />繰り返し設定
          </button>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {task.seqNumber && <span className="font-mono font-bold mr-1">#{task.seqNumber}</span>}
          {task.businessName} &gt; {task.projectName}
        </span>
      </div>

      {/* 紐づく課題 */}
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3 h-3 text-orange-500 shrink-0" />
        <select
          className="text-xs border rounded px-1.5 py-0.5 bg-background cursor-pointer flex-1"
          value={task.issueId ?? ""}
          onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { issueId: e.target.value || null } })}
        >
          <option value="">課題なし</option>
          {issues.filter((i) => i.projectId === task.projectId).map((i) => (
            <option key={i.id} value={i.id}>{i.title}</option>
          ))}
        </select>
      </div>

      {/* スケジュール */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <CalendarDays className="w-3 h-3" />スケジュール
          </div>
          <button
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 cursor-pointer"
            onClick={() => setShowScheduleForm(!showScheduleForm)}
          >
            {showScheduleForm ? "閉じる" : "+ 登録"}
          </button>
        </div>

        {/* 登録済みスケジュール一覧 */}
        {task.scheduleEvents && task.scheduleEvents.length > 0 && (
          <div className="space-y-1">
            {task.scheduleEvents.map((se: any) => (
              <div key={se.id} className="text-[10px] p-1.5 rounded bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-400 flex items-center gap-2">
                <CalendarDays className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="truncate flex-1">{se.title}</span>
                <span className="text-muted-foreground shrink-0">
                  {se.allDay
                    ? new Date(se.startAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
                    : `${new Date(se.startAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} ${new Date(se.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* スケジュール登録フォーム */}
        {showScheduleForm && (
          <div className="space-y-2 border rounded-md p-3 bg-blue-50/50 dark:bg-blue-900/10">
            <div>
              <Label className="text-xs">タイトル</Label>
              <Input className="mt-1 h-7 text-xs" value={schedTitle} onChange={(e) => setSchedTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">日付</Label>
                <Input type="date" className="mt-1 h-7 text-xs" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">開始</Label>
                <Input type="time" className="mt-1 h-7 text-xs" value={schedStartTime} onChange={(e) => setSchedStartTime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">終了</Label>
                <Input type="time" className="mt-1 h-7 text-xs" value={schedEndTime} onChange={(e) => setSchedEndTime(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowScheduleForm(false)}>
                キャンセル
              </Button>
              <Button
                size="sm"
                className="h-6 text-[10px]"
                disabled={!schedTitle.trim() || !schedDate || createScheduleMutation.isPending}
                onClick={() => {
                  const startAt = `${schedDate}T${schedStartTime}:00`
                  const endAt = `${schedDate}T${schedEndTime}:00`
                  // 複数担当者対応: 先頭をメイン、残りをparticipantIdsに
                  const allAssigneeIds: string[] = (task.assigneeIds && task.assigneeIds.length > 0)
                    ? task.assigneeIds
                    : (task.assigneeId ? [task.assigneeId] : [])
                  const mainEmployeeId = allAssigneeIds[0] ?? employees[0]?.id ?? ""
                  const participantIds = allAssigneeIds.slice(1)
                  createScheduleMutation.mutate({
                    title: schedTitle.trim(),
                    startAt: new Date(startAt).toISOString(),
                    endAt: new Date(endAt).toISOString(),
                    employeeId: mainEmployeeId,
                    participantIds,
                    eventType: "work",
                    taskId: task.id,
                  }, {
                    onSuccess: () => {
                      setShowScheduleForm(false)
                    },
                  })
                }}
              >
                {createScheduleMutation.isPending ? "登録中..." : "スケジュール登録"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 繰り返し設定セクション */}
      {showRecurring && (
        <div className="space-y-2 border rounded-md p-3 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">繰り返し設定</p>
            {task.recurring && (
              <button
                className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                onClick={() => {
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: { recurring: false, recurringPattern: null, recurringDay: null, recurringWeek: null, recurringEndDate: null }
                  })
                  setShowRecurring(false)
                }}
              >
                繰り返しを停止
              </button>
            )}
          </div>
          <div>
            <Label className="text-xs">パターン</Label>
            <select
              className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer"
              value={task.recurringPattern ?? ""}
              onChange={(e) => {
                const pattern = e.target.value || null
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { recurring: !!pattern, recurringPattern: pattern, recurringDay: null, recurringWeek: null }
                })
              }}
            >
              <option value="">なし</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
              <option value="monthly_date">毎月（日付指定）</option>
              <option value="monthly_weekday">毎月（曜日指定）</option>
            </select>
          </div>
          {task.recurringPattern === "weekly" && (
            <div>
              <Label className="text-xs">曜日</Label>
              <select
                className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer"
                value={task.recurringDay != null ? String(task.recurringDay) : ""}
                onChange={(e) => {
                  updateTaskMutation.mutate({ id: task.id, data: { recurringDay: e.target.value ? Number(e.target.value) : null } })
                }}
              >
                <option value="">選択してください</option>
                <option value="1">月曜日</option>
                <option value="2">火曜日</option>
                <option value="3">水曜日</option>
                <option value="4">木曜日</option>
                <option value="5">金曜日</option>
                <option value="6">土曜日</option>
                <option value="0">日曜日</option>
              </select>
            </div>
          )}
          {task.recurringPattern === "monthly_date" && (
            <div>
              <Label className="text-xs">日付</Label>
              <select
                className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer"
                value={task.recurringDay != null ? String(task.recurringDay) : ""}
                onChange={(e) => {
                  updateTaskMutation.mutate({ id: task.id, data: { recurringDay: e.target.value ? Number(e.target.value) : null } })
                }}
              >
                <option value="">選択してください</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>{i + 1}日</option>
                ))}
              </select>
            </div>
          )}
          {task.recurringPattern === "monthly_weekday" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">第何週</Label>
                <select
                  className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer"
                  value={task.recurringWeek != null ? String(task.recurringWeek) : ""}
                  onChange={(e) => {
                    updateTaskMutation.mutate({ id: task.id, data: { recurringWeek: e.target.value ? Number(e.target.value) : null } })
                  }}
                >
                  <option value="">選択</option>
                  <option value="1">第1週</option>
                  <option value="2">第2週</option>
                  <option value="3">第3週</option>
                  <option value="4">第4週</option>
                  <option value="5">第5週</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">曜日</Label>
                <select
                  className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer"
                  value={task.recurringDay != null ? String(task.recurringDay) : ""}
                  onChange={(e) => {
                    updateTaskMutation.mutate({ id: task.id, data: { recurringDay: e.target.value ? Number(e.target.value) : null } })
                  }}
                >
                  <option value="">選択</option>
                  <option value="1">月曜日</option>
                  <option value="2">火曜日</option>
                  <option value="3">水曜日</option>
                  <option value="4">木曜日</option>
                  <option value="5">金曜日</option>
                  <option value="6">土曜日</option>
                  <option value="0">日曜日</option>
                </select>
              </div>
            </div>
          )}
          {task.recurringPattern && (
            <div>
              <Label className="text-xs">終了日（任意）</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-sm"
                value={task.recurringEndDate ?? ""}
                onChange={(e) => {
                  updateTaskMutation.mutate({ id: task.id, data: { recurringEndDate: e.target.value || null } })
                }}
              />
            </div>
          )}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">詳細</p>
        <Textarea
          ref={detailRef}
          className="text-sm min-h-[80px]"
          placeholder="詳細を入力..."
          defaultValue={task.detail ?? ""}
          key={`detail-${task.id}`}
        />
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            className="text-xs cursor-pointer"
            disabled={updateTaskMutation.isPending}
            onClick={() => {
              const val = detailRef.current?.value ?? ""
              updateTaskMutation.mutate(
                { id: task.id, data: { detail: val } },
                {
                  onSuccess: () => toast.success("詳細を保存しました"),
                  onError: () => toast.error("詳細の保存に失敗しました"),
                }
              )
            }}
          >
            {updateTaskMutation.isPending ? "保存中..." : "詳細保存"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">担当者（複数選択可）</p>
          <div className="flex flex-wrap gap-1">
            {employees.map((emp) => {
              const currentIds: string[] = (task.assigneeIds && task.assigneeIds.length > 0)
                ? task.assigneeIds
                : (task.assigneeId ? [task.assigneeId] : [])
              const checked = currentIds.includes(emp.id)
              return (
                <label
                  key={emp.id}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 border rounded cursor-pointer ${checked ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100" : "bg-background"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...currentIds, emp.id]
                        : currentIds.filter((id) => id !== emp.id)
                      const names = employees.filter((em) => next.includes(em.id)).map((em) => em.name)
                      updateTaskMutation.mutate({
                        id: task.id,
                        data: {
                          assigneeIds: next,
                          assigneeId: next[0] ?? null,
                          assigneeName: names[0] ?? null,
                          assigneeNames: names,
                        },
                      })
                    }}
                  />
                  {emp.name}
                </label>
              )
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">作成者</p>
          <p className="text-sm">{task.createdBy || "不明"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">作成日</p>
          <p className="text-sm">{task.createdAt ? task.createdAt.split("T")[0] : "不明"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">締切</p>
          <p className={`text-sm ${task.deadline && new Date(task.deadline) < new Date() && task.status !== "done" ? "text-red-600 font-medium" : ""}`}>
            {task.deadline ?? "なし"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">実行時刻（LINE通知）</p>
          {task.executionTime ? (
            <div className="flex items-center gap-1">
              <Input
                type="time"
                className="h-7 text-xs w-[120px]"
                value={task.executionTime}
                onChange={(e) => {
                  updateTaskMutation.mutate({ id: task.id, data: { executionTime: e.target.value || null } })
                }}
              />
              <button
                type="button"
                onClick={() => {
                  updateTaskMutation.mutate({ id: task.id, data: { executionTime: null } })
                }}
                className="h-7 w-7 rounded border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
                title="実行時刻をクリア"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                updateTaskMutation.mutate({ id: task.id, data: { executionTime: "09:00" } })
              }}
              className="h-7 px-3 text-xs border border-dashed border-primary/50 text-primary rounded-md hover:bg-primary/5 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />実行時刻を設定
            </button>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">事前通知</p>
          <select
            className="h-7 text-xs border rounded-md px-2 bg-background"
            value={task.notifyEnabled === false ? 0 : (task.notifyMinutesBefore ?? 10)}
            onChange={(e) => {
              const v = Number(e.target.value)
              updateTaskMutation.mutate({
                id: task.id,
                data: {
                  notifyEnabled: v !== 0,
                  notifyMinutesBefore: v === 0 ? 0 : v,
                },
              })
            }}
          >
            <option value={0}>なし</option>
            <option value={5}>5分前</option>
            <option value={10}>10分前</option>
            <option value={15}>15分前</option>
            <option value={30}>30分前</option>
            <option value={60}>1時間前</option>
          </select>
        </div>
      </div>

      <Separator />

      {/* ステータス変更 */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">ステータス</p>
        <div className="flex gap-2">
          {(Object.keys(TASK_STATUS_CONFIG) as TaskStatus[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              className={`text-xs flex-1 cursor-pointer ${task.status === s ? TASK_STATUS_CONFIG[s].className + " font-bold border-2" : ""}`}
              onClick={() => {
                updateTaskMutation.mutate({ id: task.id, data: { status: s } })
              }}
            >
              {TASK_STATUS_CONFIG[s].label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* 優先度 */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">優先度</p>
        <div className="flex gap-2">
          {(["highest", "high", "medium", "low"] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant="outline"
              className={`text-xs flex-1 cursor-pointer ${task.priority === p ? PRIORITY_CONFIG[p].bgClassName + " font-bold border-2" : ""}`}
              onClick={() => {
                updateTaskMutation.mutate({ id: task.id, data: { priority: p } })
              }}
            >
              {PRIORITY_CONFIG[p].label}
            </Button>
          ))}
        </div>
      </div>

      {/* 連絡先・取引先・ツール */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">連絡先</p>
          <select
            className="w-full text-sm border rounded-md p-1.5 bg-background cursor-pointer"
            value={task.contactId ?? ""}
            onChange={(e) => {
              updateTaskMutation.mutate({ id: task.id, data: { contactId: e.target.value || null } })
            }}
          >
            <option value="">なし</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">取引先</p>
          <select
            className="w-full text-sm border rounded-md p-1.5 bg-background cursor-pointer"
            value={task.partnerId ?? ""}
            onChange={(e) => {
              updateTaskMutation.mutate({ id: task.id, data: { partnerId: e.target.value || null } })
            }}
          >
            <option value="">なし</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">連絡ツール</p>
          <div className="flex gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className={`text-xs cursor-pointer ${!task.tool ? "font-bold border-2" : ""}`}
              onClick={() => {
                updateTaskMutation.mutate({ id: task.id, data: { tool: null } })
              }}
            >
              なし
            </Button>
            {(Object.keys(TOOL_CONFIG) as TicketTool[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant="outline"
                className={`text-xs cursor-pointer ${task.tool === t ? "font-bold border-2 bg-blue-50 dark:bg-blue-950/40" : ""}`}
                onClick={() => {
                  updateTaskMutation.mutate({ id: task.id, data: { tool: t } })
                }}
              >
                {TOOL_CONFIG[t].emoji} {TOOL_CONFIG[t].label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* チェックリスト */}
      <TaskChecklistSection task={task} />

      <Separator />

      {/* メモ */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">メモ</p>
        <Textarea
          ref={memoRef}
          className="text-sm min-h-[80px]"
          placeholder="作業メモを入力..."
          defaultValue={task.memo}
          key={`memo-${task.id}`}
        />
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            className="text-xs cursor-pointer"
            disabled={updateTaskMutation.isPending}
            onClick={() => {
              const val = memoRef.current?.value ?? ""
              updateTaskMutation.mutate(
                { id: task.id, data: { memo: val } },
                {
                  onSuccess: () => toast.success("メモを保存しました"),
                  onError: () => toast.error("メモの保存に失敗しました"),
                }
              )
            }}
          >
            {updateTaskMutation.isPending ? "保存中..." : "メモ保存"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="text-xs cursor-pointer ml-auto"
            onClick={() => {
              if (!confirm(`「${task.title}」を削除してよろしいですか？`)) return
              deleteTaskMutation.mutate(task.id)
              onClose()
            }}
          >
            タスクを削除
          </Button>
        </div>
      </div>
    </div>
  )
}

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
    if (showRecurringOnly && !t.recurring) return false
    return true
  }).sort((a, b) => a.sortOrder - b.sortOrder)

  const handleToggleTodayFlag = (t: TaskItem) => {
    updateTaskMutation.mutate({ id: t.id, data: { todayFlag: !t.todayFlag } })
  }

  // カスタム順序の適用
  const orderedTasks = taskOrder.length > 0
    ? taskOrder
        .map((id) => filteredTasks.find((t) => t.id === id))
        .filter((t): t is TaskItem => !!t)
        .concat(filteredTasks.filter((t) => !taskOrder.includes(t.id)))
    : filteredTasks

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedTasks.findIndex((t) => t.id === active.id)
    const newIndex = orderedTasks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(orderedTasks.map((t) => t.id), oldIndex, newIndex)
    setTaskOrder(newOrder)

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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const leftColumn = (
    <div className="h-full overflow-y-auto">
        {/* ヘッダー: フィルタ + 登録ボタン */}
        <div className="p-3 border-b flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <Label className="text-xs shrink-0">担当者:</Label>
              <select
                className="text-xs border rounded-md p-1 bg-background"
                value={filterStaffId}
                onChange={(e) => setFilterStaffId(e.target.value)}
              >
                <option value="all">全員</option>
                {allEmployees.map((s) => {
                  const count = allTasks.filter((t) => {
                    const ids = (t.assigneeIds && t.assigneeIds.length > 0) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : [])
                    return ids.includes(s.id) && t.status !== "done"
                  }).length
                  return <option key={s.id} value={s.id}>{s.name}（{count}件）</option>
                })}
              </select>

              <Separator orientation="vertical" className="h-5 mx-1" />
            </>
          )}

          {(["all", "todo", "in-progress", "waiting", "done"] as (TaskStatus | "all")[]).map((s) => {
            const label = s === "all" ? "すべて" : TASK_STATUS_CONFIG[s as TaskStatus].label
            return (
              <Button
                key={s}
                variant={filterStatus === s ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs cursor-pointer"
                onClick={() => setFilterStatus(s)}
              >
                {label}
              </Button>
            )
          })}

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Button
            variant={showTodayOnly ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs cursor-pointer"
            onClick={() => setShowTodayOnly((v) => !v)}
            title="今日やるフラグのついたタスクのみ表示"
          >
            <Star className={`w-3 h-3 mr-1 ${showTodayOnly ? "fill-yellow-400 text-yellow-500" : ""}`} />
            今日やる
          </Button>

          <Button
            variant={showRecurringOnly ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs cursor-pointer"
            onClick={() => setShowRecurringOnly((v) => !v)}
            title="繰り返し設定がONの親タスクのみ表示"
          >
            <Repeat className={`w-3 h-3 mr-1 ${showRecurringOnly ? "text-blue-600 dark:text-blue-400" : ""}`} />
            繰り返しのみ
          </Button>

          <div className="flex-1" />

          <Button size="sm" className="h-7 text-xs cursor-pointer" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-3 h-3 mr-1" />タスク登録
          </Button>
        </div>

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
                    <SortableTaskRow
                      key={t.id}
                      task={t}
                      index={i}
                      onClickTask={(task) => setSelectedTaskId(task.id)}
                      onToggleTodayFlag={handleToggleTodayFlag}
                    />
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
