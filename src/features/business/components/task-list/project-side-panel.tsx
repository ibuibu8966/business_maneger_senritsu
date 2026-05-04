"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { TaskItem, ProjectNode } from "../mock-data"
import type { BizInfo, IssueInfo } from "./types"
import { STATUS_DOT } from "./constants"
import { getAncestorIds } from "./utils"
import { ProjectTreeNode } from "./project-tree-node"
import { MemoSection } from "../memo-section"
import { useUpdateProject } from "@/hooks/use-business"

export function ProjectSidePanel({
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
    } else if (selectedTask.businessId) {
      // 事業直下タスクの場合：その事業を自動展開
      autoExpandedBizIds.add(selectedTask.businessId)
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

  // 全事業を表示（プロジェクトを持たない事業もOK）
  const bizGroups = allBusinesses

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

                  {/* 事業直下タスク（プロジェクトに紐づかないタスク） */}
                  {(() => {
                    const directTasks = allTasks.filter((t) => t.businessId === biz.id && !t.projectId)
                    if (directTasks.length === 0) return null
                    return (
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1">事業直下タスク（{directTasks.length}件）</p>
                        <div className="space-y-0.5">
                          {directTasks.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => onSelectTask(t.id)}
                              className={`block w-full text-left text-xs px-1.5 py-0.5 rounded hover:bg-muted ${selectedTask?.id === t.id ? "bg-muted font-bold" : ""}`}
                            >
                              <span className="text-muted-foreground mr-1">#{t.seqNumber ?? ""}</span>
                              {t.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

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
