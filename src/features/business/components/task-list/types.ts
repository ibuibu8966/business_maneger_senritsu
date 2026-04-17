/**
 * task-list-view 関連の型定義
 */

export type BizInfo = {
  id: string
  name: string
  purpose: string
  status: "active" | "on-hold" | "completed"
  priority: "highest" | "high" | "medium" | "low"
  assignees: { id: string; name: string }[]
  revenue: number
  expense: number
  accountNames: string[]
  partnerNames: string[]
  contractMemo: string
  relatedContacts: { id: string; name: string; role: string }[]
  attachments: { id: string; name: string; url: string; type: string }[]
}

export type IssueInfo = {
  id: string
  projectId: string
  title: string
  status: import("../mock-data").IssueStatus
  priority: "highest" | "high" | "medium" | "low"
  assigneeName: string | null
  deadline: string | null
}
