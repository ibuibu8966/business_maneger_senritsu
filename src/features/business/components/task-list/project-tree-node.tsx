"use client"

import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  TASK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  ISSUE_STATUS_CONFIG,
  type TaskItem,
  type ProjectNode,
} from "../mock-data"
import { MemoSection } from "../memo-section"
import { STATUS_DOT, STATUS_CYCLE, STATUS_TOOLTIP } from "./constants"
import type { IssueInfo } from "./types"

/**
 * プロジェクトツリーノード（再帰）
 */
export function ProjectTreeNode({
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
  const tasks = allTasks.filter((t) => t.projectId === proj.id && t.status !== "done")
  const issues = allIssues.filter((i) => i.projectId === proj.id && i.status !== "resolved")
  const unresolvedCount = issues.filter((i) => i.status !== "resolved").length
  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
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
          className={`w-2 h-2 rounded-full shrink-0 ml-1 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 dark:hover:ring-gray-600 ${STATUS_DOT[proj.status] ?? "bg-gray-300 dark:bg-gray-500"}`}
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

      {isExpanded && (
        <div className="ml-4 border-l border-muted pl-2 space-y-1.5 pb-1">
          {proj.purpose && (
            <div>
              <p className="text-[11px] text-muted-foreground">目的</p>
              <p className="text-xs">{proj.purpose}</p>
            </div>
          )}

          <div className="flex gap-3 text-xs">
            {proj.assignees?.length > 0 && <span><span className="text-muted-foreground">担当:</span> {proj.assignees.map((a: {name: string}) => a.name).join(", ")}</span>}
            {proj.deadline && <span><span className="text-muted-foreground">期限:</span> {proj.deadline}</span>}
          </div>

          {proj.accountNames.length > 0 && (
            <p className="text-xs"><span className="text-muted-foreground">口座:</span> {proj.accountNames.join(", ")}</p>
          )}
          {proj.partnerNames.length > 0 && (
            <p className="text-xs"><span className="text-muted-foreground">取引先:</span> {proj.partnerNames.join(", ")}</p>
          )}

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

          {proj.contractMemo && (
            <div>
              <p className="text-[11px] text-muted-foreground">契約メモ</p>
              <p className="text-xs bg-muted/50 rounded p-1.5">{proj.contractMemo}</p>
            </div>
          )}

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

          <MemoSection projectId={proj.id} compact />

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
