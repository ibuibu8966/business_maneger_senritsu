"use client"

import { Handle, Position, type NodeTypes } from "@xyflow/react"
import { Building2, FolderOpen, File, Plus } from "lucide-react"
import { PRIORITY_CONFIG, type Business, type ProjectNode } from "../mock-data"
import type { BusinessTaskDTO, ProjectDTO } from "@/types/dto"
import { formatCompact } from "./utils"

const statusDot: Record<string, string> = {
  active: "bg-green-500",
  "on-hold": "bg-yellow-500",
  completed: "bg-gray-400 dark:bg-gray-500",
}

export interface BusinessNodeData {
  biz: Business
  selected: boolean
  onClick: () => void
  onAddProject: () => void
  _tasks: BusinessTaskDTO[]
  _projects: ProjectDTO[]
  [key: string]: unknown
}

export interface ProjectNodeData {
  project: ProjectNode
  selected: boolean
  onClick: () => void
  onAddSub: () => void
  _tasks: BusinessTaskDTO[]
  depth: number
  [key: string]: unknown
}

/** 事業ノード */
export function BusinessNodeComponent({ data }: { data: BusinessNodeData }) {
  const { biz, selected, onClick, onAddProject } = data
  const profit = biz.revenue - biz.expense
  const tasks = data._tasks as BusinessTaskDTO[]
  const projects = data._projects as ProjectDTO[]
  const taskCount = tasks.filter((t) => {
    const proj = projects.find((p) => p.id === t.projectId)
    return proj?.businessId === biz.id && t.status !== "done"
  }).length

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 rounded-lg border-2 bg-card cursor-pointer transition-all min-w-[160px] max-w-[200px] ${
        selected ? "ring-2 ring-primary shadow-md border-primary" : "hover:shadow-sm border-border"
      }`}
    >
      <Handle type="source" position={Position.Bottom} style={{ background: "#94a3b8", width: 8, height: 8 }} />
      <div className="flex items-center gap-1.5 mb-1">
        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[biz.status]}`} />
        <span className="text-sm font-bold truncate flex-1">{biz.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onAddProject() }}
          className="w-4 h-4 rounded bg-muted hover:bg-primary/20 flex items-center justify-center shrink-0"
          title="プロジェクト追加"
        >
          <Plus className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className={`px-1 py-0.5 rounded ${PRIORITY_CONFIG[biz.priority].bgClassName}`}>{PRIORITY_CONFIG[biz.priority].label}</span>
        <span className={profit >= 0 ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
          {formatCompact(profit)}
        </span>
        {taskCount > 0 && (
          <span className="text-muted-foreground">{taskCount}件</span>
        )}
      </div>
      {biz.assignees.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1">{biz.assignees.map(a => a.name).join(", ")}</p>
      )}
    </div>
  )
}

/** プロジェクトノード */
export function ProjectNodeComponent({ data }: { data: ProjectNodeData }) {
  const { project, selected, onClick, onAddSub, depth } = data
  const tasks = data._tasks as BusinessTaskDTO[]
  const taskCount = tasks.filter((t) => t.projectId === project.id && t.status !== "done").length
  const profit = project.revenue - project.expense
  const DepthIcon = depth >= 1 ? File : FolderOpen
  const depthColor = depth >= 1 ? "text-orange-500" : "text-green-600"

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border bg-card cursor-pointer transition-all min-w-[140px] max-w-[180px] ${
        selected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"
      }`}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#94a3b8", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#94a3b8", width: 8, height: 8 }} />
      <div className="flex items-center gap-1.5 mb-1">
        <DepthIcon className={`w-3 h-3 shrink-0 ${depthColor}`} />
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[project.status]}`} />
        <span className="text-xs font-medium truncate flex-1">{project.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onAddSub() }}
          className="w-3.5 h-3.5 rounded bg-muted hover:bg-primary/20 flex items-center justify-center shrink-0"
          title="サブプロジェクト追加"
        >
          <Plus className="w-2.5 h-2.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] px-1 py-0.5 rounded ${PRIORITY_CONFIG[project.priority].bgClassName}`}>{PRIORITY_CONFIG[project.priority].label}</span>
        {(project.revenue > 0 || project.expense > 0) && (
          <span className={`text-[10px] font-medium ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
            {profit >= 0 ? "+" : ""}{formatCompact(profit)}
          </span>
        )}
        {taskCount > 0 && (
          <span className="text-[10px] text-muted-foreground">{taskCount}件</span>
        )}
      </div>
      {project.assignees.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1 truncate">{project.assignees.map(a => a.name).join(", ")}</p>
      )}
    </div>
  )
}

export const nodeTypes: NodeTypes = {
  business: BusinessNodeComponent,
  project: ProjectNodeComponent,
}
