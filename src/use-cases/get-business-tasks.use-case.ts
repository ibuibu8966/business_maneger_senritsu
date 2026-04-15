import { BusinessTaskRepository } from "@/repositories/business-task.repository"

const TASK_STATUS_MAP: Record<string, string> = { TODO: "todo", IN_PROGRESS: "in-progress", WAITING: "waiting", DONE: "done" }
const STATUS_MAP: Record<string, string> = { ACTIVE: "active", ON_HOLD: "on-hold", COMPLETED: "completed" }
const PRIORITY_MAP: Record<string, string> = { HIGHEST: "highest", HIGH: "high", MEDIUM: "medium", LOW: "low" }

export class GetBusinessTasks {
  static async execute(params?: { projectId?: string; assigneeId?: string; status?: string; contactId?: string; issueId?: string }) {
    const tasks = await BusinessTaskRepository.findMany(params)
    return tasks.map((t: any) => ({
      id: t.id,
      projectId: t.projectId,
      projectName: t.project?.name ?? "",
      title: t.title,
      detail: t.detail,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee?.name ?? null,
      deadline: t.deadline ? t.deadline.toISOString().split("T")[0] : null,
      status: TASK_STATUS_MAP[t.status] ?? "todo",
      memo: t.memo,
      contactId: t.contactId ?? null,
      contactName: t.contact?.name ?? null,
      partnerId: t.partnerId ?? null,
      partnerName: t.partner?.name ?? null,
      tool: t.tool ?? null,
      priority: PRIORITY_MAP[t.priority] ?? "medium",
      recurring: t.recurring,
      recurringPattern: t.recurringPattern ?? null,
      recurringDay: t.recurringDay ?? null,
      recurringWeek: t.recurringWeek ?? null,
      recurringEndDate: t.recurringEndDate ? t.recurringEndDate.toISOString().split("T")[0] : null,
      lastGeneratedAt: t.lastGeneratedAt ? t.lastGeneratedAt.toISOString() : null,
      createdBy: t.createdBy,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt.toISOString(),
      // 今日やるフラグ
      todayFlag: t.todayFlag ?? false,
      todayFlaggedAt: t.todayFlaggedAt ? t.todayFlaggedAt.toISOString() : null,
      // 実行時刻
      executionTime: t.executionTime ?? null,
      // 通知設定
      notifyEnabled: t.notifyEnabled ?? true,
      notifyMinutesBefore: t.notifyMinutesBefore ?? 10,
      // プロジェクト情報
      projectPurpose: t.project?.purpose ?? "",
      projectDeadline: t.project?.deadline ? t.project.deadline.toISOString().split("T")[0] : null,
      projectRevenue: t.project?.revenue ?? 0,
      projectExpense: t.project?.expense ?? 0,
      projectStatus: STATUS_MAP[t.project?.status] ?? "active",
      projectPriority: PRIORITY_MAP[t.project?.priority] ?? "medium",
      projectAssigneeName: (t.project?.assignees ?? []).map((a: any) => a.employee?.name).filter(Boolean).join(", ") || null,
      projectContractMemo: t.project?.contractMemo ?? "",
      projectAccountNames: t.project?.accountNames ?? [],
      projectPartnerNames: t.project?.partnerNames ?? [],
      // 事業情報
      businessId: t.project?.business?.id ?? "",
      businessName: t.project?.business?.name ?? "",
      businessPurpose: t.project?.business?.purpose ?? "",
      businessStatus: STATUS_MAP[t.project?.business?.status] ?? "active",
      businessPriority: PRIORITY_MAP[t.project?.business?.priority] ?? "medium",
      // 課題紐づけ
      issueId: t.issueId ?? null,
      issueTitle: t.issue?.title ?? null,
      issueStatus: t.issue?.status ? (({ UNRESOLVED: "unresolved", IN_PROGRESS: "in-progress", RESOLVED: "resolved" } as Record<string, string>)[t.issue.status] ?? null) : null,
      // チェックリスト
      checklistItems: (t.checklistItems ?? []).map((ci: any) => ({
        id: ci.id,
        title: ci.title,
        checked: ci.checked,
        sortOrder: ci.sortOrder,
      })),
    }))
  }
}
