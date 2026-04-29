/**
 * Business系APIのZodバリデーションスキーマ
 * Controller から分離して責務を明確化
 */
import { z } from "zod"

// ========== Zod スキーマ ==========

export const createBusinessSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  status: z.enum(["active", "on-hold", "completed"]).optional(),
  priority: z.enum(["highest", "high", "medium", "low"]).optional(),
  assigneeIds: z.array(z.string()).optional(),
  contractMemo: z.string().optional(),
  attachments: z.array(z.object({ id: z.string(), name: z.string(), url: z.string(), type: z.string() })).optional(),
})

export const updateBusinessSchema = z.object({
  name: z.string().optional(),
  purpose: z.string().optional(),
  revenue: z.number().int().optional(),
  expense: z.number().int().optional(),
  status: z.enum(["active", "on-hold", "completed"]).optional(),
  priority: z.enum(["highest", "high", "medium", "low"]).optional(),
  assigneeIds: z.array(z.string()).optional(),
  partnerIds: z.array(z.string()).optional(),
  contactIds: z.array(z.string()).optional(),
  contractMemo: z.string().optional(),
  attachments: z.array(z.object({ id: z.string(), name: z.string(), url: z.string(), type: z.string() })).optional(),
})

export const createProjectSchema = z.object({
  businessId: z.string(),
  parentId: z.string().nullable().optional(),
  name: z.string().min(1),
  purpose: z.string().optional(),
  deadline: z.string().nullable().optional(),
  revenue: z.number().int().optional(),
  expense: z.number().int().optional(),
  status: z.enum(["active", "on-hold", "completed"]).optional(),
  priority: z.enum(["highest", "high", "medium", "low"]).optional(),
  assigneeIds: z.array(z.string()).optional(),
  partnerIds: z.array(z.string()).optional(),
  contactIds: z.array(z.string()).optional(),
  contractMemo: z.string().optional(),
  attachments: z.array(z.object({ id: z.string(), name: z.string(), url: z.string(), type: z.string() })).optional(),
  accountNames: z.array(z.string()).optional(),
  partnerNames: z.array(z.string()).optional(),
})

export const createTaskSchema = z.object({
  projectId: z.string().nullable().optional(),
  businessId: z.string().nullable().optional(),
  title: z.string().min(1),
  detail: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  deadline: z.string().nullable().optional(),
  status: z.enum(["todo", "in-progress", "waiting", "done"]).optional(),
  memo: z.string().optional(),
  attachments: z.array(z.object({ id: z.string(), name: z.string(), url: z.string(), type: z.string() })).optional(),
  recurring: z.boolean().optional(),
  recurringPattern: z.enum(["daily", "weekly", "monthly_date", "monthly_weekday"]).nullable().optional(),
  recurringDay: z.number().int().nullable().optional(),
  recurringDays: z.array(z.number().int()).optional(),
  recurringWeek: z.number().int().nullable().optional(),
  recurringEndDate: z.string().nullable().optional(),
  createdBy: z.string().optional(),
  sortOrder: z.number().int().optional(),
  todayFlag: z.boolean().optional(),
  executionTime: z.string().nullable().optional(), // "HH:MM"
  notifyEnabled: z.boolean().optional(),
  notifyMinutesBefore: z.number().int().optional(), // 0/5/10/15/30/60
  issueId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  partnerId: z.string().nullable().optional(),
  tool: z.enum(["LINE", "TELEGRAM", "DISCORD", "PHONE", "ZOOM", "IN_PERSON"]).nullable().optional(),
  priority: z.enum(["highest", "high", "medium", "low"]).optional(),
})

export const createIssueSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  detail: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
  deadline: z.string().nullable().optional(),
  priority: z.enum(["highest", "high", "medium", "low"]).optional(),
  status: z.enum(["unresolved", "in-progress", "resolved"]).optional(),
})

export const addNoteSchema = z.object({
  date: z.string(),
  content: z.string().min(1),
  author: z.string().optional(),
})

export const createMemoSchema = z.object({
  businessId: z.string().optional(),
  projectId: z.string().optional(),
  issueId: z.string().optional(),
  date: z.string(),
  content: z.string().min(1),
  author: z.string().optional(),
})

export const reorderSchema = z.object({
  taskIds: z.array(z.string()).min(1),
  employeeId: z.string().optional(),
})

// ===== Zod: チェックリスト =====

export const addChecklistItemSchema = z.object({
  title: z.string().min(1),
  sortOrder: z.number().int().optional(),
})

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1).optional(),
  checked: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const createChecklistTemplateSchema = z.object({
  name: z.string().min(1),
  businessId: z.string().optional(),
  items: z.array(z.object({ title: z.string().min(1), sortOrder: z.number().int() })),
})

export const applyChecklistTemplateSchema = z.object({
  templateId: z.string().min(1),
})
