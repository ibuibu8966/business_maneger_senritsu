import { BusinessIssueRepository } from "@/repositories/business-issue.repository"

const ISSUE_STATUS_MAP: Record<string, string> = { UNRESOLVED: "unresolved", IN_PROGRESS: "in-progress", RESOLVED: "resolved" }
const PRIORITY_MAP: Record<string, string> = { HIGHEST: "highest", HIGH: "high", MEDIUM: "medium", LOW: "low" }

export class GetBusinessIssues {
  static async execute(params?: { projectId?: string; assigneeId?: string; status?: string; priority?: string }) {
    const issues = await BusinessIssueRepository.findMany(params)
    return issues.map((i) => ({
      id: i.id,
      seqNumber: i.seqNumber ?? null,
      projectId: i.projectId,
      projectName: i.project?.name ?? null,
      title: i.title,
      detail: i.detail,
      assigneeId: i.assigneeId,
      assigneeName: i.assignee?.name ?? null,
      createdBy: i.createdBy,
      deadline: i.deadline ? i.deadline.toISOString().split("T")[0] : null,
      priority: PRIORITY_MAP[i.priority] ?? "medium",
      status: ISSUE_STATUS_MAP[i.status] ?? "unresolved",
      progressNotes: i.progressNotes.map((n) => ({
        id: n.id,
        issueId: n.issueId,
        date: n.date.toISOString().split("T")[0],
        content: n.content,
        author: n.author,
        createdAt: n.createdAt.toISOString(),
      })),
      createdAt: i.createdAt.toISOString(),
    }))
  }
}
