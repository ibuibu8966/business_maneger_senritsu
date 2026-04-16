import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { GetBusinessDetails } from "@/use-cases/get-business-details.use-case"
import { CreateBusiness } from "@/use-cases/create-business.use-case"
import { UpdateBusinessDetail } from "@/use-cases/update-business-detail.use-case"
import { DeleteBusiness } from "@/use-cases/delete-business.use-case"
import { GetProjects } from "@/use-cases/get-projects.use-case"
import { CreateProject } from "@/use-cases/create-project.use-case"
import { UpdateProject } from "@/use-cases/update-project.use-case"
import { DeleteProject } from "@/use-cases/delete-project.use-case"
import { GetBusinessTasks } from "@/use-cases/get-business-tasks.use-case"
import { CreateBusinessTask } from "@/use-cases/create-business-task.use-case"
import { UpdateBusinessTask } from "@/use-cases/update-business-task.use-case"
import { DeleteBusinessTask } from "@/use-cases/delete-business-task.use-case"
import { ReorderBusinessTasks } from "@/use-cases/reorder-business-tasks.use-case"
import { GetBusinessIssues } from "@/use-cases/get-business-issues.use-case"
import { CreateBusinessIssue } from "@/use-cases/create-business-issue.use-case"
import { UpdateBusinessIssue } from "@/use-cases/update-business-issue.use-case"
import { DeleteBusinessIssue } from "@/use-cases/delete-business-issue.use-case"
import { AddIssueNote } from "@/use-cases/add-issue-note.use-case"
import { GetBusinessMemos } from "@/use-cases/get-business-memos.use-case"
import { CreateBusinessMemo } from "@/use-cases/create-business-memo.use-case"
import { DeleteBusinessMemo } from "@/use-cases/delete-business-memo.use-case"
import { AddTaskChecklistItem } from "@/use-cases/add-task-checklist-item.use-case"
import { UpdateTaskChecklistItem } from "@/use-cases/update-task-checklist-item.use-case"
import { DeleteTaskChecklistItem } from "@/use-cases/delete-task-checklist-item.use-case"
import { GetChecklistTemplates } from "@/use-cases/get-checklist-templates.use-case"
import { CreateChecklistTemplate } from "@/use-cases/create-checklist-template.use-case"
import { DeleteChecklistTemplate } from "@/use-cases/delete-checklist-template.use-case"
import { UpdateChecklistTemplate } from "@/use-cases/update-checklist-template.use-case"
import { ApplyChecklistTemplate } from "@/use-cases/apply-checklist-template.use-case"

// ========== Zod スキーマ ==========

const createBusinessSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  status: z.enum(["active", "on-hold", "completed"]).optional(),
  priority: z.enum(["highest", "high", "medium", "low"]).optional(),
  assigneeIds: z.array(z.string()).optional(),
  contractMemo: z.string().optional(),
  attachments: z.array(z.object({ id: z.string(), name: z.string(), url: z.string(), type: z.string() })).optional(),
})

const updateBusinessSchema = z.object({
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

const createProjectSchema = z.object({
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

const updateProjectSchema = createProjectSchema.partial()

const createTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  detail: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  status: z.enum(["todo", "in-progress", "done"]).optional(),
  memo: z.string().optional(),
  recurring: z.boolean().optional(),
  recurringPattern: z.enum(["daily", "weekly", "monthly_date", "monthly_weekday"]).nullable().optional(),
  recurringDay: z.number().int().nullable().optional(),
  recurringWeek: z.number().int().nullable().optional(),
  recurringEndDate: z.string().nullable().optional(),
  createdBy: z.string().optional(),
  sortOrder: z.number().int().optional(),
  todayFlag: z.boolean().optional(),
  executionTime: z.string().nullable().optional(), // "HH:MM"
  notifyEnabled: z.boolean().optional(),
  notifyMinutesBefore: z.number().int().optional(), // 0/5/10/15/30/60
  issueId: z.string().nullable().optional(),
})

const updateTaskSchema = createTaskSchema.partial()

const createIssueSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  detail: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  createdBy: z.string().optional(),
  deadline: z.string().nullable().optional(),
  priority: z.enum(["highest", "high", "medium", "low"]).optional(),
  status: z.enum(["unresolved", "in-progress", "resolved"]).optional(),
})

const updateIssueSchema = createIssueSchema.partial()

const addNoteSchema = z.object({
  date: z.string(),
  content: z.string().min(1),
  author: z.string().optional(),
})

const createMemoSchema = z.object({
  businessId: z.string().optional(),
  projectId: z.string().optional(),
  issueId: z.string().optional(),
  date: z.string(),
  content: z.string().min(1),
  author: z.string().optional(),
})

const reorderSchema = z.object({
  taskId: z.string(),
  newSortOrder: z.number().int(),
})

// ===== BusinessController =====
export class BusinessController {
  static async list(_req: NextRequest) {
    try {
      const data = await GetBusinessDetails.execute()
      return NextResponse.json(data)
    } catch (e) {
      logger.error("事業一覧の取得に失敗しました", e)
      return NextResponse.json({ error: "事業一覧の取得に失敗しました" }, { status: 500 })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createBusinessSchema.parse(body)
      const r = await CreateBusiness.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("事業の作成に失敗しました", e)
      return NextResponse.json({ error: "事業の作成に失敗しました" }, { status: 500 })
    }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
      const data = await GetBusinessDetails.executeOne(id)
      if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json(data)
    } catch (e) {
      logger.error("事業詳細の取得に失敗しました", e)
      return NextResponse.json({ error: "事業詳細の取得に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateBusinessSchema.parse(body)
      const r = await UpdateBusinessDetail.execute(id, data)
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("事業の更新に失敗しました", e)
      return NextResponse.json({ error: "事業の更新に失敗しました" }, { status: 500 })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteBusiness.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error("事業の削除に失敗しました", e)
      return NextResponse.json({ error: "事業の削除に失敗しました" }, { status: 500 })
    }
  }
}

// ===== ProjectController =====
export class ProjectController {
  static async list(req: NextRequest) {
    try {
      const url = new URL(req.url)
      const businessId = url.searchParams.get("businessId") ?? undefined
      const data = await GetProjects.execute({ businessId })
      return NextResponse.json(data)
    } catch (e) {
      logger.error("プロジェクト一覧の取得に失敗しました", e)
      return NextResponse.json({ error: "プロジェクト一覧の取得に失敗しました" }, { status: 500 })
    }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
      const data = await GetProjects.executeOne(id)
      if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json(data)
    } catch (e) {
      logger.error("プロジェクト詳細の取得に失敗しました", e)
      return NextResponse.json({ error: "プロジェクト詳細の取得に失敗しました" }, { status: 500 })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createProjectSchema.parse(body)
      const r = await CreateProject.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("プロジェクトの作成に失敗しました", e)
      return NextResponse.json({ error: "プロジェクトの作成に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateProjectSchema.parse(body)
      const r = await UpdateProject.execute(id, data)
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("プロジェクトの更新に失敗しました", e)
      return NextResponse.json({ error: "プロジェクトの更新に失敗しました" }, { status: 500 })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteProject.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error("プロジェクトの削除に失敗しました", e)
      return NextResponse.json({ error: "プロジェクトの削除に失敗しました" }, { status: 500 })
    }
  }
}

// ===== BusinessTaskController =====
export class BusinessTaskController {
  static async list(req: NextRequest) {
    try {
      const url = new URL(req.url)
      const projectId = url.searchParams.get("projectId") ?? undefined
      const assigneeId = url.searchParams.get("assigneeId") ?? undefined
      const contactId = url.searchParams.get("contactId") ?? undefined
      const issueId = url.searchParams.get("issueId") ?? undefined
      const data = await GetBusinessTasks.execute({ projectId, assigneeId, contactId, issueId })
      return NextResponse.json(data)
    } catch (e) {
      logger.error("タスク一覧の取得に失敗しました", e)
      return NextResponse.json({ error: "タスク一覧の取得に失敗しました" }, { status: 500 })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createTaskSchema.parse(body)
      const r = await CreateBusinessTask.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("タスクの作成に失敗しました", e)
      return NextResponse.json({ error: "タスクの作成に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateTaskSchema.parse(body)
      const r = await UpdateBusinessTask.execute(id, data)
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("タスクの更新に失敗しました", e)
      return NextResponse.json({ error: "タスクの更新に失敗しました" }, { status: 500 })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteBusinessTask.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error("タスクの削除に失敗しました", e)
      return NextResponse.json({ error: "タスクの削除に失敗しました" }, { status: 500 })
    }
  }

  static async reorder(req: NextRequest) {
    try {
      const body = await req.json()
      const data = reorderSchema.parse(body)
      const r = await ReorderBusinessTasks.execute(data.taskId, data.newSortOrder)
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("タスクの並び替えに失敗しました", e)
      return NextResponse.json({ error: "タスクの並び替えに失敗しました" }, { status: 500 })
    }
  }
}

// ===== BusinessIssueController =====
export class BusinessIssueController {
  static async list(req: NextRequest) {
    try {
      const url = new URL(req.url)
      const projectId = url.searchParams.get("projectId") ?? undefined
      const status = url.searchParams.get("status") ?? undefined
      const priority = url.searchParams.get("priority") ?? undefined
      const data = await GetBusinessIssues.execute({ projectId, status, priority })
      return NextResponse.json(data)
    } catch (e) {
      logger.error("課題一覧の取得に失敗しました", e)
      return NextResponse.json({ error: "課題一覧の取得に失敗しました" }, { status: 500 })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createIssueSchema.parse(body)
      const r = await CreateBusinessIssue.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("課題の作成に失敗しました", e)
      return NextResponse.json({ error: "課題の作成に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateIssueSchema.parse(body)
      const r = await UpdateBusinessIssue.execute(id, data)
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("課題の更新に失敗しました", e)
      return NextResponse.json({ error: "課題の更新に失敗しました" }, { status: 500 })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteBusinessIssue.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error("課題の削除に失敗しました", e)
      return NextResponse.json({ error: "課題の削除に失敗しました" }, { status: 500 })
    }
  }

  static async addNote(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = addNoteSchema.parse(body)
      const r = await AddIssueNote.execute({ issueId: id, ...data })
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("メモの追加に失敗しました", e)
      return NextResponse.json({ error: "メモの追加に失敗しました" }, { status: 500 })
    }
  }
}

// ===== BusinessMemoController =====
export class BusinessMemoController {
  static async list(req: NextRequest) {
    try {
      const url = new URL(req.url)
      const businessId = url.searchParams.get("businessId") ?? undefined
      const projectId = url.searchParams.get("projectId") ?? undefined
      const issueId = url.searchParams.get("issueId") ?? undefined
      const data = await GetBusinessMemos.execute({ businessId, projectId, issueId })
      return NextResponse.json(data)
    } catch (e) {
      logger.error("メモ一覧の取得に失敗しました", e)
      return NextResponse.json({ error: "メモ一覧の取得に失敗しました" }, { status: 500 })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createMemoSchema.parse(body)
      const r = await CreateBusinessMemo.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("メモの作成に失敗しました", e)
      return NextResponse.json({ error: "メモの作成に失敗しました" }, { status: 500 })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteBusinessMemo.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error("メモの削除に失敗しました", e)
      return NextResponse.json({ error: "メモの削除に失敗しました" }, { status: 500 })
    }
  }
}

// ===== Zod: チェックリスト =====

const addChecklistItemSchema = z.object({
  title: z.string().min(1),
  sortOrder: z.number().int().optional(),
})

const updateChecklistItemSchema = z.object({
  title: z.string().min(1).optional(),
  checked: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

const createChecklistTemplateSchema = z.object({
  name: z.string().min(1),
  businessId: z.string().optional(),
  items: z.array(z.object({ title: z.string().min(1), sortOrder: z.number().int() })),
})

const applyChecklistTemplateSchema = z.object({
  templateId: z.string().min(1),
})

// ===== TaskChecklistController =====
export class TaskChecklistController {
  static async addItem(req: NextRequest, taskId: string) {
    try {
      const body = await req.json()
      const data = addChecklistItemSchema.parse(body)
      const r = await AddTaskChecklistItem.execute({ taskId, ...data })
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("チェックリスト項目の追加に失敗しました", e)
      return NextResponse.json({ error: "チェックリスト項目の追加に失敗しました" }, { status: 500 })
    }
  }

  static async updateItem(_req: NextRequest, itemId: string) {
    try {
      const body = await _req.json()
      const data = updateChecklistItemSchema.parse(body)
      const r = await UpdateTaskChecklistItem.execute(itemId, data)
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("チェックリスト項目の更新に失敗しました", e)
      return NextResponse.json({ error: "チェックリスト項目の更新に失敗しました" }, { status: 500 })
    }
  }

  static async deleteItem(_req: NextRequest, itemId: string) {
    try {
      await DeleteTaskChecklistItem.execute(itemId)
      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error("チェックリスト項目の削除に失敗しました", e)
      return NextResponse.json({ error: "チェックリスト項目の削除に失敗しました" }, { status: 500 })
    }
  }

  static async applyTemplate(req: NextRequest, taskId: string) {
    try {
      const body = await req.json()
      const data = applyChecklistTemplateSchema.parse(body)
      const r = await ApplyChecklistTemplate.execute(taskId, data.templateId)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("テンプレートの適用に失敗しました", e)
      return NextResponse.json({ error: "テンプレートの適用に失敗しました" }, { status: 500 })
    }
  }
}

// ===== ChecklistTemplateController =====
export class ChecklistTemplateController {
  static async list(req: NextRequest) {
    try {
      const url = new URL(req.url)
      const businessId = url.searchParams.get("businessId") ?? undefined
      const data = await GetChecklistTemplates.execute(businessId)
      return NextResponse.json(data)
    } catch (e) {
      logger.error("テンプレート一覧の取得に失敗しました", e)
      return NextResponse.json({ error: "テンプレート一覧の取得に失敗しました" }, { status: 500 })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createChecklistTemplateSchema.parse(body)
      const r = await CreateChecklistTemplate.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("テンプレートの作成に失敗しました", e)
      return NextResponse.json({ error: "テンプレートの作成に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = createChecklistTemplateSchema.parse(body)
      const r = await UpdateChecklistTemplate.execute(id, data)
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("テンプレートの更新に失敗しました", e)
      return NextResponse.json({ error: "テンプレートの更新に失敗しました" }, { status: 500 })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteChecklistTemplate.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error("テンプレートの削除に失敗しました", e)
      return NextResponse.json({ error: "テンプレートの削除に失敗しました" }, { status: 500 })
    }
  }
}
