"use client"

import { useState } from "react"
import { Plus, X, FileText, Link2, Paperclip } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectNode, TaskItem, IssueItem, Priority } from "./mock-data"
import { ISSUE_STATUS_CONFIG, TASK_STATUS_CONFIG, PRIORITY_CONFIG } from "./mock-data"
import { useCreateBusinessTask, useCreateBusinessIssue } from "@/hooks/use-business"
import { useEmployees } from "@/hooks/use-schedule"
import { useContacts, usePartners } from "@/hooks/use-crm"

const statusLabel: Record<string, { label: string; color: string }> = {
  active: { label: "有効", color: "bg-green-100 text-green-800" },
  "on-hold": { label: "保留", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "無効", color: "bg-gray-100 text-gray-800" },
}

const inlineInput = "bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:ring-0 rounded-none px-0 transition-colors"


// ===== パネル1: プロジェクト情報 =====

export function ProjectInfoPanel({
  node,
  onClose,
  onUpdate,
  allProjects,
}: {
  node: ProjectNode
  onClose: () => void
  onUpdate?: (patch: Partial<ProjectNode>) => void
  allProjects?: ProjectNode[]
}) {
  const update = (patch: Partial<ProjectNode>) => {
    onUpdate?.(patch)
  }

  const { data: employees = [] } = useEmployees()

  const [status, setLocalStatus] = useState(node.status === "active" ? "active" : "completed")
  const [priority, setLocalPriority] = useState<Priority>(node.priority)

  const [assigneeIds, setAssigneeIds] = useState<string[]>(node.assigneeIds ?? [])
  const [showAssigneeSelect, setShowAssigneeSelect] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [newUrlName, setNewUrlName] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [showContactSelect, setShowContactSelect] = useState(false)

  const { data: crmContacts = [] } = useContacts()
  const { data: crmPartners = [] } = usePartners()

  const handleAddUrl = () => {
    if (!newUrlName.trim() || !newUrl.trim()) return
    update({ attachments: [...node.attachments, { id: `att-${Date.now()}`, name: newUrlName.trim(), url: newUrl.trim(), type: "url" }] })
    setNewUrlName("")
    setNewUrl("")
    setShowUrlInput(false)
  }

  const handleAddFile = () => {
    update({ attachments: [...node.attachments, { id: `att-${Date.now()}`, name: `添付ファイル_${node.attachments.length + 1}.pdf`, url: `/files/dummy-${Date.now()}.pdf`, type: "file" }] })
  }

  const handleRemoveAttachment = (id: string) => {
    update({ attachments: node.attachments.filter((a) => a.id !== id) })
  }

  const projects = allProjects ?? []
  const childProjects = projects.filter((p) => p.parentId === node.id)
  const parentProject = node.parentId ? projects.find((p) => p.id === node.parentId) : null
  const siblingProjects = node.parentId
    ? projects.filter((p) => p.parentId === node.parentId && p.id !== node.id)
    : []

  return (
    <div className="w-[320px] border-l bg-card h-full flex flex-col shrink-0">
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
        <Input
          className={`h-7 text-sm font-bold flex-1 mr-2 ${inlineInput}`}
          defaultValue={node.name}
          key={`name-${node.id}`}
          onBlur={(e) => update({ name: e.target.value.trim() || node.name })}
        />
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0">
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 有効/無効・優先度・担当者 */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">有効/無効</p>
            <select
              className={`text-xs border rounded px-1.5 py-1 cursor-pointer w-full ${status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
              value={status}
              onChange={(e) => { const v = e.target.value as ProjectNode["status"]; setLocalStatus(v); update({ status: v }) }}
            >
              <option value="active">有効</option>
              <option value="completed">無効</option>
            </select>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">優先度</p>
            <select
              className={`text-xs border rounded px-1.5 py-1 cursor-pointer w-full ${PRIORITY_CONFIG[priority].bgClassName}`}
              value={priority}
              onChange={(e) => { const v = e.target.value as Priority; setLocalPriority(v); update({ priority: v }) }}
            >
              <option value="highest">最高</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>

        {/* 担当者（複数） */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-muted-foreground">担当者</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => setShowAssigneeSelect(!showAssigneeSelect)}
            >
              <Plus className="w-3 h-3 mr-0.5" />追加
            </Button>
          </div>
          {showAssigneeSelect && (
            <select
              className="w-full text-xs border rounded px-2 py-1 mb-2 bg-background"
              value=""
              onChange={(e) => {
                const v = e.target.value
                if (!v) return
                const next = [...assigneeIds, v]
                setAssigneeIds(next)
                update({ assigneeIds: next })
                setShowAssigneeSelect(false)
              }}
            >
              <option value="">選択してください</option>
              {employees.filter((emp) => !assigneeIds.includes(emp.id)).map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          )}
          {assigneeIds.length === 0 ? (
            <p className="text-xs text-muted-foreground">未設定</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {assigneeIds.map((aid) => {
                const emp = employees.find((e) => e.id === aid)
                return (
                  <Badge key={aid} variant="secondary" className="text-xs group/badge">
                    {emp?.name ?? aid}
                    <button
                      className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/badge:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = assigneeIds.filter((id) => id !== aid)
                        setAssigneeIds(next)
                        update({ assigneeIds: next })
                      }}
                    >
                      ×
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}
        </div>

        {/* 期限 */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">期限</p>
          <Input
            className={`h-7 text-xs w-40 ${inlineInput}`}
            type="date"
            defaultValue={node.deadline ?? ""}
            key={`deadline-${node.id}`}
            onBlur={(e) => update({ deadline: e.target.value || null })}
          />
        </div>

        {/* 目的 */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">目的</p>
          <Textarea
            className="text-sm min-h-[60px] bg-muted/30 focus:bg-background transition-colors"
            placeholder="目的を入力"
            defaultValue={node.purpose}
            key={`purpose-${node.id}`}
            onBlur={(e) => update({ purpose: e.target.value })}
          />
        </div>



        <Separator />

        {/* 関連取引先・顧客 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground">関連取引先・顧客</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => setShowContactSelect(!showContactSelect)}
            >
              <Plus className="w-3 h-3 mr-0.5" />追加
            </Button>
          </div>
          {showContactSelect && (
            <select
              className="w-full text-xs border rounded px-2 py-1 mb-2 bg-background"
              value=""
              onChange={(e) => {
                const [type, id] = e.target.value.split(":")
                if (!id) return
                if (type === "contact") {
                  const existingContactIds = node.relatedContacts.filter((c) => c.source === "direct").map((c) => c.id)
                  if (!existingContactIds.includes(id)) {
                    update({ contactIds: [...existingContactIds, id] })
                  }
                } else if (type === "partner") {
                  const existingPartnerIds = (node.relatedPartners ?? []).map((p) => p.id)
                  if (!existingPartnerIds.includes(id)) {
                    update({ partnerIds: [...existingPartnerIds, id] })
                  }
                }
                setShowContactSelect(false)
              }}
            >
              <option value="">選択してください</option>
              {crmContacts.length > 0 && (
                <optgroup label="顧客・取引先">
                  {crmContacts.map((c) => (
                    <option key={c.id} value={`contact:${c.id}`}>{c.name}{c.occupation ? ` (${c.occupation})` : ""}</option>
                  ))}
                </optgroup>
              )}
              {crmPartners.length > 0 && (
                <optgroup label="パートナー">
                  {crmPartners.map((p) => (
                    <option key={p.id} value={`partner:${p.id}`}>{p.name}{p.businessDescription ? ` (${p.businessDescription})` : ""}</option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
          {node.relatedContacts.length === 0 && (node.relatedPartners ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">なし</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {node.relatedContacts.map((c) => (
                <Badge
                  key={c.id}
                  variant="secondary"
                  className="text-xs group/badge cursor-pointer"
                  onClick={() => window.open(`/crm/contacts/${c.id}`, "_blank")}
                >
                  {c.name}
                  {c.role && <span className="text-[10px] text-muted-foreground ml-1">({c.role})</span>}
                  <button
                    className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/badge:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (c.source === "direct") {
                        const updatedContactIds = node.relatedContacts.filter((rc) => rc.source === "direct" && rc.id !== c.id).map((rc) => rc.id)
                        update({ contactIds: updatedContactIds })
                      } else {
                        const updatedContactIds = node.relatedContacts.filter((rc) => rc.source === "direct" && rc.id !== c.id).map((rc) => rc.id)
                        update({ contactIds: updatedContactIds })
                      }
                    }}
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {(node.relatedPartners ?? []).map((p) => (
                <Badge
                  key={p.id}
                  variant="secondary"
                  className="text-xs cursor-pointer"
                  onClick={() => window.open(`/crm/partners/${p.id}`, "_blank")}
                >
                  {p.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {node.accountNames.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">紐づき口座</p>
            <div className="flex flex-wrap gap-1">
              {node.accountNames.map((a) => (
                <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* 契約内容 */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">契約内容</p>
          <Textarea
            className="text-sm min-h-[40px] bg-muted/30 focus:bg-background transition-colors"
            placeholder="契約内容を入力"
            defaultValue={node.contractMemo}
            key={`contract-${node.id}`}
            onBlur={(e) => update({ contractMemo: e.target.value })}
          />
        </div>

        <Separator />

        {/* 添付ファイル・URL */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground">
              <Paperclip className="w-3 h-3 inline mr-1" />
              添付 ({node.attachments.length})
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={handleAddFile}>
                <FileText className="w-3 h-3 mr-0.5" />ファイル
              </Button>
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setShowUrlInput(true)}>
                <Link2 className="w-3 h-3 mr-0.5" />URL
              </Button>
            </div>
          </div>

          {showUrlInput && (
            <div className="space-y-1 mb-2 p-2 rounded border bg-muted/30">
              <Input placeholder="表示名" className="h-7 text-xs" value={newUrlName} onChange={(e) => setNewUrlName(e.target.value)} autoFocus />
              <Input placeholder="https://..." className="h-7 text-xs" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddUrl() }} />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowUrlInput(false)}>キャンセル</Button>
                <Button size="sm" className="h-6 text-[10px]" onClick={handleAddUrl} disabled={!newUrlName.trim() || !newUrl.trim()}>追加</Button>
              </div>
            </div>
          )}

          {node.attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground">なし</p>
          ) : (
            <div className="space-y-1">
              {node.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30 group">
                  {att.type === "file" ? <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate flex-1 hover:text-blue-600 hover:underline cursor-pointer">{att.name}</a>
                  <button onClick={() => handleRemoveAttachment(att.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* 紐づくカード */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">紐づくカード</p>
          {parentProject && (
            <div className="mb-2">
              <p className="text-[10px] text-muted-foreground mb-1">親プロジェクト</p>
              <div className="text-xs p-2 rounded-md border bg-muted/20">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusLabel[parentProject.status]?.color.split(" ")[0] ?? "bg-gray-400"}`} />
                  <span className="font-medium">{parentProject.name}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto">
                    {statusLabel[parentProject.status]?.label}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          {childProjects.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-muted-foreground mb-1">子プロジェクト ({childProjects.length})</p>
              <div className="space-y-1">
                {childProjects.map((cp) => {
                  return (
                    <div key={cp.id} className="text-xs p-2 rounded-md border bg-muted/20">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${cp.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                        <span className="font-medium truncate">{cp.name}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {siblingProjects.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">同階層 ({siblingProjects.length})</p>
              <div className="space-y-1">
                {siblingProjects.map((sp) => (
                  <div key={sp.id} className="text-xs p-1.5 rounded-md bg-muted/20 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusLabel[sp.status]?.color.split(" ")[0] ?? "bg-gray-400"}`} />
                    <span className="truncate">{sp.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!parentProject && childProjects.length === 0 && siblingProjects.length === 0 && (
            <p className="text-xs text-muted-foreground">なし</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== パネル2: タスク一覧 =====

export function ProjectTasksPanel({ tasks, projectId }: { tasks: TaskItem[]; projectId: string }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const createTaskMutation = useCreateBusinessTask()

  const handleAdd = () => {
    if (!newTitle.trim()) return
    createTaskMutation.mutate({ projectId, title: newTitle.trim(), status: "todo", createdBy: "野田" })
    setNewTitle("")
    setShowAdd(false)
  }

  return (
    <div className="w-[280px] border-l bg-card h-full flex flex-col shrink-0">
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
        <p className="text-sm font-bold">タスク ({tasks.length})</p>
        <Button size="sm" className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />追加
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {showAdd && (
          <div className="mb-2 p-2 rounded border bg-muted/30 space-y-1">
            <Input placeholder="タスク名" className="h-7 text-xs" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }} />
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] cursor-pointer" onClick={() => { setShowAdd(false); setNewTitle("") }}>キャンセル</Button>
              <Button size="sm" className="h-6 text-[10px] cursor-pointer" onClick={handleAdd} disabled={!newTitle.trim()}>追加</Button>
            </div>
          </div>
        )}
        {tasks.length === 0 && !showAdd ? (
          <p className="text-xs text-muted-foreground">タスクなし</p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((t) => {
              const tst = TASK_STATUS_CONFIG[t.status]
              return (
                <div key={t.id} className="text-xs p-2 rounded-md border bg-card">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 shrink-0 font-semibold ${tst.className}`}>
                      {tst.label}
                    </Badge>
                    <span className="truncate flex-1">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    {t.assigneeName && <span>{t.assigneeName}</span>}
                    {t.deadline && (
                      <span className={new Date(t.deadline) < new Date() ? "text-red-600 font-medium" : ""}>
                        〆 {t.deadline}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== パネル3: 課題一覧 =====

export function ProjectIssuesPanel({ issues, projectId }: { issues: IssueItem[]; projectId: string }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const createIssueMutation = useCreateBusinessIssue()

  const handleAdd = () => {
    if (!newTitle.trim()) return
    createIssueMutation.mutate({ projectId, title: newTitle.trim(), status: "unresolved", priority: "medium", createdBy: "野田" })
    setNewTitle("")
    setShowAdd(false)
  }

  return (
    <div className="w-[280px] border-l bg-card h-full flex flex-col shrink-0">
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
        <p className="text-sm font-bold">課題 ({issues.length})</p>
        <Button size="sm" className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />追加
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {showAdd && (
          <div className="mb-2 p-2 rounded border bg-muted/30 space-y-1">
            <Input placeholder="課題名" className="h-7 text-xs" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }} />
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] cursor-pointer" onClick={() => { setShowAdd(false); setNewTitle("") }}>キャンセル</Button>
              <Button size="sm" className="h-6 text-[10px] cursor-pointer" onClick={handleAdd} disabled={!newTitle.trim()}>追加</Button>
            </div>
          </div>
        )}
        {issues.length === 0 && !showAdd ? (
          <p className="text-xs text-muted-foreground">課題なし</p>
        ) : (
          <div className="space-y-1.5">
            {issues.map((issue) => {
              const s = ISSUE_STATUS_CONFIG[issue.status]
              return (
                <div key={issue.id} className="text-xs p-2 rounded-md border bg-card">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 shrink-0 ${s?.className ?? ""}`}>
                      {s?.label ?? issue.status}
                    </Badge>
                    <span className="font-medium truncate">{issue.title}</span>
                  </div>
                  {issue.detail && (
                    <p className="text-muted-foreground mt-1 line-clamp-2">{issue.detail}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    {issue.assigneeName && <span>旗振り: {issue.assigneeName}</span>}
                    {issue.deadline && (
                      <span className={new Date(issue.deadline) < new Date() ? "text-red-600 font-medium" : ""}>
                        〆 {issue.deadline}
                      </span>
                    )}
                    {issue.progressNotes.length > 0 && (
                      <span>経過{issue.progressNotes.length}件</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
