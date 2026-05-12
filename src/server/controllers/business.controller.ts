import { NextRequest, NextResponse } from "next/server"
import { handleApiError } from "@/server/lib/error-response"
import { GetBusinessDetails } from "@/server/use-cases/get-business-details.use-case"
import { CreateBusiness } from "@/server/use-cases/create-business.use-case"
import { UpdateBusinessDetail } from "@/server/use-cases/update-business-detail.use-case"
import { DeleteBusiness } from "@/server/use-cases/delete-business.use-case"
import { GetProjects } from "@/server/use-cases/get-projects.use-case"
import { CreateProject } from "@/server/use-cases/create-project.use-case"
import { UpdateProject } from "@/server/use-cases/update-project.use-case"
import { DeleteProject } from "@/server/use-cases/delete-project.use-case"
import { GetBusinessTasks } from "@/server/use-cases/get-business-tasks.use-case"
import { CreateBusinessTask } from "@/server/use-cases/create-business-task.use-case"
import { UpdateBusinessTask } from "@/server/use-cases/update-business-task.use-case"
import { DeleteBusinessTask } from "@/server/use-cases/delete-business-task.use-case"
import { ReorderBusinessTasks } from "@/server/use-cases/reorder-business-tasks.use-case"
import { CompleteIrregularTask } from "@/server/use-cases/complete-irregular-task.use-case"
import { GetBusinessIssues } from "@/server/use-cases/get-business-issues.use-case"
import { CreateBusinessIssue } from "@/server/use-cases/create-business-issue.use-case"
import { UpdateBusinessIssue } from "@/server/use-cases/update-business-issue.use-case"
import { DeleteBusinessIssue } from "@/server/use-cases/delete-business-issue.use-case"
import { AddIssueNote } from "@/server/use-cases/add-issue-note.use-case"
import { GetBusinessMemos } from "@/server/use-cases/get-business-memos.use-case"
import { CreateBusinessMemo } from "@/server/use-cases/create-business-memo.use-case"
import { DeleteBusinessMemo } from "@/server/use-cases/delete-business-memo.use-case"
import { AddTaskChecklistItem } from "@/server/use-cases/add-task-checklist-item.use-case"
import { UpdateTaskChecklistItem } from "@/server/use-cases/update-task-checklist-item.use-case"
import { DeleteTaskChecklistItem } from "@/server/use-cases/delete-task-checklist-item.use-case"
import { GetChecklistTemplates } from "@/server/use-cases/get-checklist-templates.use-case"
import { CreateChecklistTemplate } from "@/server/use-cases/create-checklist-template.use-case"
import { DeleteChecklistTemplate } from "@/server/use-cases/delete-checklist-template.use-case"
import { UpdateChecklistTemplate } from "@/server/use-cases/update-checklist-template.use-case"
import { ApplyChecklistTemplate } from "@/server/use-cases/apply-checklist-template.use-case"
import { requireRole } from "@/lib/auth-guard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  createBusinessSchema,
  updateBusinessSchema,
  createProjectSchema,
  createTaskSchema,
  createIssueSchema,
  addNoteSchema,
  createMemoSchema,
  reorderSchema,
  addChecklistItemSchema,
  updateChecklistItemSchema,
  createChecklistTemplateSchema,
  applyChecklistTemplateSchema,
} from "@/server/schemas/business.schema"

const updateProjectSchema = createProjectSchema.partial()
const updateTaskSchema = createTaskSchema.partial()
const updateIssueSchema = createIssueSchema.partial()

// ===== BusinessController =====
export class BusinessController {
  static async list(_req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const data = await GetBusinessDetails.execute()
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "事業", action: "取得" })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createBusinessSchema.parse(body)
      const r = await CreateBusiness.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "事業", action: "作成" })
    }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const data = await GetBusinessDetails.executeOne(id)
      if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "事業", action: "取得" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateBusinessSchema.parse(body)
      const r = await UpdateBusinessDetail.execute(id, data)
      return NextResponse.json(r)
    } catch (e) {
      return handleApiError(e, { resource: "事業", action: "更新" })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteBusiness.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      return handleApiError(e, { resource: "事業", action: "削除" })
    }
  }
}

// ===== ProjectController =====
export class ProjectController {
  static async list(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const businessId = url.searchParams.get("businessId") ?? undefined
      const data = await GetProjects.execute({ businessId })
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "プロジェクト", action: "取得" })
    }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const data = await GetProjects.executeOne(id)
      if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "プロジェクト", action: "取得" })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createProjectSchema.parse(body)
      const r = await CreateProject.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "プロジェクト", action: "作成" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateProjectSchema.parse(body)
      const r = await UpdateProject.execute(id, data)
      return NextResponse.json(r)
    } catch (e) {
      return handleApiError(e, { resource: "プロジェクト", action: "更新" })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteProject.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      return handleApiError(e, { resource: "プロジェクト", action: "削除" })
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
      return handleApiError(e, { resource: "タスク", action: "取得" })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createTaskSchema.parse(body)
      if (!data.assigneeIds || data.assigneeIds.length === 0) {
        return NextResponse.json(
          { error: "担当者を1人以上選択してください" },
          { status: 400 }
        )
      }
      const r = await CreateBusinessTask.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "タスク", action: "作成" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateTaskSchema.parse(body)
      const session = await getServerSession(authOptions)
      const completedBy = session?.user?.name ?? undefined
      const r = await UpdateBusinessTask.execute(id, data, completedBy)
      return NextResponse.json(r)
    } catch (e) {
      return handleApiError(e, { resource: "タスク", action: "更新" })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteBusinessTask.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      return handleApiError(e, { resource: "タスク", action: "削除" })
    }
  }

  static async reorder(req: NextRequest) {
    try {
      const body = await req.json()
      const data = reorderSchema.parse(body)
      await ReorderBusinessTasks.execute(data.taskIds, data.employeeId)
      return NextResponse.json({ success: true })
    } catch (e) {
      return handleApiError(e, { resource: "タスク", action: "更新" })
    }
  }

  static async completeIrregular(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const nextDate = typeof body?.nextDate === "string" ? body.nextDate : null
      const finished = body?.finished === true
      if (!finished && !nextDate) {
        return NextResponse.json({ error: "nextDate または finished が必要です" }, { status: 400 })
      }
      const r = await CompleteIrregularTask.execute(id, { nextDate, finished })
      return NextResponse.json(r)
    } catch (e) {
      return handleApiError(e, { resource: "タスク", action: "更新" })
    }
  }
}

// ===== BusinessIssueController =====
export class BusinessIssueController {
  static async list(req: NextRequest) {
    try {
      const url = new URL(req.url)
      const projectId = url.searchParams.get("projectId") ?? undefined
      const status = (url.searchParams.get("status")?.toUpperCase() ?? undefined) as import("@/generated/prisma/client").BusinessIssueStatus | undefined
      const priority = (url.searchParams.get("priority")?.toUpperCase() ?? undefined) as import("@/generated/prisma/client").BusinessPriority | undefined
      const data = await GetBusinessIssues.execute({ projectId, status, priority })
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "課題", action: "取得" })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createIssueSchema.parse(body)
      const r = await CreateBusinessIssue.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "課題", action: "作成" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateIssueSchema.parse(body)
      const r = await UpdateBusinessIssue.execute(id, data)
      return NextResponse.json(r)
    } catch (e) {
      return handleApiError(e, { resource: "課題", action: "更新" })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteBusinessIssue.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      return handleApiError(e, { resource: "課題", action: "削除" })
    }
  }

  static async addNote(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = addNoteSchema.parse(body)
      const r = await AddIssueNote.execute({ issueId: id, ...data })
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "メモ", action: "作成" })
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
      return handleApiError(e, { resource: "メモ", action: "取得" })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createMemoSchema.parse(body)
      const r = await CreateBusinessMemo.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "メモ", action: "作成" })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteBusinessMemo.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      return handleApiError(e, { resource: "メモ", action: "削除" })
    }
  }
}

// ===== TaskChecklistController =====
export class TaskChecklistController {
  static async addItem(req: NextRequest, taskId: string) {
    try {
      const body = await req.json()
      const data = addChecklistItemSchema.parse(body)
      const r = await AddTaskChecklistItem.execute({ taskId, ...data })
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "チェックリスト項目", action: "作成" })
    }
  }

  static async updateItem(_req: NextRequest, itemId: string) {
    try {
      const body = await _req.json()
      const data = updateChecklistItemSchema.parse(body)
      const r = await UpdateTaskChecklistItem.execute(itemId, data)
      return NextResponse.json(r)
    } catch (e) {
      return handleApiError(e, { resource: "チェックリスト項目", action: "更新" })
    }
  }

  static async deleteItem(_req: NextRequest, itemId: string) {
    try {
      await DeleteTaskChecklistItem.execute(itemId)
      return NextResponse.json({ success: true })
    } catch (e) {
      return handleApiError(e, { resource: "チェックリスト項目", action: "削除" })
    }
  }

  static async applyTemplate(req: NextRequest, taskId: string) {
    try {
      const body = await req.json()
      const data = applyChecklistTemplateSchema.parse(body)
      const r = await ApplyChecklistTemplate.execute(taskId, data.templateId)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "チェックリストテンプレート", action: "実行" })
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
      return handleApiError(e, { resource: "チェックリストテンプレート", action: "取得" })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createChecklistTemplateSchema.parse(body)
      const r = await CreateChecklistTemplate.execute(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "チェックリストテンプレート", action: "作成" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = createChecklistTemplateSchema.parse(body)
      const r = await UpdateChecklistTemplate.execute(id, data)
      return NextResponse.json(r)
    } catch (e) {
      return handleApiError(e, { resource: "チェックリストテンプレート", action: "更新" })
    }
  }

  static async delete(_req: NextRequest, id: string) {
    try {
      await DeleteChecklistTemplate.execute(id)
      return NextResponse.json({ success: true })
    } catch (e) {
      return handleApiError(e, { resource: "チェックリストテンプレート", action: "削除" })
    }
  }
}
