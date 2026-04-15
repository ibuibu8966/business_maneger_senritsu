// ===== 型定義 =====

export type Priority = "highest" | "high" | "medium" | "low"
export type IssueStatus = "unresolved" | "in-progress" | "resolved"
export type TaskStatus = "todo" | "in-progress" | "waiting" | "done"
export type TicketTool = "LINE" | "TELEGRAM" | "DISCORD" | "PHONE" | "ZOOM" | "IN_PERSON"

export const PRIORITY_CONFIG: Record<Priority, { label: string; className: string; bgClassName: string }> = {
  highest: { label: "最高", className: "text-red-600 font-bold", bgClassName: "bg-red-100 text-red-800" },
  high: { label: "高", className: "text-orange-600 font-semibold", bgClassName: "bg-orange-100 text-orange-800" },
  medium: { label: "中", className: "text-yellow-600", bgClassName: "bg-yellow-100 text-yellow-800" },
  low: { label: "低", className: "text-blue-600", bgClassName: "bg-blue-100 text-blue-800" },
}

export const ISSUE_STATUS_CONFIG: Record<IssueStatus, { label: string; className: string }> = {
  unresolved: { label: "未対応", className: "border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300" },
  "in-progress": { label: "対応中", className: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  resolved: { label: "対応済み", className: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; variant: "default" | "secondary" | "outline"; className: string }> = {
  todo: { label: "未着手", variant: "outline", className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600" },
  "in-progress": { label: "進行中", variant: "default", className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700" },
  waiting: { label: "待ち", variant: "outline", className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  done: { label: "完了", variant: "secondary", className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" },
}

export const TOOL_CONFIG: Record<TicketTool, { label: string; emoji: string }> = {
  LINE: { label: "LINE", emoji: "💬" },
  TELEGRAM: { label: "Telegram", emoji: "✈️" },
  DISCORD: { label: "Discord", emoji: "🎮" },
  PHONE: { label: "電話", emoji: "📞" },
  ZOOM: { label: "Zoom", emoji: "🎥" },
  IN_PERSON: { label: "対面", emoji: "🤝" },
}

export interface RelatedContact {
  id: string
  name: string
  role: string  // "取引先" | "顧客" | "パートナー" etc.
  source: "partner" | "direct"
}

export interface RelatedPartner {
  id: string
  name: string
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: "file" | "url"
}

export interface Business {
  id: string
  name: string
  purpose: string
  revenue: number
  expense: number
  status: "active" | "on-hold" | "completed"
  priority: Priority
  assigneeIds: string[]
  assignees: { id: string; name: string }[]
  accountNames: string[]
  partnerNames: string[]
  contractMemo: string
  contactIds?: string[]
  partnerIds?: string[]
  relatedPartners: RelatedPartner[]
  relatedContacts: RelatedContact[]
  attachments: Attachment[]
}

export interface ProjectNode {
  id: string
  businessId: string
  parentId: string | null  // null = 直下プロジェクト, string = サブプロジェクト
  name: string
  purpose: string
  deadline: string | null
  revenue: number
  expense: number
  status: "active" | "on-hold" | "completed"
  priority: Priority
  assigneeIds: string[]
  assignees: { id: string; name: string }[]
  accountNames: string[]
  partnerNames: string[]
  contractMemo: string
  contactIds?: string[]
  partnerIds?: string[]
  relatedPartners: RelatedPartner[]
  relatedContacts: RelatedContact[]
  attachments: Attachment[]
}

export interface ChecklistItem {
  id: string
  title: string
  checked: boolean
  sortOrder: number
}

export interface TaskItem {
  id: string
  projectId: string
  projectName: string
  title: string
  detail: string
  assigneeId: string | null
  assigneeName: string | null
  deadline: string | null
  status: TaskStatus
  memo: string
  contactId: string | null
  contactName: string | null
  partnerId: string | null
  partnerName: string | null
  tool: TicketTool | null
  priority: Priority
  recurring: boolean
  recurringPattern: string | null
  recurringDay: number | null
  recurringWeek: number | null
  recurringEndDate: string | null
  createdBy: string
  sortOrder: number
  createdAt: string
  // 今日やるフラグ
  todayFlag: boolean
  todayFlaggedAt: string | null
  // 実行時刻（"HH:MM"）
  executionTime: string | null
  // 通知設定
  notifyEnabled: boolean
  notifyMinutesBefore: number
  // プロジェクト情報
  projectPurpose: string
  projectDeadline: string | null
  projectRevenue: number
  projectExpense: number
  projectStatus: "active" | "on-hold" | "completed"
  projectPriority: Priority
  projectAssigneeName: string | null
  projectContractMemo: string
  projectAccountNames: string[]
  projectPartnerNames: string[]
  // 事業情報
  businessId: string
  businessName: string
  businessPurpose: string
  businessStatus: "active" | "on-hold" | "completed"
  businessPriority: Priority
  // 課題紐づけ
  issueId: string | null
  issueTitle: string | null
  issueStatus: IssueStatus | null
  // チェックリスト
  checklistItems: ChecklistItem[]
}

export interface ProgressNote {
  id: string
  date: string
  content: string
  author: string
}

export interface IssueItem {
  id: string
  projectId: string
  projectName: string
  title: string
  detail: string
  assigneeId: string | null
  assigneeName: string | null
  createdBy: string
  deadline: string | null
  priority: Priority
  status: IssueStatus
  createdAt: string
  progressNotes: ProgressNote[]
}

export interface Staff {
  id: string
  name: string
}

// ===== ヘルパー: プロジェクトをツリー構造に変換 =====

export interface ProjectTreeNode extends ProjectNode {
  children: ProjectTreeNode[]
}

export function buildProjectTree(projects: ProjectNode[], parentId: string | null = null): ProjectTreeNode[] {
  return projects
    .filter((p) => p.parentId === parentId)
    .map((p) => ({
      ...p,
      children: buildProjectTree(projects, p.id),
    }))
}
