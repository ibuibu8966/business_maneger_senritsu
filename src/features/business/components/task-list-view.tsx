"use client"

import { useState, useRef } from "react"
import { Plus, Repeat, Loader2, Check, X, Trash2, FolderOpen, ChevronRight, ChevronDown, Star } from "lucide-react"
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
import { useEmployees } from "@/hooks/use-schedule"
import { useContacts, usePartners } from "@/hooks/use-crm"
import { useSession } from "next-auth/react"
import { MemoSection } from "./memo-section"

// ===== タスク登録ダイアログ =====

function TaskCreateDialog({
  open,
  onClose,
  businesses,
  projects,
  employees,
  contacts,
  partners,
  taskCount,
  currentUserName,
}: {
  open: boolean
  onClose: () => void
  businesses: { id: string; name: string }[]
  projects: ProjectNode[]
  employees: { id: string; name: string }[]
  contacts: { id: string; name: string }[]
  partners: { id: string; name: string }[]
  taskCount: number
  currentUserName: string
}) {
  const [title, setTitle] = useState("")
  const [detail, setDetail] = useState("")
  const [projectId, setProjectId] = useState("")
  const [assigneeId, setAssigneeId] = useState("s1") // デフォルト: ログインユーザー
  const [deadline, setDeadline] = useState("")
  const [executionTime, setExecutionTime] = useState("09:00")
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(10) // 0=なし, 5/10/15/30/60
  const [recurring, setRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState("")
  const [recurringDay, setRecurringDay] = useState("")
  const [recurringWeek, setRecurringWeek] = useState("")
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [contactId, setContactId] = useState("")
  const [partnerId, setPartnerId] = useState("")
  const [priority, setPriority] = useState("medium")
  const [tool, setTool] = useState("")
  const createTaskMutation = useCreateBusinessTask()

  const handleCreate = () => {
    if (!title.trim() || !projectId) return
    const proj = projects.find((p) => p.id === projectId)
    const staff = employees.find((s) => s.id === assigneeId)
    createTaskMutation.mutate({
      projectId,
      projectName: proj?.name ?? "不明",
      title: title.trim(),
      detail: detail.trim(),
      assigneeId: assigneeId || null,
      assigneeName: staff?.name ?? null,
      deadline: deadline || null,
      status: "todo",
      memo: "",
      recurring,
      recurringPattern: recurring && recurringPattern ? recurringPattern : null,
      recurringDay: recurring && recurringDay !== "" ? Number(recurringDay) : null,
      recurringWeek: recurring && recurringWeek !== "" ? Number(recurringWeek) : null,
      recurringEndDate: recurring && recurringEndDate ? recurringEndDate : null,
      createdBy: currentUserName,
      sortOrder: taskCount + 1,
      contactId: contactId || null,
      partnerId: partnerId || null,
      priority: priority || "medium",
      tool: tool || null,
      executionTime: executionTime || null,
      notifyEnabled: notifyMinutesBefore !== 0,
      notifyMinutesBefore: notifyMinutesBefore === 0 ? 0 : notifyMinutesBefore,
    })
    onClose()
    setTitle("")
    setDetail("")
    setProjectId("")
    setDeadline("")
    setExecutionTime("09:00")
    setNotifyMinutesBefore(10)
    setRecurring(false)
    setRecurringPattern("")
    setRecurringDay("")
    setRecurringWeek("")
    setRecurringEndDate("")
    setContactId("")
    setPartnerId("")
    setPriority("medium")
    setTool("")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>タスクを登録</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">タイトル *</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タスク名を入力" autoFocus />
          </div>
          <div>
            <Label className="text-xs">プロジェクト *</Label>
            <select
              className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">選択してください</option>
              {businesses.map((biz) => {
                const projs = projects.filter((p) => p.businessId === biz.id)
                if (projs.length === 0) return null
                return (
                  <optgroup key={biz.id} label={biz.name}>
                    {projs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>
          <div>
            <Label className="text-xs">詳細</Label>
            <Textarea className="mt-1 text-sm min-h-[50px]" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="タスクの詳細（任意）" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">担当者</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                {employees.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">期限</Label>
              <Input type="date" className="mt-1 h-8 text-sm" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">実行時刻（LINE通知の対象）</Label>
              <Input
                type="time"
                className="mt-1 h-8 text-sm w-[120px]"
                value={executionTime}
                onChange={(e) => setExecutionTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">事前通知</Label>
              <select
                className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                value={notifyMinutesBefore}
                onChange={(e) => setNotifyMinutesBefore(Number(e.target.value))}
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">連絡先</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">なし</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">取引先</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                <option value="">なし</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">優先度</Label>
              <select className={`w-full mt-1 text-sm border rounded-md p-1.5 cursor-pointer ${PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.bgClassName ?? "bg-background"}`} value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="highest">最高</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">連絡ツール</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background cursor-pointer" value={tool} onChange={(e) => setTool(e.target.value)}>
                <option value="">なし</option>
                <option value="LINE">LINE</option>
                <option value="TELEGRAM">Telegram</option>
                <option value="DISCORD">Discord</option>
                <option value="PHONE">電話</option>
                <option value="ZOOM">Zoom</option>
                <option value="IN_PERSON">対面</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="rounded" />
            繰り返しタスク
          </label>
          {recurring && (
            <div className="space-y-2 pl-4 border-l-2 border-blue-200">
              <div>
                <Label className="text-xs">繰り返しパターン</Label>
                <select
                  className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                  value={recurringPattern}
                  onChange={(e) => {
                    setRecurringPattern(e.target.value)
                    setRecurringDay("")
                    setRecurringWeek("")
                  }}
                >
                  <option value="">選択してください</option>
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週</option>
                  <option value="monthly_date">毎月（日付指定）</option>
                  <option value="monthly_weekday">毎月（曜日指定）</option>
                </select>
              </div>
              {recurringPattern === "weekly" && (
                <div>
                  <Label className="text-xs">曜日</Label>
                  <select
                    className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                    value={recurringDay}
                    onChange={(e) => setRecurringDay(e.target.value)}
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
              {recurringPattern === "monthly_date" && (
                <div>
                  <Label className="text-xs">日付</Label>
                  <select
                    className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                    value={recurringDay}
                    onChange={(e) => setRecurringDay(e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>{i + 1}日</option>
                    ))}
                  </select>
                </div>
              )}
              {recurringPattern === "monthly_weekday" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">第何週</Label>
                    <select
                      className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                      value={recurringWeek}
                      onChange={(e) => setRecurringWeek(e.target.value)}
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
                      className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background"
                      value={recurringDay}
                      onChange={(e) => setRecurringDay(e.target.value)}
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
              <div>
                <Label className="text-xs">終了日（任意）</Label>
                <Input type="date" className="mt-1 h-8 text-sm" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>キャンセル</Button>
          <Button size="sm" onClick={handleCreate} disabled={!title.trim() || !projectId || createTaskMutation.isPending}>登録</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== ソート可能なタスク行 =====

function SortableTaskRow({
  task,
  index,
  onClickTask,
  onToggleTodayFlag,
}: {
  task: TaskItem
  index: number
  onClickTask: (t: TaskItem) => void
  onToggleTodayFlag: (t: TaskItem) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const st = TASK_STATUS_CONFIG[task.status]

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClickTask(task)}
      className={`flex items-center gap-2 p-2.5 rounded-md border text-xs bg-background hover:bg-muted/50 cursor-grab active:cursor-grabbing touch-none ${
        task.status === "done" ? "opacity-50" : ""
      } ${task.todayFlag ? "ring-1 ring-yellow-400/60 bg-yellow-50/40" : ""}`}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onToggleTodayFlag(task)
        }}
        className="shrink-0 p-0.5 rounded hover:bg-muted"
        title={task.todayFlag ? "今日やる（解除）" : "今日やるに設定"}
      >
        <Star
          className={`w-4 h-4 ${
            task.todayFlag ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"
          }`}
        />
      </button>
      <span className="text-muted-foreground w-5 text-center shrink-0">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {task.recurring && <Repeat className="w-3 h-3 text-blue-500 shrink-0" />}
          <span className="font-medium truncate">{task.title}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
          {task.projectName && <span className="text-[10px]">{task.businessName} / {task.projectName}</span>}
          {task.contactName && (
            <span className="text-[10px]">
              {task.tool && TOOL_CONFIG[task.tool] ? TOOL_CONFIG[task.tool].emoji + " " : ""}
              {task.contactName}
            </span>
          )}
          {task.createdAt && <span>{task.createdAt.split("T")[0]}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {task.checklistItems && task.checklistItems.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            <Check className="w-3 h-3 inline" />{task.checklistItems.filter((c) => c.checked).length}/{task.checklistItems.length}
          </span>
        )}
        {task.priority && task.priority !== "medium" && (
          <span className={`text-[10px] font-medium ${PRIORITY_CONFIG[task.priority].className}`}>
            {PRIORITY_CONFIG[task.priority].label}
          </span>
        )}
        <Badge variant="outline" className={`text-[10px] h-4 px-1 font-semibold ${st.className}`}>
          {st.label}
        </Badge>
        {task.assigneeName && (
          <span className="text-muted-foreground text-[10px]">{task.assigneeName}</span>
        )}
        {task.executionTime && (
          <span className="text-[10px] text-purple-600 font-medium">
            🕐{task.executionTime}
          </span>
        )}
        {task.deadline && (
          <span className={`text-[10px] ${
            new Date(task.deadline) < new Date() && task.status !== "done" ? "text-red-600 font-medium" : "text-muted-foreground"
          }`}>
            〆{task.deadline}
          </span>
        )}
      </div>
    </div>
  )
}

// ===== チェックリスト =====

function TaskChecklistSection({ task }: { task: TaskItem }) {
  const [newItemTitle, setNewItemTitle] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showNewTemplateInline, setShowNewTemplateInline] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")

  const addItemMutation = useAddTaskChecklistItem()
  const updateItemMutation = useUpdateTaskChecklistItem()
  const deleteItemMutation = useDeleteTaskChecklistItem()
  const { data: templates = [] } = useChecklistTemplates(task.businessId)
  const applyTemplateMutation = useApplyChecklistTemplate()
  const createTemplateMutation = useCreateChecklistTemplate()

  const items = task.checklistItems ?? []
  const checkedCount = items.filter((i) => i.checked).length

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return
    addItemMutation.mutate({ taskId: task.id, title: newItemTitle.trim(), sortOrder: items.length })
    setNewItemTitle("")
  }

  const handleToggle = (item: ChecklistItem) => {
    updateItemMutation.mutate({ taskId: task.id, itemId: item.id, data: { checked: !item.checked } })
  }

  const handleEditSave = (itemId: string) => {
    if (editingTitle.trim()) {
      updateItemMutation.mutate({ taskId: task.id, itemId, data: { title: editingTitle.trim() } })
    }
    setEditingId(null)
  }

  const handleDelete = (itemId: string) => {
    deleteItemMutation.mutate({ taskId: task.id, itemId })
  }

  const handleApplyTemplate = (templateId: string) => {
    applyTemplateMutation.mutate({ taskId: task.id, templateId })
    setShowTemplateMenu(false)
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim() || items.length === 0) return
    createTemplateMutation.mutate({
      name: templateName.trim(),
      businessId: task.businessId,
      items: items.map((i, idx) => ({ title: i.title, sortOrder: idx })),
    })
    setTemplateName("")
    setShowSaveTemplate(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          チェックリスト {items.length > 0 && <span className="text-foreground">({checkedCount}/{items.length})</span>}
        </p>
        <div className="flex gap-1">
          <div className="relative">
            <Button size="sm" variant="ghost" className="h-6 text-[10px] cursor-pointer" onClick={() => setShowTemplateMenu(!showTemplateMenu)}>
              テンプレから追加
            </Button>
            {showTemplateMenu && (
              <div className="absolute right-0 top-7 z-50 bg-background border rounded-md shadow-lg p-1 min-w-[200px]">
                {templates.length === 0 && !showNewTemplateInline && (
                  <p className="text-xs text-muted-foreground p-2">テンプレートなし</p>
                )}
                {templates.map((t: any) => (
                  <button
                    key={t.id}
                    className="w-full text-left text-xs p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => handleApplyTemplate(t.id)}
                  >
                    {t.name} ({t.items?.length ?? 0}項目)
                  </button>
                ))}
                {/* 区切り線 */}
                {templates.length > 0 && <div className="border-t my-1" />}
                {/* 新規テンプレ作成 */}
                {showNewTemplateInline ? (
                  <div className="p-2 space-y-1">
                    <Input
                      className="h-7 text-xs"
                      placeholder="テンプレート名"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing && newTemplateName.trim() && items.length > 0) {
                          createTemplateMutation.mutate({
                            name: newTemplateName.trim(),
                            businessId: task.businessId,
                            items: items.map((i, idx) => ({ title: i.title, sortOrder: idx })),
                          })
                          setNewTemplateName("")
                          setShowNewTemplateInline(false)
                          setShowTemplateMenu(false)
                        }
                        if (e.key === "Escape") setShowNewTemplateInline(false)
                      }}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-6 text-[10px] flex-1 cursor-pointer"
                        disabled={!newTemplateName.trim() || items.length === 0}
                        onClick={() => {
                          createTemplateMutation.mutate({
                            name: newTemplateName.trim(),
                            businessId: task.businessId,
                            items: items.map((i, idx) => ({ title: i.title, sortOrder: idx })),
                          })
                          setNewTemplateName("")
                          setShowNewTemplateInline(false)
                          setShowTemplateMenu(false)
                        }}
                      >
                        現在の項目で作成
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] cursor-pointer"
                        onClick={() => setShowNewTemplateInline(false)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    {items.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">チェック項目がありません</p>
                    )}
                  </div>
                ) : (
                  <button
                    className="w-full text-left text-xs p-2 hover:bg-muted rounded cursor-pointer text-primary font-medium"
                    onClick={() => setShowNewTemplateInline(true)}
                  >
                    ＋ 新規テンプレ作成
                  </button>
                )}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] cursor-pointer" onClick={() => setShowSaveTemplate(!showSaveTemplate)}>
              テンプレ保存
            </Button>
          )}
        </div>
      </div>

      {/* 進捗バー */}
      {items.length > 0 && (
        <div className="w-full h-1.5 bg-muted rounded-full mb-2">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${(checkedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* テンプレート保存フォーム */}
      {showSaveTemplate && (
        <div className="flex gap-1 mb-2">
          <Input
            className="h-7 text-xs flex-1"
            placeholder="テンプレート名"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSaveTemplate()}
          />
          <Button size="sm" className="h-7 text-xs cursor-pointer" onClick={handleSaveTemplate}>保存</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs cursor-pointer" onClick={() => setShowSaveTemplate(false)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* チェックリスト項目 */}
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => handleToggle(item)}
              className="rounded cursor-pointer shrink-0"
            />
            {editingId === item.id ? (
              <Input
                className="h-6 text-xs flex-1"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleEditSave(item.id)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleEditSave(item.id); if (e.key === "Escape") setEditingId(null) }}
                autoFocus
              />
            ) : (
              <span
                className={`text-xs flex-1 cursor-pointer ${item.checked ? "line-through text-muted-foreground" : ""}`}
                onClick={() => { setEditingId(item.id); setEditingTitle(item.title) }}
              >
                {item.title}
              </span>
            )}
            <button
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 cursor-pointer"
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* 新規追加 */}
      <div className="flex gap-1 mt-2">
        <Input
          className="h-7 text-xs flex-1"
          placeholder="項目を追加..."
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleAddItem()}
        />
        <Button size="sm" className="h-7 text-xs cursor-pointer" onClick={handleAddItem} disabled={!newItemTitle.trim()}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

// ===== 左パネル: プロジェクトサイドパネル =====

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  "on-hold": "bg-yellow-500",
  completed: "bg-gray-400",
}
const STATUS_CYCLE: Record<string, string> = {
  active: "completed",
  completed: "active",
  "on-hold": "active",
}
const STATUS_TOOLTIP: Record<string, string> = {
  active: "有効",
  "on-hold": "保留",
  completed: "無効",
}

// PJの祖先IDを全部返す（自動展開用）
function getAncestorIds(projectId: string, allProjects: ProjectNode[]): string[] {
  const ids: string[] = []
  let current = allProjects.find((p) => p.id === projectId)
  while (current?.parentId) {
    ids.push(current.parentId)
    current = allProjects.find((p) => p.id === current!.parentId)
  }
  return ids
}

// 再帰的なプロジェクトツリーノード
function ProjectTreeNode({
  proj,
  depth,
  allProjects,
  allTasks,
  allIssues,
  expandedIds,
  onToggle,
  selectedTaskId,
  onSelectTask,
  onUpdateProject,
}: {
  proj: ProjectNode
  depth: number
  allProjects: ProjectNode[]
  allTasks: TaskItem[]
  allIssues: IssueInfo[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  selectedTaskId: string | null
  onSelectTask: (id: string) => void
  onUpdateProject: (id: string, data: Record<string, unknown>) => void
}) {
  const isExpanded = expandedIds.has(proj.id)
  const children = allProjects.filter((p) => p.parentId === proj.id)
  const tasks = allTasks.filter((t) => t.projectId === proj.id)
  const issues = allIssues.filter((i) => i.projectId === proj.id)
  const unresolvedCount = issues.filter((i) => i.status !== "resolved").length
  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      {/* PJヘッダー（トグル） */}
      <div
        onClick={() => onToggle(proj.id)}
        className="flex items-center gap-1 py-1.5 px-1 rounded hover:bg-muted/50 cursor-pointer flex-wrap"
      >
        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
        <FolderOpen className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{proj.name}</span>
        <button
          type="button"
          title={STATUS_TOOLTIP[proj.status] ?? proj.status}
          className={`w-2 h-2 rounded-full shrink-0 ml-1 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 ${STATUS_DOT[proj.status] ?? "bg-gray-300"}`}
          onClick={(e) => { e.stopPropagation(); onUpdateProject(proj.id, { status: STATUS_CYCLE[proj.status] ?? "active" }) }}
        />
        {proj.priority && proj.priority !== "medium" && (
          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 shrink-0 ${PRIORITY_CONFIG[proj.priority]?.className ?? ""}`}>
            {PRIORITY_CONFIG[proj.priority]?.label ?? proj.priority}
          </Badge>
        )}
        {proj.assignees?.length > 0 && <span className="text-[10px] text-muted-foreground shrink-0">{proj.assignees.map((a: {name: string}) => a.name).join(", ")}</span>}
        <span className="text-xs text-muted-foreground ml-auto shrink-0">{tasks.length}</span>
      </div>

      {/* 展開時: PJ詳細 + タスク + 子PJ */}
      {isExpanded && (
        <div className="ml-4 border-l border-muted pl-2 space-y-1.5 pb-1">
          {/* 目的 */}
          {proj.purpose && (
            <div>
              <p className="text-[11px] text-muted-foreground">目的</p>
              <p className="text-xs">{proj.purpose}</p>
            </div>
          )}

          {/* 担当者・期限 */}
          <div className="flex gap-3 text-xs">
            {proj.assignees?.length > 0 && <span><span className="text-muted-foreground">担当:</span> {proj.assignees.map((a: {name: string}) => a.name).join(", ")}</span>}
            {proj.deadline && <span><span className="text-muted-foreground">期限:</span> {proj.deadline}</span>}
          </div>

          {/* 口座・取引先 */}
          {proj.accountNames.length > 0 && (
            <p className="text-xs"><span className="text-muted-foreground">口座:</span> {proj.accountNames.join(", ")}</p>
          )}
          {proj.partnerNames.length > 0 && (
            <p className="text-xs"><span className="text-muted-foreground">取引先:</span> {proj.partnerNames.join(", ")}</p>
          )}

          {/* 関係者 */}
          {proj.relatedContacts && proj.relatedContacts.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground">関係者</p>
              <div className="space-y-0.5">
                {proj.relatedContacts.map((c) => (
                  <p key={c.id} className="text-xs"><span className="font-medium">{c.name}</span>{c.role && <span className="text-muted-foreground ml-1">({c.role})</span>}</p>
                ))}
              </div>
            </div>
          )}

          {/* 契約メモ */}
          {proj.contractMemo && (
            <div>
              <p className="text-[11px] text-muted-foreground">契約メモ</p>
              <p className="text-xs bg-muted/50 rounded p-1.5">{proj.contractMemo}</p>
            </div>
          )}

          {/* 資料 */}
          {proj.attachments && proj.attachments.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground">資料</p>
              <div className="space-y-0.5">
                {proj.attachments.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 dark:text-blue-400 hover:underline truncate">
                    {a.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* メモ */}
          <MemoSection projectId={proj.id} compact />

          {/* タスク一覧 */}
          {tasks.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">タスク ({tasks.length})</p>
              <div className="space-y-0.5">
                {tasks.map((t) => {
                  const st = TASK_STATUS_CONFIG[t.status]
                  return (
                    <div
                      key={t.id}
                      onClick={(e) => { e.stopPropagation(); onSelectTask(t.id) }}
                      className={`flex items-center gap-1.5 p-1 rounded text-xs cursor-pointer hover:bg-muted/50 ${
                        t.id === selectedTaskId ? "bg-primary/10 border border-primary/30" : ""
                      }`}
                    >
                      <Badge variant="outline" className={`text-[9px] h-4 px-1 shrink-0 ${st.className}`}>{st.label}</Badge>
                      <span className={`truncate ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 課題 */}
          {issues.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">課題 ({unresolvedCount}件未解決 / {issues.length}件)</p>
              <div className="space-y-0.5">
                {issues.map((issue) => {
                  const ist = ISSUE_STATUS_CONFIG[issue.status]
                  return (
                    <div key={issue.id} className="flex items-center gap-1.5 p-1 rounded text-xs">
                      <Badge variant="outline" className={`text-[9px] h-4 px-1 shrink-0 ${ist.className}`}>{ist.label}</Badge>
                      <span className="truncate">{issue.title}</span>
                      {issue.assigneeName && <span className="text-muted-foreground text-[10px] shrink-0 ml-auto">{issue.assigneeName}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 子プロジェクト（再帰） */}
          {children.map((child) => (
            <ProjectTreeNode
              key={child.id}
              proj={child}
              depth={depth + 1}
              allProjects={allProjects}
              allTasks={allTasks}
              allIssues={allIssues}
              expandedIds={expandedIds}
              onToggle={onToggle}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
              onUpdateProject={onUpdateProject}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type BizInfo = { id: string; name: string; purpose: string; status: "active" | "on-hold" | "completed"; priority: "highest" | "high" | "medium" | "low"; assignees: { id: string; name: string }[]; revenue: number; expense: number; accountNames: string[]; partnerNames: string[]; contractMemo: string; relatedContacts: { id: string; name: string; role: string }[]; attachments: { id: string; name: string; url: string; type: string }[] }

type IssueInfo = { id: string; projectId: string; title: string; status: IssueStatus; priority: "highest" | "high" | "medium" | "low"; assigneeName: string | null; deadline: string | null }

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
    <div className="w-[360px] border-l bg-card h-full flex flex-col shrink-0">
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
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[biz.status] ?? "bg-gray-300"}`} />
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
  contacts,
  partners,
}: {
  task: TaskItem
  onClose: () => void
  updateTaskMutation: ReturnType<typeof useUpdateBusinessTask>
  deleteTaskMutation: ReturnType<typeof useDeleteBusinessTask>
  memoRef: React.RefObject<HTMLTextAreaElement | null>
  contacts: { id: string; name: string }[]
  partners: { id: string; name: string }[]
}) {
  const [showRecurring, setShowRecurring] = useState(false)
  const { data: employees = [] } = useEmployees()

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
    <div className="w-[380px] border-l overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold truncate">{task.title}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg cursor-pointer">&times;</button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`font-semibold ${TASK_STATUS_CONFIG[task.status].className}`}>
          {TASK_STATUS_CONFIG[task.status].label}
        </Badge>
        {task.recurring ? (
          <Badge
            variant="outline"
            className="text-xs text-blue-600 border-blue-300 cursor-pointer hover:bg-blue-50"
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
        <span className="text-[10px] text-muted-foreground ml-auto">{task.businessName} &gt; {task.projectName}</span>
      </div>

      {/* 繰り返し設定セクション */}
      {showRecurring && (
        <div className="space-y-2 border rounded-md p-3 bg-blue-50/50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-blue-700">繰り返し設定</p>
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

      {task.detail && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">詳細</p>
          <p className="text-sm bg-muted/50 rounded p-3">{task.detail}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">担当者</p>
          <select
            className="text-sm w-full border rounded-md px-2 py-1 bg-background cursor-pointer"
            value={task.assigneeId ?? ""}
            onChange={(e) => {
              const emp = employees.find((em) => em.id === e.target.value)
              updateTaskMutation.mutate({
                id: task.id,
                data: { assigneeId: e.target.value || null, assigneeName: emp?.name ?? null },
              })
            }}
          >
            <option value="">未割当</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
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
          <Input
            type="time"
            className="h-7 text-xs w-[120px]"
            value={task.executionTime ?? ""}
            onChange={(e) => {
              updateTaskMutation.mutate({ id: task.id, data: { executionTime: e.target.value || null } })
            }}
          />
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
                className={`text-xs cursor-pointer ${task.tool === t ? "font-bold border-2 bg-blue-50" : ""}`}
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
            onClick={() => {
              const val = memoRef.current?.value ?? ""
              updateTaskMutation.mutate({ id: task.id, data: { memo: val } })
            }}
          >
            メモ保存
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

  const [filterStaffId, setFilterStaffId] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all")
  const [showTodayOnly, setShowTodayOnly] = useState<boolean>(false)
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
    if (filterStaffId !== "all" && t.assigneeId !== filterStaffId) return false
    if (filterStatus !== "all" && t.status !== filterStatus) return false
    if (showTodayOnly && !t.todayFlag) return false
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
    // Persist the new sort order for the moved task
    reorderMutation.mutate({ taskId: String(active.id), newSortOrder: newIndex })
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

  return (
    <div className="h-full flex">
      {/* 左カラム: タスク一覧 */}
      <div className="flex-1 overflow-y-auto">
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
                  const count = allTasks.filter((t) => t.assigneeId === s.id && t.status !== "done").length
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
            今日やる（{allTasks.filter((t) => t.todayFlag).length}）
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

      {/* 中央カラム: タスク詳細 (選択時) */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          updateTaskMutation={updateTaskMutation}
          deleteTaskMutation={deleteTaskMutation}
          memoRef={memoRef}
          contacts={contactsList as unknown as { id: string; name: string }[]}
          partners={partnersList as unknown as { id: string; name: string }[]}
        />
      )}

      {/* 右カラム: プロジェクトサイドパネル（参考情報） */}
      <ProjectSidePanel
        selectedTask={selectedTask}
        allTasks={allTasks}
        allProjects={allProjects}
        allBusinesses={allBusinesses}
        allIssues={issues as unknown as IssueInfo[]}
        onSelectTask={setSelectedTaskId}
      />

      {/* タスク登録ダイアログ */}
      <TaskCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        businesses={allBusinesses}
        projects={allProjects}
        employees={allEmployees}
        contacts={contactsList as unknown as { id: string; name: string }[]}
        partners={partnersList as unknown as { id: string; name: string }[]}
        taskCount={allTasks.length}
        currentUserName={session?.user?.name ?? "野田"}
      />
    </div>
  )
}
