import { BusinessTaskRepository } from "@/server/repositories/business-task.repository"
import type { BusinessTaskStatus } from "@/generated/prisma/client"

const TASK_STATUS_MAP: Record<string, string> = { TODO: "todo", IN_PROGRESS: "in-progress", WAITING: "waiting", DONE: "done" }
const STATUS_MAP: Record<string, string> = { ACTIVE: "active", ON_HOLD: "on-hold", COMPLETED: "completed" }
const PRIORITY_MAP: Record<string, string> = { HIGHEST: "highest", HIGH: "high", MEDIUM: "medium", LOW: "low" }

export class GetBusinessTasks {
  static async execute(params?: { projectId?: string; businessId?: string; assigneeId?: string; status?: BusinessTaskStatus; contactId?: string; issueId?: string }) {
    const tasks = await BusinessTaskRepository.findMany(params)
    return tasks.map((t: any) => ({
      id: t.id,
      seqNumber: t.seqNumber ?? null,
      projectId: t.projectId ?? null,
      projectName: t.project?.name ?? "",
      title: t.title,
      detail: t.detail,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee?.name ?? null,
      assigneeIds: (t.assignees ?? []).map((a: any) => a.employeeId),
      assigneeNames: (t.assignees ?? []).map((a: any) => a.employee?.name).filter(Boolean),
      deadline: t.deadline ? t.deadline.toISOString().split("T")[0] : null,
      status: TASK_STATUS_MAP[t.status] ?? "todo",
      memo: t.memo,
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
      contactId: t.contactId ?? null,
      contactName: t.contact?.name ?? null,
      partnerId: t.partnerId ?? null,
      partnerName: t.partner?.name ?? null,
      tool: t.tool ?? null,
      priority: PRIORITY_MAP[t.priority] ?? "medium",
      recurring: t.recurring,
      recurringPattern: t.recurringPattern ?? null,
      recurringDay: t.recurringDay ?? null,
      recurringDays: t.recurringDays ?? [],
      recurringWeek: t.recurringWeek ?? null,
      recurringEndDate: t.recurringEndDate ? t.recurringEndDate.toISOString().split("T")[0] : null,
      lastGeneratedAt: t.lastGeneratedAt ? t.lastGeneratedAt.toISOString() : null,
      nextScheduledAt: t.nextScheduledAt ? t.nextScheduledAt.toISOString().split("T")[0] : null,
      parentTaskId: t.parentTaskId ?? null,
      createdBy: t.createdBy,
      sortOrder: t.sortOrder,
      userSortOrders: Object.fromEntries(
        ((t.userSortOrders ?? []) as { employeeId: string; sortOrder: number }[]).map((u) => [u.employeeId, u.sortOrder])
      ) as Record<string, number>,
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
      // 事業情報（事業直下タスクは t.business 優先、プロジェクト経由は t.project.business）
      businessId: t.business?.id ?? t.project?.business?.id ?? "",
      businessName: t.business?.name ?? t.project?.business?.name ?? "",
      businessPurpose: t.business?.purpose ?? t.project?.business?.purpose ?? "",
      businessStatus: STATUS_MAP[t.business?.status ?? t.project?.business?.status] ?? "active",
      businessPriority: PRIORITY_MAP[t.business?.priority ?? t.project?.business?.priority] ?? "medium",
      // スケジュール紐づけ
      scheduleEvents: (t.scheduleEvents ?? []).map((se: any) => ({
        id: se.id,
        title: se.title,
        startAt: se.startAt instanceof Date ? se.startAt.toISOString() : se.startAt,
        endAt: se.endAt instanceof Date ? se.endAt.toISOString() : se.endAt,
        allDay: se.allDay,
        googleEventId: se.googleEventId ?? null,
      })),
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
