"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  reconnectEdge,
  type Node,
  type Edge,
  type NodeTypes,
  type Connection,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import ELK from "elkjs/lib/elk.bundled.js"
import { Plus, FileText, Link2, Paperclip, X, Network, List, ChevronDown, ChevronRight, Building2, FolderOpen, File } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  ISSUE_STATUS_CONFIG,
  buildProjectTree,
  type Business,
  type ProjectNode,
  type ProjectTreeNode,
  type Priority,
} from "./mock-data"
import type { BusinessDetailDTO, ProjectDTO, BusinessTaskDTO, BusinessIssueDTO } from "@/types/dto"
import {
  useBusinessDetails,
  useCreateBusiness,
  useUpdateBusiness,
  useDeleteBusiness,
  useProjects,
  useCreateProject,
  useUpdateProject,
  useBusinessTasks,
  useBusinessIssues,
  useCreateBusinessTask,
} from "@/hooks/use-business"
import { useSession } from "next-auth/react"
import { ProjectInfoPanel, ProjectTasksPanel, ProjectIssuesPanel } from "./project-detail-panel"
import { MemoSection } from "./memo-section"
import { useEmployees } from "@/hooks/use-schedule"
import { useContacts, usePartners } from "@/hooks/use-crm"
import { useFileUpload } from "../hooks/use-file-upload"

// ===== ユーティリティ =====

const statusDot: Record<string, string> = {
  active: "bg-green-500",
  "on-hold": "bg-yellow-500",
  completed: "bg-gray-400 dark:bg-gray-500",
}

import { formatCompact, toBusiness, toProjectNode } from "./project-tree/utils"
import { nodeTypes, type BusinessNodeData, type ProjectNodeData } from "./project-tree/nodes"


// ===== レイアウト計算 =====

function buildNodesAndEdges(
  businesses: Business[],
  projects: ProjectNode[],
  tasks: BusinessTaskDTO[],
  selectedProjectId: string | null,
  selectedBusinessId: string | null,
  onSelectProject: (node: ProjectNode) => void,
  onSelectBusiness: (biz: Business) => void,
  onAddProject: (bizId: string) => void,
  onAddSub: (parentId: string, bizId: string) => void,
  filterBusinessId: string | null = null,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 縦レイアウト: 上→下 に展開
  const BIZ_Y = 0
  const PROJ_Y = 120
  const SUB_Y = 240
  const SUB2_Y = 360
  const COL_GAP = 220   // ノード間の横間隔
  const GROUP_GAP = 80   // 事業グループ間の横間隔

  let currentX = 0

  // ProjectDTO[] を ProjectNode[] 互換として扱うため、rawProjects を参照
  const rawProjectDTOs = projects as unknown as ProjectDTO[]

  const filteredBusinesses = filterBusinessId
    ? businesses.filter((b) => b.id === filterBusinessId)
    : businesses

  for (const biz of filteredBusinesses) {
    const bizNodeId = `biz-${biz.id}`

    const bizProjects = projects.filter((p) => p.businessId === biz.id)
    const tree = buildProjectTree(bizProjects)

    const projPositions: { nodeId: string; x: number }[] = []

    let projX = currentX
    for (const proj of tree) {
      const subPositions: { nodeId: string; x: number }[] = []
      let subX = projX

      for (const sub of proj.children) {
        const sub2Positions: { nodeId: string; x: number }[] = []
        let sub2X = subX

        for (const sub2 of sub.children) {
          const sub2NodeId = `proj-${sub2.id}`
          sub2Positions.push({ nodeId: sub2NodeId, x: sub2X })
          nodes.push({
            id: sub2NodeId,
            type: "project",
            position: { x: sub2X, y: SUB2_Y },
            data: {
              project: sub2,
              selected: selectedProjectId === sub2.id,
              onClick: () => onSelectProject(sub2),
              onAddSub: () => onAddSub(sub2.id, sub2.businessId),
              _tasks: tasks,
              depth: 2,
            },
          })
          sub2X += COL_GAP
        }

        const subNodeId = `proj-${sub.id}`
        const subCenterX = sub2Positions.length > 0
          ? (sub2Positions[0].x + sub2Positions[sub2Positions.length - 1].x) / 2
          : subX

        subPositions.push({ nodeId: subNodeId, x: subCenterX })
        nodes.push({
          id: subNodeId,
          type: "project",
          position: { x: subCenterX, y: SUB_Y },
          data: {
            project: sub,
            selected: selectedProjectId === sub.id,
            onClick: () => onSelectProject(sub),
            onAddSub: () => onAddSub(sub.id, sub.businessId),
            _tasks: tasks,
            depth: 1,
          },
        })

        for (const s2 of sub2Positions) {
          edges.push({
            id: `e-${subNodeId}-${s2.nodeId}`,
            source: subNodeId,
            target: s2.nodeId,
            style: { stroke: "#94a3b8", strokeWidth: 1.5 },
          })
        }

        subX = sub2Positions.length > 0 ? sub2X : subX + COL_GAP
      }

      const projNodeId = `proj-${proj.id}`
      const projCenterX = subPositions.length > 0
        ? (subPositions[0].x + subPositions[subPositions.length - 1].x) / 2
        : projX

      projPositions.push({ nodeId: projNodeId, x: projCenterX })
      nodes.push({
        id: projNodeId,
        type: "project",
        position: { x: projCenterX, y: PROJ_Y },
        data: {
          project: proj,
          selected: selectedProjectId === proj.id,
          onClick: () => onSelectProject(proj),
          onAddSub: () => onAddSub(proj.id, proj.businessId),
          _tasks: tasks,
          depth: 0,
        },
      })

      for (const s of subPositions) {
        edges.push({
          id: `e-${projNodeId}-${s.nodeId}`,
          source: projNodeId,
          target: s.nodeId,
          style: { stroke: "#94a3b8", strokeWidth: 1.5 },
        })
      }

      projX = subPositions.length > 0 ? subX : projX + COL_GAP
    }

    // 事業ノード（プロジェクト群の中央上）
    const bizCenterX = projPositions.length > 0
      ? (projPositions[0].x + projPositions[projPositions.length - 1].x) / 2
      : currentX

    nodes.push({
      id: bizNodeId,
      type: "business",
      position: { x: bizCenterX, y: BIZ_Y },
      data: {
        biz,
        selected: selectedBusinessId === biz.id && !selectedProjectId,
        onClick: () => onSelectBusiness(biz),
        onAddProject: () => onAddProject(biz.id),
        _tasks: tasks,
        _projects: rawProjectDTOs,
      },
    })

    for (const pp of projPositions) {
      edges.push({
        id: `e-${bizNodeId}-${pp.nodeId}`,
        source: bizNodeId,
        target: pp.nodeId,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      })
    }

    currentX = projX > currentX ? projX + GROUP_GAP : currentX + COL_GAP + GROUP_GAP
  }

  return { nodes, edges }
}

// ===== ELK自動整列 =====

const elk = new ELK()

async function autoLayout(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.type === "business" ? 200 : 180,
      height: n.type === "business" ? 80 : 60,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  }

  const layout = await elk.layout(elkGraph)

  return nodes.map((n) => {
    const elkNode = layout.children?.find((c) => c.id === n.id)
    return {
      ...n,
      position: {
        x: elkNode?.x ?? n.position.x,
        y: elkNode?.y ?? n.position.y,
      },
    }
  })
}

// ===== ツリービュー =====

function TreeViewItem({
  node,
  level,
  selectedId,
  onSelect,
  tasks,
  issues,
}: {
  node: ProjectTreeNode
  level: number
  selectedId: string | null
  onSelect: (node: ProjectNode) => void
  tasks: BusinessTaskDTO[]
  issues: BusinessIssueDTO[]
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const taskCount = tasks.filter((t) => t.projectId === node.id && t.status !== "done").length
  const issueCount = issues.filter((i) => i.projectId === node.id && i.status !== "resolved").length
  const profit = node.revenue - node.expense
  const TreeIcon = level >= 1 ? File : FolderOpen
  const treeIconColor = level >= 1 ? "text-orange-500" : "text-green-600"

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer rounded-md transition-colors ${
          selectedId === node.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            className="w-4 h-4 flex items-center justify-center shrink-0"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <TreeIcon className={`w-3 h-3 shrink-0 ${treeIconColor}`} />
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[node.status]}`} />
        <span className="text-sm truncate flex-1">{node.name}</span>
        <span className={`text-[10px] px-1 py-0.5 rounded ${PRIORITY_CONFIG[node.priority].bgClassName}`}>
          {PRIORITY_CONFIG[node.priority].label}
        </span>
        {(node.revenue > 0 || node.expense > 0) && (
          <span className={`text-[10px] font-medium ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
            {formatCompact(profit)}
          </span>
        )}
        {taskCount > 0 && <span className="text-[10px] text-muted-foreground">{taskCount}件</span>}
        {issueCount > 0 && <span className="text-[10px] text-red-500">{issueCount}課題</span>}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeViewItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              tasks={tasks}
              issues={issues}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TreeView({
  businesses,
  projects,
  tasks,
  issues,
  filterBusinessId,
  selectedProjectId,
  selectedBusinessId,
  onSelectProject,
  onSelectBusiness,
}: {
  businesses: Business[]
  projects: ProjectNode[]
  tasks: BusinessTaskDTO[]
  issues: BusinessIssueDTO[]
  filterBusinessId: string | null
  selectedProjectId: string | null
  selectedBusinessId: string | null
  onSelectProject: (node: ProjectNode) => void
  onSelectBusiness: (biz: Business) => void
}) {
  const filtered = filterBusinessId
    ? businesses.filter((b) => b.id === filterBusinessId)
    : businesses

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {filtered.map((biz) => {
        const bizProjects = projects.filter((p) => p.businessId === biz.id)
        const tree = buildProjectTree(bizProjects)
        const profit = biz.revenue - biz.expense

        return (
          <div key={biz.id} className="rounded-lg border">
            {/* 事業ヘッダー */}
            <div
              className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-t-lg transition-colors ${
                selectedBusinessId === biz.id && !selectedProjectId
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "hover:bg-muted/30"
              }`}
              onClick={() => onSelectBusiness(biz)}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot[biz.status]}`} />
              <span className="text-sm font-bold truncate flex-1">{biz.name}</span>
              <Badge variant="outline" className={`text-[10px] h-5 ${PRIORITY_CONFIG[biz.priority].bgClassName}`}>
                {PRIORITY_CONFIG[biz.priority].label}
              </Badge>
              {(biz.revenue > 0 || biz.expense > 0) && (
                <span className={`text-xs font-medium ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {formatCompact(profit)}
                </span>
              )}
              {biz.assignees.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{biz.assignees.map(a => a.name).join(", ")}</span>
              )}
            </div>
            {/* プロジェクトツリー */}
            {tree.length > 0 && (
              <div className="border-t py-1">
                {tree.map((proj) => (
                  <TreeViewItem
                    key={proj.id}
                    node={proj}
                    level={0}
                    selectedId={selectedProjectId}
                    onSelect={onSelectProject}
                    tasks={tasks}
                    issues={issues}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ===== メイン（内部） =====

const EMPTY_BIZ: BusinessDetailDTO[] = []
const EMPTY_PROJ: ProjectDTO[] = []
const EMPTY_TASKS: BusinessTaskDTO[] = []
const EMPTY_ISSUES: BusinessIssueDTO[] = []

function ProjectTreeInner() {
  // ----- データ取得 -----
  const { data: businessDTOs = EMPTY_BIZ, isLoading: bizLoading } = useBusinessDetails()
  const { data: projectDTOs = EMPTY_PROJ, isLoading: projLoading } = useProjects()
  const { data: tasks = EMPTY_TASKS, isLoading: taskLoading } = useBusinessTasks()
  const { data: issues = EMPTY_ISSUES, isLoading: issueLoading } = useBusinessIssues()

  const createBusinessMutation = useCreateBusiness()
  const createProjectMutation = useCreateProject()
  const updateProjectMutation = useUpdateProject()

  // DTO → Mock型変換
  const businesses = useMemo(() => businessDTOs.map(toBusiness), [businessDTOs])
  const projects = useMemo(() => projectDTOs.map(toProjectNode), [projectDTOs])

  const isLoading = bizLoading || projLoading || taskLoading || issueLoading

  const [viewMode, setViewMode] = useState<"graph" | "tree">("graph")
  const [filterBusinessId, setFilterBusinessId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)

  // 追加ダイアログ
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<"business" | "project" | "sub">("business")
  const [dialogParentBizId, setDialogParentBizId] = useState<string>("")
  const [dialogParentId, setDialogParentId] = useState<string | null>(null)
  const [dialogName, setDialogName] = useState("")
  const [dialogPurpose, setDialogPurpose] = useState("")
  const [dialogStatus, setDialogStatus] = useState<string>("active")
  const [dialogPriority, setDialogPriority] = useState<string>("medium")
  const [dialogDeadline, setDialogDeadline] = useState("")
  const [dialogContractMemo, setDialogContractMemo] = useState("")
  const [dialogAssigneeIds, setDialogAssigneeIds] = useState<string[]>([])
  const [dialogShowDetail, setDialogShowDetail] = useState(false)
  const [dialogShowAssigneeSelect, setDialogShowAssigneeSelect] = useState(false)
  const { data: dialogEmployees = [] } = useEmployees()

  const resetDialogFields = useCallback(() => {
    setDialogName("")
    setDialogPurpose("")
    setDialogStatus("active")
    setDialogPriority("medium")
    setDialogDeadline("")
    setDialogContractMemo("")
    setDialogAssigneeIds([])
    setDialogShowDetail(false)
    setDialogShowAssigneeSelect(false)
  }, [])

  const openAddBusiness = useCallback(() => {
    setDialogType("business")
    setDialogParentBizId("")
    setDialogParentId(null)
    resetDialogFields()
    setDialogOpen(true)
  }, [resetDialogFields])

  const openAddProject = useCallback((bizId: string) => {
    setDialogType("project")
    setDialogParentBizId(bizId)
    setDialogParentId(null)
    resetDialogFields()
    setDialogOpen(true)
  }, [resetDialogFields])

  const openAddSub = useCallback((parentId: string, bizId: string) => {
    setDialogType("sub")
    setDialogParentBizId(bizId)
    setDialogParentId(parentId)
    resetDialogFields()
    setDialogOpen(true)
  }, [resetDialogFields])

  const handleAdd = useCallback(() => {
    if (!dialogName.trim()) return

    const commonFields = {
      purpose: dialogPurpose || undefined,
      status: dialogStatus || undefined,
      priority: dialogPriority || undefined,
      assigneeIds: dialogAssigneeIds.length > 0 ? dialogAssigneeIds : undefined,
      contractMemo: dialogContractMemo || undefined,
    }

    if (dialogType === "business") {
      createBusinessMutation.mutate({
        name: dialogName.trim(),
        ...commonFields,
      })
    } else {
      createProjectMutation.mutate({
        businessId: dialogParentBizId,
        parentId: dialogParentId,
        name: dialogName.trim(),
        deadline: dialogDeadline || undefined,
        ...commonFields,
      })
    }

    setDialogOpen(false)
  }, [dialogType, dialogName, dialogParentBizId, dialogParentId, dialogPurpose, dialogStatus, dialogPriority, dialogDeadline, dialogContractMemo, dialogAssigneeIds, createBusinessMutation, createProjectMutation])

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) ?? null
    : null
  const selectedBusiness = selectedBusinessId
    ? businesses.find((b) => b.id === selectedBusinessId) ?? null
    : null

  const tasksForDetail = selectedProject
    ? tasks.filter((t) => t.projectId === selectedProject.id)
    : []

  const issuesForDetail = selectedProject
    ? issues.filter((i) => i.projectId === selectedProject.id)
    : []

  // dialogOpenの変更でも再計算させる
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      buildNodesAndEdges(
        businesses,
        projects,
        tasks,
        selectedProjectId,
        selectedBusinessId,
        (node) => {
          setSelectedProjectId(node.id)
          setSelectedBusinessId(null)
        },
        (biz) => {
          setSelectedBusinessId(biz.id)
          setSelectedProjectId(null)
        },
        openAddProject,
        openAddSub,
        filterBusinessId,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businesses, projects, tasks, selectedProjectId, selectedBusinessId, dialogOpen, filterBusinessId],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // 新しい接続を作る（ハンドルからハンドルへドラッグ）
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge({ ...connection, style: { stroke: "#94a3b8", strokeWidth: 1.5 } }, eds),
      )
    },
    [setEdges],
  )

  // 既存のエッジを別のノードに繋ぎ替え（エッジの端をドラッグ）
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds))
    },
    [setEdges],
  )

  const { fitView } = useReactFlow()

  // 自動整列
  const handleAutoLayout = useCallback(async () => {
    const laid = await autoLayout(nodes, edges)
    setNodes(laid)
    setTimeout(() => fitView({ padding: 0.3 }), 50)
  }, [nodes, edges, setNodes, fitView])

  // 選択状態が変わったらノード・エッジを更新（位置は保持）
  useEffect(() => {
    setNodes((prev) => {
      const posMap = new Map(prev.map((n) => [n.id, n.position]))
      return initialNodes.map((n) => ({
        ...n,
        position: posMap.get(n.id) ?? n.position,
      }))
    })
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // ----- ローディング表示 -----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* ツールバー: ビューモード切替 + 事業フィルタ */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center rounded-md border overflow-hidden">
          <button
            className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
              viewMode === "graph" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            onClick={() => setViewMode("graph")}
          >
            <Network className="w-3.5 h-3.5" />関連図
          </button>
          <button
            className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
              viewMode === "tree" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            onClick={() => setViewMode("tree")}
          >
            <List className="w-3.5 h-3.5" />ツリー
          </button>
        </div>

        <select
          className="text-xs border rounded-md px-2 py-1.5 bg-background cursor-pointer"
          value={filterBusinessId ?? ""}
          onChange={(e) => setFilterBusinessId(e.target.value || null)}
        >
          <option value="">すべての事業</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <div className="flex gap-2 ml-auto">
          <Button size="sm" className="text-xs" onClick={openAddBusiness}>
            <Plus className="w-3 h-3 mr-1" />事業追加
          </Button>
          {selectedBusiness && !selectedProject && (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => openAddProject(selectedBusiness.id)}>
              <Plus className="w-3 h-3 mr-1" />プロジェクト追加
            </Button>
          )}
          {selectedProject && (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => openAddSub(selectedProject.id, selectedProject.businessId)}>
              <Plus className="w-3 h-3 mr-1" />サブプロジェクト追加
            </Button>
          )}
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex min-h-0">
        {viewMode === "graph" ? (
          /* React Flow 相関図 */
          <div className="flex-1" style={{ minHeight: "100%", height: "100%" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onReconnect={onReconnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.3}
              maxZoom={2}
              reconnectRadius={20}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} size={1} />
              <Controls position="bottom-left" />
              <MiniMap
                position="bottom-right"
                nodeStrokeWidth={3}
                zoomable
                pannable
                style={{ width: 150, height: 100 }}
              />
              <Panel position="top-right">
                <Button size="sm" className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white" onClick={handleAutoLayout}>
                  整列
                </Button>
              </Panel>
            </ReactFlow>
          </div>
        ) : (
          /* ツリービュー */
          <TreeView
            businesses={businesses}
            projects={projects}
            tasks={tasks}
            issues={issues}
            filterBusinessId={filterBusinessId}
            selectedProjectId={selectedProjectId}
            selectedBusinessId={selectedBusinessId}
            onSelectProject={(node) => {
              setSelectedProjectId(node.id)
              setSelectedBusinessId(null)
            }}
            onSelectBusiness={(biz) => {
              setSelectedBusinessId(biz.id)
              setSelectedProjectId(null)
            }}
          />
        )}

        {/* 詳細パネル: プロジェクト（横並び3パネル） */}
        {selectedProject && (
          <>
            <ProjectInfoPanel
              node={selectedProject}
              onClose={() => setSelectedProjectId(null)}
              onUpdate={(patch) => updateProjectMutation.mutate({ id: selectedProject.id, data: patch as Record<string, unknown> })}
              allProjects={projects}
            />
            <ProjectTasksPanel tasks={tasksForDetail} projectId={selectedProject.id} />
            <ProjectIssuesPanel issues={issuesForDetail} projectId={selectedProject.id} />
          </>
        )}

        {/* 詳細パネル: 事業（横並び3パネル） */}
        {selectedBusiness && !selectedProject && (
          <>
            <BusinessInfoPanel biz={selectedBusiness} projects={projects} onClose={() => setSelectedBusinessId(null)} />
            <BusinessTasksPanel biz={selectedBusiness} projects={projectDTOs} tasks={tasks} />
            <BusinessIssuesPanel biz={selectedBusiness} projects={projectDTOs} issues={issues} />
          </>
        )}
      </div>

      {/* 追加ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "business" ? "事業追加" : dialogType === "project" ? "プロジェクト追加" : "サブプロジェクト追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-xs">名前 *</Label>
              <Input
                className="mt-1"
                placeholder={dialogType === "business" ? "事業名を入力" : "プロジェクト名を入力"}
                value={dialogName}
                onChange={(e) => setDialogName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && !dialogShowDetail) handleAdd() }}
                autoFocus
              />
            </div>

            {/* 詳細設定（折りたたみ） */}
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setDialogShowDetail(!dialogShowDetail)}
            >
              {dialogShowDetail ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              詳細設定
            </button>

            {dialogShowDetail && (
              <div className="space-y-3 pl-1">
                {/* 有効/無効 + 優先度 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">有効/無効</Label>
                    <select
                      className={`mt-1 w-full rounded-md border px-2 py-1.5 text-sm cursor-pointer ${
                        dialogStatus === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                      value={dialogStatus}
                      onChange={(e) => setDialogStatus(e.target.value)}
                    >
                      <option value="active">有効</option>
                      <option value="completed">無効</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">優先度</Label>
                    <select
                      className={`mt-1 w-full rounded-md border px-2 py-1.5 text-sm cursor-pointer ${
                        PRIORITY_CONFIG[dialogPriority as Priority]?.bgClassName ?? ""
                      }`}
                      value={dialogPriority}
                      onChange={(e) => setDialogPriority(e.target.value)}
                    >
                      <option value="highest">最高</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                </div>

                {/* 担当者 */}
                <div>
                  <Label className="text-xs">担当者</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                    {dialogAssigneeIds.map((eid) => {
                      const emp = dialogEmployees.find((e: any) => e.id === eid)
                      return (
                        <Badge key={eid} variant="secondary" className="text-xs gap-1">
                          {emp?.name ?? eid}
                          <button
                            type="button"
                            className="ml-0.5 hover:text-destructive cursor-pointer"
                            onClick={() => setDialogAssigneeIds(dialogAssigneeIds.filter((id) => id !== eid))}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )
                    })}
                    {!dialogShowAssigneeSelect ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground cursor-pointer"
                        onClick={() => setDialogShowAssigneeSelect(true)}
                      >
                        <Plus className="w-3 h-3 mr-0.5" /> 追加
                      </Button>
                    ) : (
                      <select
                        className="rounded-md border px-2 py-1 text-sm cursor-pointer"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setDialogAssigneeIds([...dialogAssigneeIds, e.target.value])
                            setDialogShowAssigneeSelect(false)
                          }
                        }}
                        onBlur={() => setDialogShowAssigneeSelect(false)}
                        autoFocus
                      >
                        <option value="">選択...</option>
                        {dialogEmployees
                          .filter((e: any) => !dialogAssigneeIds.includes(e.id))
                          .map((e: any) => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* 期限（PJ/サブPJのみ） */}
                {dialogType !== "business" && (
                  <div>
                    <Label className="text-xs">期限</Label>
                    <Input
                      type="date"
                      className="mt-1 cursor-pointer"
                      value={dialogDeadline}
                      onChange={(e) => setDialogDeadline(e.target.value)}
                    />
                  </div>
                )}

                {/* 目的 */}
                <div>
                  <Label className="text-xs">目的</Label>
                  <Textarea
                    className="mt-1 min-h-[60px]"
                    placeholder="目的を入力"
                    value={dialogPurpose}
                    onChange={(e) => setDialogPurpose(e.target.value)}
                  />
                </div>

                {/* 契約内容 */}
                <div>
                  <Label className="text-xs">契約内容</Label>
                  <Textarea
                    className="mt-1 min-h-[60px]"
                    placeholder="契約内容を入力"
                    value={dialogContractMemo}
                    onChange={(e) => setDialogContractMemo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button size="sm" onClick={handleAdd} disabled={!dialogName.trim()}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===== エクスポート（ReactFlowProviderで囲む） =====

export function ProjectTree() {
  return (
    <ReactFlowProvider>
      <ProjectTreeInner />
    </ReactFlowProvider>
  )
}

// ===== 事業パネル1: 事業情報 =====

const bizStatusLabel: Record<string, { label: string; color: string }> = {
  active: { label: "進行中", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  "on-hold": { label: "保留", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  completed: { label: "完了", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
}

function BusinessInfoPanel({ biz, projects, onClose }: { biz: Business; projects: ProjectNode[]; onClose: () => void }) {
  const updateBusinessMutation = useUpdateBusiness()
  const deleteBusinessMutation = useDeleteBusiness()

  const update = useCallback((patch: Partial<Business>) => {
    updateBusinessMutation.mutate({ id: biz.id, data: patch as Record<string, unknown> })
  }, [biz.id, updateBusinessMutation])

  const { data: employees = [] } = useEmployees()

  const [name, setName] = useState(biz.name)
  const [purpose, setPurpose] = useState(biz.purpose)
  const [status, setStatus] = useState(biz.status)
  const [priority, setPriority] = useState<Priority>(biz.priority)
  const [assigneeIds, setAssigneeIds] = useState<string[]>(biz.assigneeIds ?? [])
  const [showAssigneeSelect, setShowAssigneeSelect] = useState(false)
  const [contractMemo, setContractMemo] = useState(biz.contractMemo)
  const [attachments, setAttachments] = useState(biz.attachments)
  const [relatedContacts, setRelatedContacts] = useState(biz.relatedContacts)
  const [relatedPartners, setRelatedPartners] = useState(biz.relatedPartners ?? [])
  const [showContactSelect, setShowContactSelect] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [newUrlName, setNewUrlName] = useState("")
  const [newUrl, setNewUrl] = useState("")

  const { data: crmContacts = [] } = useContacts()
  const { data: crmPartners = [] } = usePartners()

  const bizProjects = projects.filter((p) => p.businessId === biz.id && p.parentId === null)

  // 透明インプット共通スタイル
  const inlineInput = "bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:ring-0 rounded-none px-0 transition-colors"

  const handleAddUrl = () => {
    if (!newUrlName.trim() || !newUrl.trim()) return
    const next = [...attachments, { id: `att-${Date.now()}`, name: newUrlName.trim(), url: newUrl.trim(), type: "url" as const }]
    setAttachments(next)
    update({ attachments: next })
    setNewUrlName(""); setNewUrl(""); setShowUrlInput(false)
  }

  const { openFilePicker } = useFileUpload((result) => {
    const next = [...attachments, { id: `att-${Date.now()}`, name: result.name, url: result.url, type: "file" as const }]
    setAttachments(next)
    update({ attachments: next })
  })

  const handleAddFile = () => {
    openFilePicker()
  }

  const removeAttachment = (id: string) => {
    const next = attachments.filter((a) => a.id !== id)
    setAttachments(next)
    update({ attachments: next })
  }

  return (
    <div className="w-[320px] border-l bg-card h-full flex flex-col shrink-0">
      {/* ヘッダー: 名前を直接編集 */}
      <div className="px-4 py-3 border-b flex items-center gap-2 shrink-0">
        <input
          className={`text-sm font-bold flex-1 min-w-0 ${inlineInput} h-7`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => update({ name: name.trim() || biz.name })}
        />
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg shrink-0">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 有効/無効・優先度・担当者 */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">有効/無効</p>
            <select
              className={`w-full text-xs border rounded-md px-2 py-1.5 cursor-pointer ${status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"} [&>option]:bg-background [&>option]:text-foreground`}
              value={status === "active" ? "active" : "completed"}
              onChange={(e) => { const v = e.target.value as typeof status; setStatus(v); update({ status: v }) }}
            >
              <option value="active">有効</option>
              <option value="completed">無効</option>
            </select>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">優先度</p>
            <select
              className={`w-full text-xs border rounded-md px-2 py-1.5 cursor-pointer ${PRIORITY_CONFIG[priority].bgClassName}`}
              value={priority}
              onChange={(e) => { const v = e.target.value as Priority; setPriority(v); update({ priority: v }) }}
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

        {/* 目的 */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">目的</p>
          <Textarea
            className="text-sm min-h-[50px] resize-none bg-muted/30 border-muted focus:bg-background transition-colors"
            placeholder="事業の目的を入力..."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            onBlur={() => update({ purpose })}
          />
        </div>

        <Separator />

        {/* 契約内容 */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">契約内容</p>
          <Textarea
            className="text-sm min-h-[40px] resize-none bg-muted/30 border-muted focus:bg-background transition-colors"
            placeholder="契約内容を入力..."
            value={contractMemo}
            onChange={(e) => setContractMemo(e.target.value)}
            onBlur={() => update({ contractMemo })}
          />
        </div>

        {/* メモ */}
        <MemoSection businessId={biz.id} compact />

        {/* 関連取引先・顧客 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-muted-foreground">関連取引先・顧客</p>
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setShowContactSelect(true)}>
              <Plus className="w-3 h-3 mr-0.5" />追加
            </Button>
          </div>
          {showContactSelect && (
            <div className="mb-2 p-2 rounded border bg-muted/30 space-y-1">
              <p className="text-[10px] text-muted-foreground">顧客・取引先を選択</p>
              <select
                className="w-full text-xs border rounded px-2 py-1.5 bg-background cursor-pointer"
                defaultValue=""
                onChange={(e) => {
                  const [type, id] = e.target.value.split(":")
                  if (!id) return
                  if (type === "contact") {
                    const already = relatedContacts.some((c) => c.source === "direct" && c.id === id)
                    if (already) { setShowContactSelect(false); return }
                    const c = crmContacts.find((c) => c.id === id)
                    if (!c) return
                    const directIds = relatedContacts.filter((rc) => rc.source === "direct").map((rc) => rc.id)
                    update({ contactIds: [...directIds, id] })
                    setRelatedContacts([...relatedContacts, { id: c.id, name: c.name, role: c.type === "salon_member" ? "顧客" : "取引先", source: "direct" as const }])
                  } else {
                    const already = relatedPartners.some((p) => p.id === id)
                    if (already) { setShowContactSelect(false); return }
                    const p = crmPartners.find((p) => p.id === id)
                    if (!p) return
                    const nextPartners = [...relatedPartners, { id: p.id, name: p.name }]
                    setRelatedPartners(nextPartners)
                    update({ partnerIds: nextPartners.map((pp) => pp.id) })
                  }
                  setShowContactSelect(false)
                }}
              >
                <option value="">選択してください</option>
                {crmContacts.length > 0 && <option disabled>── 顧客・取引先 ──</option>}
                {crmContacts.map((c) => (
                  <option key={c.id} value={`contact:${c.id}`}>{c.name}</option>
                ))}
                {crmPartners.length > 0 && <option disabled>── パートナー ──</option>}
                {crmPartners.map((p) => (
                  <option key={p.id} value={`partner:${p.id}`}>{p.name}</option>
                ))}
              </select>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full" onClick={() => setShowContactSelect(false)}>キャンセル</Button>
            </div>
          )}
          {relatedContacts.length === 0 && relatedPartners.length === 0 ? (
            <p className="text-xs text-muted-foreground">なし</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {relatedContacts.map((c) => (
                <Badge
                  key={c.id}
                  variant="secondary"
                  className="text-xs group/badge cursor-pointer"
                  onClick={() => window.open(`/crm/contacts/${c.id}`, "_blank")}
                >
                  {c.name}{c.role && <span className="text-[10px] text-muted-foreground ml-1">({c.role})</span>}
                  <button
                    className="ml-1 opacity-0 group-hover/badge:opacity-100 text-muted-foreground hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (c.source === "direct") {
                        const nextDirectIds = relatedContacts.filter((rc) => rc.source === "direct" && rc.id !== c.id).map((rc) => rc.id)
                        update({ contactIds: nextDirectIds })
                      } else {
                        const nextPartners = relatedPartners.filter((p) => p.id !== c.id)
                        setRelatedPartners(nextPartners)
                        update({ partnerIds: nextPartners.map((p) => p.id) })
                      }
                      setRelatedContacts(relatedContacts.filter((rc) => rc.id !== c.id))
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {relatedPartners.map((p) => (
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

        {biz.accountNames.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">紐づき口座</p>
            <div className="flex flex-wrap gap-1">
              {biz.accountNames.map((a) => <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)}
            </div>
          </div>
        )}

        <Separator />

        {/* 添付ファイル・URL */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-muted-foreground">
              <Paperclip className="w-3 h-3 inline mr-1" />添付 ({attachments.length})
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
              <Input placeholder="https://..." className="h-7 text-xs" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddUrl() }} />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowUrlInput(false)}>キャンセル</Button>
                <Button size="sm" className="h-6 text-[10px]" onClick={handleAddUrl} disabled={!newUrlName.trim() || !newUrl.trim()}>追加</Button>
              </div>
            </div>
          )}
          {attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground">なし</p>
          ) : (
            <div className="space-y-1">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30 group">
                  {att.type === "file" ? <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate flex-1 hover:text-blue-600 hover:underline cursor-pointer">{att.name}</a>
                  <button onClick={() => removeAttachment(att.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* 配下プロジェクト */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-2">配下プロジェクト ({bizProjects.length})</p>
          {bizProjects.map((p) => {
            return (
              <div key={p.id} className="text-xs p-2 rounded-md border bg-muted/20 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot[p.status]}`} />
                  <span className="font-medium truncate">{p.name}</span>
                </div>
                {p.assignees.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.assignees.map(a => a.name).join(", ")}</p>
                )}
              </div>
            )
          })}
        </div>

        <Separator />
        <div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => {
              if (!confirm(`「${biz.name}」を削除してよろしいですか？\n配下のプロジェクト・タスク・課題は残りますが、事業一覧には表示されなくなります。`)) return
              deleteBusinessMutation.mutate(biz.id)
              onClose()
            }}
          >
            事業を削除
          </Button>
        </div>
      </div>
    </div>
  )
}

// ===== 事業パネル2: タスク一覧 =====

function BusinessTasksPanel({ biz, projects, tasks }: { biz: Business; projects: ProjectDTO[]; tasks: BusinessTaskDTO[] }) {
  const bizProjectIds = projects.filter((p) => p.businessId === biz.id).map((p) => p.id)
  const activeTasks = tasks.filter((t) => {
    if (t.status === "done") return false
    // 事業直下タスク（projectIdなし）は businessId で判定、プロジェクト配下は projectId で判定
    if (t.projectId) return bizProjectIds.includes(t.projectId)
    return t.businessId === biz.id
  })

  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newAssigneeId, setNewAssigneeId] = useState("")
  const createTaskMutation = useCreateBusinessTask()
  const { data: employees = [] } = useEmployees()
  const { data: session } = useSession()
  const currentUserName = session?.user?.name ?? "野田"

  const handleAdd = () => {
    if (!newTitle.trim()) return
    createTaskMutation.mutate({
      businessId: biz.id,
      projectId: null,
      title: newTitle.trim(),
      status: "todo",
      priority: "medium",
      createdBy: currentUserName,
      assigneeId: newAssigneeId || null,
      assigneeIds: newAssigneeId ? [newAssigneeId] : [],
    })
    setNewTitle("")
    setNewAssigneeId("")
    setShowAdd(false)
  }

  return (
    <div className="w-[280px] border-l bg-card h-full flex flex-col shrink-0">
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
        <p className="text-sm font-bold">タスク ({activeTasks.length})</p>
        <Button size="sm" className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />追加
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {showAdd && (
          <div className="mb-2 p-2 rounded border bg-muted/30 space-y-1">
            <Input placeholder="タスク名（事業直下）" className="h-7 text-xs" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAdd() }} />
            <select className="w-full h-7 text-xs border rounded px-2 bg-background" value={newAssigneeId} onChange={(e) => setNewAssigneeId(e.target.value)}>
              <option value="">担当者（未設定）</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] cursor-pointer" onClick={() => { setShowAdd(false); setNewTitle(""); setNewAssigneeId("") }}>キャンセル</Button>
              <Button size="sm" className="h-6 text-[10px] cursor-pointer" onClick={handleAdd} disabled={!newTitle.trim()}>追加</Button>
            </div>
          </div>
        )}
        {activeTasks.length === 0 && !showAdd ? (
          <p className="text-xs text-muted-foreground">タスクなし</p>
        ) : (
          <div className="space-y-1.5">
            {activeTasks.map((t) => {
              const tst = TASK_STATUS_CONFIG[t.status]
              return (
                <div key={t.id} className="text-xs p-2 rounded-md border bg-card">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 shrink-0 font-semibold ${tst.className}`}>{tst.label}</Badge>
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

// ===== 事業パネル3: 課題一覧 =====

function BusinessIssuesPanel({ biz, projects, issues }: { biz: Business; projects: ProjectDTO[]; issues: BusinessIssueDTO[] }) {
  const bizProjectIds = projects.filter((p) => p.businessId === biz.id).map((p) => p.id)
  const activeIssues = issues.filter((i) => bizProjectIds.includes(i.projectId) && i.status !== "resolved")

  return (
    <div className="w-[280px] border-l bg-card h-full flex flex-col shrink-0">
      <div className="px-4 py-3 border-b shrink-0">
        <p className="text-sm font-bold">課題 ({activeIssues.length})</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {activeIssues.length === 0 ? (
          <p className="text-xs text-muted-foreground">課題なし</p>
        ) : (
          <div className="space-y-1.5">
            {activeIssues.map((issue) => {
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
