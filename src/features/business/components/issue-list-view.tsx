"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, AlertCircle, Plus, MessageSquarePlus, Loader2, FolderOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ISSUE_STATUS_CONFIG,
  PRIORITY_CONFIG,
  type ProjectNode,
  type IssueItem,
  type IssueStatus,
  type Priority,
} from "./mock-data"
import {
  useBusinessDetails,
  useProjects,
  useBusinessIssues,
  useCreateBusinessIssue,
  useUpdateBusinessIssue,
  useDeleteBusinessIssue,
  useAddBusinessIssueNote,
  useBusinessTasks,
  useCreateBusinessTask,
  useUpdateBusinessTask,
} from "@/hooks/use-business"
import { useEmployees } from "@/hooks/use-schedule"
import { MemoSection } from "./memo-section"
import { TASK_STATUS_CONFIG, type TaskStatus } from "./mock-data"

type StatusFilter = "all" | IssueStatus

// ===== 左カラム: 事業グループ（折りたたみ対応） =====

function BusinessTreeGroup({
  biz,
  bizProjects,
  bizIssueCount,
  selectedProjectId,
  onSelect,
  allProjects,
  allIssues,
}: {
  biz: { id: string; name: string; status?: string }
  bizProjects: ProjectNode[]
  bizIssueCount: number
  selectedProjectId: string | null
  onSelect: (id: string) => void
  allProjects: ProjectNode[]
  allIssues: IssueItem[]
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mb-1">
      <div
        className="flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
        <span className={`w-2 h-2 rounded-full shrink-0 ${(biz as { status?: string }).status === "completed" ? "bg-gray-400 dark:bg-gray-500" : "bg-emerald-500"}`} />
        <span className="text-xs font-bold truncate flex-1">{biz.name}</span>
        {bizIssueCount > 0 && (
          <span className="text-[10px] text-muted-foreground shrink-0">{bizIssueCount}</span>
        )}
      </div>
      {expanded && (
        <div className="ml-3 border-l border-muted pl-1">
          {bizProjects.map((proj) => {
            const count = allIssues.filter((i) => i.projectId === proj.id && i.status !== "resolved").length
            return (
              <ProjectTreeItem
                key={proj.id}
                project={proj}
                depth={0}
                selectedId={selectedProjectId}
                onSelect={onSelect}
                issueCount={count}
                allProjects={allProjects}
                allIssues={allIssues}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ===== 左カラム: プロジェクトツリーアイテム =====

function ProjectTreeItem({
  project,
  depth,
  selectedId,
  onSelect,
  issueCount,
  allProjects,
  allIssues,
}: {
  project: ProjectNode
  depth: number
  selectedId: string | null
  onSelect: (id: string) => void
  issueCount: number
  allProjects: ProjectNode[]
  allIssues: IssueItem[]
}) {
  const children = allProjects.filter((p) => p.parentId === project.id && p.status !== "completed")
  const hasChildren = children.length > 0
  const [expanded, setExpanded] = useState(depth < 1)

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-xs",
          selectedId === project.id ? "bg-primary/10 font-medium" : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          onSelect(project.id)
          if (hasChildren) setExpanded(!expanded)
        }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="truncate flex-1">{project.name}</span>
        {issueCount > 0 && (
          <span className="text-[10px] text-muted-foreground shrink-0">{issueCount}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {children.map((child) => {
            const childCount = allIssues.filter((i) => i.projectId === child.id && i.status !== "resolved").length
            return (
              <ProjectTreeItem
                key={child.id}
                project={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                issueCount={childCount}
                allProjects={allProjects}
                allIssues={allIssues}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ===== 課題詳細パネル =====

function IssueDetailPanel({ issue, onClose }: { issue: IssueItem; onClose: () => void }) {
  const p = PRIORITY_CONFIG[issue.priority]
  const s = ISSUE_STATUS_CONFIG[issue.status]

  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteContent, setNoteContent] = useState("")
  const [title, setTitle] = useState(issue.title)
  const [detail, setDetail] = useState(issue.detail)
  const [deadline, setDeadline] = useState(issue.deadline ?? "")
  const [assigneeId, setAssigneeId] = useState(issue.assigneeId ?? "")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [showTaskForm, setShowTaskForm] = useState(false)
  const addNoteMutation = useAddBusinessIssueNote()
  const updateIssueMutation = useUpdateBusinessIssue()
  const deleteIssueMutation = useDeleteBusinessIssue()
  const createTaskMutation = useCreateBusinessTask()
  const updateTaskMutation = useUpdateBusinessTask()
  const { data: issueTasks = [] } = useBusinessTasks({ issueId: issue.id })
  const { data: employees = [] } = useEmployees()

  // issue が切り替わった時にローカルstateを同期
  const [prevId, setPrevId] = useState(issue.id)
  if (issue.id !== prevId) {
    setPrevId(issue.id)
    setTitle(issue.title)
    setDetail(issue.detail)
    setDeadline(issue.deadline ?? "")
    setAssigneeId(issue.assigneeId ?? "")
  }

  const inlineInput = "bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:ring-0 rounded-none px-0 transition-colors"

  const handleAddNote = () => {
    if (!noteContent.trim()) return
    addNoteMutation.mutate({
      issueId: issue.id,
      data: {
        date: new Date().toISOString().split("T")[0],
        content: noteContent.trim(),
        author: "野田",
      },
    })
    setNoteContent("")
    setShowNoteForm(false)
  }

  return (
    <div className="border-l bg-card h-full overflow-y-auto w-[380px]">
      <div className="p-4 border-b sticky top-0 bg-card z-10">
        <div className="flex items-center justify-between">
          <input
            className={cn("text-sm font-bold truncate flex-1 mr-2", inlineInput)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur() }}
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none cursor-pointer">
            &times;
          </button>
        </div>
        {title.trim() && title !== issue.title && (
          <div className="flex gap-1 justify-end mt-1">
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setTitle(issue.title)}>
              キャンセル
            </Button>
            <Button size="sm" className="h-6 text-[10px]" disabled={updateIssueMutation.isPending} onClick={() => {
              updateIssueMutation.mutate({ id: issue.id, data: { title: title.trim() } })
            }}>
              保存
            </Button>
          </div>
        )}
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <select
            className={cn("text-xs font-semibold border rounded-md px-2 py-1 cursor-pointer", s.className)}
            defaultValue={issue.status}
            key={`status-${issue.id}-${issue.status}`}
            onChange={(e) => updateIssueMutation.mutate({ id: issue.id, data: { status: e.target.value } })}
          >
            {Object.entries(ISSUE_STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            className={cn("text-xs font-semibold border rounded-md px-2 py-1 cursor-pointer", p.bgClassName)}
            defaultValue={issue.priority}
            key={`priority-${issue.id}-${issue.priority}`}
            onChange={(e) => updateIssueMutation.mutate({ id: issue.id, data: { priority: e.target.value } })}
          >
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">プロジェクト</p>
          <p className="text-sm">{issue.projectName}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">詳細</p>
          <Textarea
            className="text-sm min-h-[60px] bg-muted/50"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          {detail !== issue.detail && (
            <div className="flex gap-1 justify-end mt-1">
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setDetail(issue.detail)}>
                キャンセル
              </Button>
              <Button size="sm" className="h-6 text-[10px]" disabled={updateIssueMutation.isPending} onClick={() => {
                updateIssueMutation.mutate({ id: issue.id, data: { detail: detail.trim() } })
              }}>
                保存
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">旗振り役</p>
            <select
              className={cn("text-sm w-full cursor-pointer", inlineInput, "py-0.5")}
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">未割当</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            {assigneeId !== (issue.assigneeId ?? "") && (
              <div className="flex gap-1 justify-end mt-1">
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setAssigneeId(issue.assigneeId ?? "")}>
                  キャンセル
                </Button>
                <Button size="sm" className="h-6 text-[10px]" disabled={updateIssueMutation.isPending} onClick={() => {
                  const emp = employees.find((em) => em.id === assigneeId)
                  updateIssueMutation.mutate({
                    id: issue.id,
                    data: { assigneeId: assigneeId || null, assigneeName: emp?.name ?? null },
                  })
                }}>
                  保存
                </Button>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">作成者</p>
            <p className="text-sm">{issue.createdBy}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">作成日</p>
            <p className="text-sm">{issue.createdAt}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">期限</p>
            <input
              type="date"
              className={cn("text-sm w-full", inlineInput, "py-0.5")}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            {deadline !== (issue.deadline ?? "") && (
              <div className="flex gap-1 justify-end mt-1">
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setDeadline(issue.deadline ?? "")}>
                  キャンセル
                </Button>
                <Button size="sm" className="h-6 text-[10px]" disabled={updateIssueMutation.isPending} onClick={() => {
                  updateIssueMutation.mutate({ id: issue.id, data: { deadline: deadline || null } })
                }}>
                  保存
                </Button>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* 紐づくタスク */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">紐づくタスク</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] cursor-pointer"
              onClick={() => setShowTaskForm(true)}
            >
              <Plus className="w-3 h-3 mr-1" />追加
            </Button>
          </div>

          {showTaskForm && (
            <div className="mb-3 p-2 rounded border bg-muted/30 space-y-2">
              <Input
                className="text-xs h-7"
                placeholder="タスク名を入力..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && newTaskTitle.trim()) {
                    createTaskMutation.mutate({
                      projectId: issue.projectId,
                      title: newTaskTitle.trim(),
                      issueId: issue.id,
                    }, { onSuccess: () => { setNewTaskTitle(""); setShowTaskForm(false) } })
                  }
                }}
              />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setShowTaskForm(false); setNewTaskTitle("") }}>
                  キャンセル
                </Button>
                <Button size="sm" className="h-6 text-[10px]" disabled={!newTaskTitle.trim() || createTaskMutation.isPending} onClick={() => {
                  createTaskMutation.mutate({
                    projectId: issue.projectId,
                    title: newTaskTitle.trim(),
                    issueId: issue.id,
                  }, { onSuccess: () => { setNewTaskTitle(""); setShowTaskForm(false) } })
                }}>
                  追加
                </Button>
              </div>
            </div>
          )}

          {issueTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">タスクなし</p>
          ) : (
            <div className="space-y-1">
              {(issueTasks as any[]).map((task) => {
                const ts = TASK_STATUS_CONFIG[task.status as TaskStatus]
                return (
                  <div key={task.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30 border-l-2 border-primary/30">
                    <select
                      className={cn("text-[10px] font-semibold border rounded px-1 py-0.5 cursor-pointer", ts?.className)}
                      value={task.status}
                      onChange={(e) => updateTaskMutation.mutate({ id: task.id, data: { status: e.target.value } })}
                    >
                      {Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <span className="truncate flex-1">{task.title}</span>
                    {task.assigneeName && <span className="text-[10px] text-muted-foreground shrink-0">{task.assigneeName}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* 経過記録 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">経過記録</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] cursor-pointer"
              onClick={() => setShowNoteForm(true)}
            >
              <MessageSquarePlus className="w-3 h-3 mr-1" />追記
            </Button>
          </div>

          {showNoteForm && (
            <div className="mb-3 p-2 rounded border bg-muted/30 space-y-2">
              <Textarea
                className="text-xs min-h-[60px]"
                placeholder="経過メモを入力..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setShowNoteForm(false); setNoteContent("") }}>
                  キャンセル
                </Button>
                <Button size="sm" className="h-6 text-[10px]" onClick={handleAddNote} disabled={!noteContent.trim() || addNoteMutation.isPending}>
                  追加
                </Button>
              </div>
            </div>
          )}

          {issue.progressNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">記録なし</p>
          ) : (
            <div className="space-y-2">
              {[...issue.progressNotes].reverse().map((note) => (
                <div key={note.id} className="text-xs p-2 rounded bg-muted/30 border-l-2 border-primary/30">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <span>{note.date}</span>
                    <span>—</span>
                    <span>{note.author}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* プロジェクトメモ */}
        <MemoSection projectId={issue.projectId} compact />

        <Separator />

        <Button
          variant="destructive"
          size="sm"
          className="w-full text-xs cursor-pointer"
          disabled={deleteIssueMutation.isPending}
          onClick={() => {
            if (window.confirm("この課題を削除しますか？")) {
              deleteIssueMutation.mutate(issue.id, { onSuccess: onClose })
            }
          }}
        >
          {deleteIssueMutation.isPending ? "削除中..." : "この課題を削除"}
        </Button>
      </div>
    </div>
  )
}

// ===== 課題登録ダイアログ =====

function IssueCreateDialog({
  open,
  onClose,
  defaultProjectId,
  businesses,
  projects,
  employees,
}: {
  open: boolean
  onClose: () => void
  defaultProjectId?: string | null
  businesses: { id: string; name: string }[]
  projects: ProjectNode[]
  employees: { id: string; name: string }[]
}) {
  const [title, setTitle] = useState("")
  const [detail, setDetail] = useState("")
  const [priority, setPriority] = useState<Priority | "">("")
  const [assigneeId, setAssigneeId] = useState("")
  const [deadline, setDeadline] = useState("")
  const [projectId, setProjectId] = useState(defaultProjectId ?? "")
  const createIssueMutation = useCreateBusinessIssue()

  const handleCreate = () => {
    if (!title.trim()) return
    const proj = projects.find((p) => p.id === projectId)
    const staff = employees.find((s) => s.id === assigneeId)
    createIssueMutation.mutate({
      projectId: projectId || undefined,
      projectName: proj?.name ?? "不明",
      title: title.trim(),
      detail: detail.trim(),
      assigneeId: assigneeId || null,
      assigneeName: staff?.name ?? null,
      createdBy: "野田",
      deadline: deadline || null,
      priority: (priority as Priority) || "medium",
      status: "unresolved",
      createdAt: new Date().toISOString().split("T")[0],
    })
    onClose()
    setTitle("")
    setDetail("")
    setPriority("")
    setAssigneeId("")
    setDeadline("")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>課題を登録</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">タイトル *</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="課題のタイトル" autoFocus />
          </div>
          <div>
            <Label className="text-xs">プロジェクト</Label>
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
            <Textarea className="mt-1 text-sm min-h-[60px]" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="課題の詳細（任意）" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">優先度</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background" value={priority} onChange={(e) => setPriority(e.target.value as Priority | "")}>
                <option value="">任意</option>
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((k) => (
                  <option key={k} value={k}>{PRIORITY_CONFIG[k].label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">旗振り役</Label>
              <select className="w-full mt-1 text-sm border rounded-md p-1.5 bg-background" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">任意</option>
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
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>キャンセル</Button>
          <Button size="sm" onClick={handleCreate} disabled={!title.trim() || createIssueMutation.isPending}>登録</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== メインコンポーネント =====

export function IssueListView() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data: businesses = [], isLoading: bizLoading } = useBusinessDetails()
  const { data: projects = [], isLoading: projLoading } = useProjects()
  const { data: issues = [], isLoading: issueLoading } = useBusinessIssues()
  const { data: employees = [] } = useEmployees()

  const isLoading = bizLoading || projLoading || issueLoading

  // Cast DTO types to match mock types (fields are structurally identical)
  const allBusinesses = businesses as unknown as { id: string; name: string }[]
  const allProjects = projects as unknown as ProjectNode[]
  const allIssues = issues as unknown as IssueItem[]
  const allEmployees = employees as unknown as { id: string; name: string }[]

  // Update selectedIssue reference when data refreshes
  const currentSelectedIssue = selectedIssue
    ? allIssues.find((i) => i.id === selectedIssue.id) ?? null
    : null

  // フィルタリング
  const priorityOrder: Priority[] = ["highest", "high", "medium", "low"]
  const filtered = allIssues.filter((issue) => {
    if (selectedProjectId && issue.projectId !== selectedProjectId) return false
    if (statusFilter !== "all" && issue.status !== statusFilter) return false
    return true
  }).sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))

  // ステータス別カウント
  const countByStatus = (status?: IssueStatus) =>
    allIssues.filter((i) => {
      if (selectedProjectId && i.projectId !== selectedProjectId) return false
      if (status && i.status !== status) return false
      return true
    }).length

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* 左カラム: プロジェクトツリー */}
      <div className="w-[260px] border-r overflow-y-auto p-2">
        <div
          className={cn(
            "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-xs mb-1",
            selectedProjectId === null ? "bg-primary/10 font-medium" : "hover:bg-muted/50",
          )}
          onClick={() => setSelectedProjectId(null)}
        >
          <AlertCircle className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="flex-1">すべての事業</span>
          <span className="text-[10px] text-muted-foreground">{allIssues.filter(i => i.status !== "resolved").length}</span>
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-3 px-2 py-1 mb-1">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] text-muted-foreground">有効</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
            <span className="text-[9px] text-muted-foreground">無効</span>
          </div>
        </div>

        {allBusinesses.map((biz) => {
          const bizProjects = allProjects.filter((p: ProjectNode) => p.businessId === biz.id && p.parentId === null && p.status !== "completed")
          if (bizProjects.length === 0) return null
          const bizIssueCount = allIssues.filter((i) => {
            const proj = allProjects.find((p: ProjectNode) => p.id === i.projectId)
            return proj && proj.businessId === biz.id && i.status !== "resolved"
          }).length
          return (
            <BusinessTreeGroup
              key={biz.id}
              biz={biz}
              bizProjects={bizProjects}
              bizIssueCount={bizIssueCount}
              selectedProjectId={selectedProjectId}
              onSelect={setSelectedProjectId}
              allProjects={allProjects}
              allIssues={allIssues}
            />
          )
        })}
      </div>

      {/* 中央: 課題テーブル */}
      <div className="flex-1 overflow-y-auto">
        {/* ヘッダー: ステータスフィルタ + 登録ボタン */}
        <div className="p-3 border-b flex items-center gap-2">
          {(["all", "unresolved", "in-progress"] as StatusFilter[]).map((s) => {
            const label = s === "all" ? "すべて" : ISSUE_STATUS_CONFIG[s as IssueStatus].label
            const count = s === "all" ? countByStatus() : countByStatus(s as IssueStatus)
            return (
              <Button
                key={s}
                variant={statusFilter === s ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-1 cursor-pointer"
                onClick={() => setStatusFilter(s)}
              >
                {label}
                <span className="text-[10px] text-muted-foreground">({count})</span>
              </Button>
            )
          })}
          <div className="flex-1" />
          <Button size="sm" className="h-7 text-xs cursor-pointer" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-3 h-3 mr-1" />課題登録
          </Button>
        </div>

        {/* 課題リスト */}
        <div className="p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              該当する課題はありません
            </div>
          ) : (
            filtered.map((issue) => {
              const s = ISSUE_STATUS_CONFIG[issue.status]
              const p = PRIORITY_CONFIG[issue.priority]
              const isSelected = currentSelectedIssue?.id === issue.id
              return (
                <div
                  key={issue.id}
                  className={cn(
                    "p-3 rounded-md border cursor-pointer transition-colors",
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                  onClick={() => setSelectedIssue(isSelected ? null : issue)}
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className={cn("text-[10px] shrink-0 mt-0.5", s.className)}>{s.label}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{issue.title}</span>
                        <span className={cn("text-[10px] shrink-0 px-1.5 py-0.5 rounded-full font-medium", p.bgClassName)}>{p.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{issue.detail}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span>{issue.projectName}</span>
                        {issue.assigneeName && <span>旗振り: {issue.assigneeName}</span>}
                        {issue.deadline && <span>期限: {issue.deadline}</span>}
                        <span>作成: {issue.createdAt}</span>
                        {issue.progressNotes.length > 0 && (
                          <span className="text-primary">記録 {issue.progressNotes.length}件</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 右カラム: 課題詳細 */}
      {currentSelectedIssue && (
        <IssueDetailPanel
          issue={currentSelectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}

      {/* 課題登録ダイアログ */}
      <IssueCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        defaultProjectId={selectedProjectId}
        businesses={allBusinesses}
        projects={allProjects}
        employees={allEmployees}
      />
    </div>
  )
}
