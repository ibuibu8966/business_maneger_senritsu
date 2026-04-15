import type { ScheduleEventDTO, EmployeeDTO, CrmTagDTO } from "@/types/dto"

const SCHEDULE_BASE = "/api/schedule"

// ========== スケジュール ==========

export async function fetchScheduleEvents(params?: {
  startFrom?: string
  startTo?: string
  employeeId?: string
  eventType?: string
}): Promise<ScheduleEventDTO[]> {
  const url = new URL(`${SCHEDULE_BASE}/events`, window.location.origin)
  if (params?.startFrom) url.searchParams.set("startFrom", params.startFrom)
  if (params?.startTo) url.searchParams.set("startTo", params.startTo)
  if (params?.employeeId) url.searchParams.set("employeeId", params.employeeId)
  if (params?.eventType) url.searchParams.set("eventType", params.eventType)
  const res = await fetch(url)
  if (!res.ok) throw new Error("予定の取得に失敗")
  return res.json()
}

export async function createScheduleEvent(data: Record<string, unknown>): Promise<ScheduleEventDTO> {
  const res = await fetch(`${SCHEDULE_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("予定の登録に失敗")
  return res.json()
}

export async function updateScheduleEvent(id: string, data: Record<string, unknown>): Promise<ScheduleEventDTO> {
  const res = await fetch(`${SCHEDULE_BASE}/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("予定の更新に失敗")
  return res.json()
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  const res = await fetch(`${SCHEDULE_BASE}/events/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("予定の削除に失敗")
}

export async function updateEventParticipants(id: string, participantIds: string[]): Promise<{ groupId: string; participants: { id: string; name: string; color: string }[] }> {
  const res = await fetch(`${SCHEDULE_BASE}/events/${id}/participants`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantIds }),
  })
  if (!res.ok) throw new Error("参加者の更新に失敗")
  return res.json()
}

export async function fetchEmployees(): Promise<EmployeeDTO[]> {
  const res = await fetch(`${SCHEDULE_BASE}/employees`)
  if (!res.ok) throw new Error("従業員一覧の取得に失敗")
  return res.json()
}

export async function createEmployee(data: Record<string, unknown>): Promise<EmployeeDTO> {
  const res = await fetch(`${SCHEDULE_BASE}/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("従業員の登録に失敗")
  return res.json()
}

export async function updateEmployee(id: string, data: Record<string, unknown>): Promise<EmployeeDTO> {
  const res = await fetch(`${SCHEDULE_BASE}/employees/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("従業員の更新に失敗")
  return res.json()
}

export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`${SCHEDULE_BASE}/employees/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("従業員の削除に失敗")
}

// ========== 貸借・口座管理 ==========

import type { BusinessDTO, AccountDetailDTO, AccountTransactionDTO, LendingDTO, LendingPaymentDTO, AccountTagDTO } from "@/types/dto"

const LENDING_BASE = "/api/lending"

// --- 事業 ---
export async function fetchBusinesses(): Promise<BusinessDTO[]> {
  const res = await fetch(`${LENDING_BASE}/businesses`)
  if (!res.ok) throw new Error("事業一覧の取得に失敗")
  return res.json()
}

// --- 口座 ---
export async function fetchAccountDetails(params?: {
  ownerType?: string
  accountType?: string
  isArchived?: boolean
  isActive?: boolean
}): Promise<AccountDetailDTO[]> {
  const url = new URL(`${LENDING_BASE}/accounts`, window.location.origin)
  if (params?.ownerType) url.searchParams.set("ownerType", params.ownerType)
  if (params?.accountType) url.searchParams.set("accountType", params.accountType)
  if (params?.isArchived !== undefined) url.searchParams.set("isArchived", String(params.isArchived))
  if (params?.isActive !== undefined) url.searchParams.set("isActive", String(params.isActive))
  const res = await fetch(url)
  if (!res.ok) throw new Error("口座の取得に失敗")
  return res.json()
}

export async function fetchAccountById(id: string): Promise<AccountDetailDTO> {
  const res = await fetch(`${LENDING_BASE}/accounts/${id}`)
  if (!res.ok) throw new Error("口座の取得に失敗")
  return res.json()
}

export async function fetchAccountSummary(): Promise<{
  totalBalance: number
  totalLent: number
  totalBorrowed: number
  netAssets: number
}> {
  const res = await fetch(`${LENDING_BASE}/summary`)
  if (!res.ok) throw new Error("サマリーの取得に失敗")
  return res.json()
}

export async function createAccountDetail(data: Record<string, unknown>): Promise<AccountDetailDTO> {
  const res = await fetch(`${LENDING_BASE}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("口座の登録に失敗")
  return res.json()
}

export async function updateAccountDetail(id: string, data: Record<string, unknown>): Promise<AccountDetailDTO> {
  const res = await fetch(`${LENDING_BASE}/accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("口座の更新に失敗")
  return res.json()
}

// --- 口座取引 ---
export async function fetchAccountTransactions(params?: {
  accountId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  isArchived?: boolean
}): Promise<AccountTransactionDTO[]> {
  const url = new URL(`${LENDING_BASE}/transactions`, window.location.origin)
  if (params?.accountId) url.searchParams.set("accountId", params.accountId)
  if (params?.type) url.searchParams.set("type", params.type)
  if (params?.dateFrom) url.searchParams.set("dateFrom", params.dateFrom)
  if (params?.dateTo) url.searchParams.set("dateTo", params.dateTo)
  if (params?.isArchived !== undefined) url.searchParams.set("isArchived", String(params.isArchived))
  const res = await fetch(url)
  if (!res.ok) throw new Error("口座取引の取得に失敗")
  return res.json()
}

export async function createAccountTransaction(data: Record<string, unknown>): Promise<AccountTransactionDTO> {
  const res = await fetch(`${LENDING_BASE}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("口座取引の登録に失敗")
  return res.json()
}

export async function updateAccountTransaction(id: string, data: Record<string, unknown>): Promise<AccountTransactionDTO> {
  const res = await fetch(`${LENDING_BASE}/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("口座取引の更新に失敗")
  return res.json()
}

// --- 貸借 ---
export async function fetchLendings(params?: {
  accountId?: string
  type?: string
  status?: string
  isArchived?: boolean
}): Promise<LendingDTO[]> {
  const url = new URL(`${LENDING_BASE}/lendings`, window.location.origin)
  if (params?.accountId) url.searchParams.set("accountId", params.accountId)
  if (params?.type) url.searchParams.set("type", params.type)
  if (params?.status) url.searchParams.set("status", params.status)
  if (params?.isArchived !== undefined) url.searchParams.set("isArchived", String(params.isArchived))
  const res = await fetch(url)
  if (!res.ok) throw new Error("貸借の取得に失敗")
  return res.json()
}

export async function createLendingRecord(data: Record<string, unknown>): Promise<LendingDTO> {
  const res = await fetch(`${LENDING_BASE}/lendings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("貸借の登録に失敗")
  return res.json()
}

export async function updateLendingRecord(id: string, data: Record<string, unknown>): Promise<LendingDTO> {
  const res = await fetch(`${LENDING_BASE}/lendings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("貸借の更新に失敗")
  return res.json()
}

// --- 返済 ---
export async function createLendingPayment(data: Record<string, unknown>): Promise<LendingPaymentDTO> {
  const res = await fetch(`${LENDING_BASE}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("返済の登録に失敗")
  return res.json()
}

// --- タグ ---
export async function fetchAccountTags(): Promise<AccountTagDTO[]> {
  const res = await fetch(`${LENDING_BASE}/tags`)
  if (!res.ok) throw new Error("タグの取得に失敗")
  return res.json()
}

export async function createAccountTag(data: { name: string; color?: string }): Promise<AccountTagDTO> {
  const res = await fetch(`${LENDING_BASE}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("タグの作成に失敗")
  return res.json()
}

export async function updateAccountTag(id: string, data: { name?: string; color?: string }): Promise<AccountTagDTO> {
  const res = await fetch(`${LENDING_BASE}/tags/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("タグの更新に失敗")
  return res.json()
}

export async function deleteAccountTag(id: string): Promise<void> {
  const res = await fetch(`${LENDING_BASE}/tags/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("タグの削除に失敗")
}

// ========== CRM ==========

import type {
  ContactDTO, ContactMeetingDTO, SalonDTO, SalonCourseDTO, SubscriptionDTO,
  PaymentCheckDTO, PartnerDTO, TicketDTO, TicketDetailDTO, TicketCommentDTO,
} from "@/types/dto"

const CRM_BASE = "/api/crm"

// --- サロン生(Contact) ---
export async function fetchContacts(params?: {
  type?: string
  isArchived?: boolean
}): Promise<ContactDTO[]> {
  const url = new URL(`${CRM_BASE}/contacts`, window.location.origin)
  if (params?.type) url.searchParams.set("type", params.type)
  if (params?.isArchived !== undefined) url.searchParams.set("isArchived", String(params.isArchived))
  const res = await fetch(url)
  if (!res.ok) throw new Error("連絡先の取得に失敗")
  return res.json()
}

export async function fetchContactById(id: string): Promise<ContactDTO> {
  const res = await fetch(`${CRM_BASE}/contacts/${id}`)
  if (!res.ok) throw new Error("連絡先の取得に失敗")
  return res.json()
}

export async function createContact(data: Record<string, unknown>): Promise<ContactDTO> {
  const res = await fetch(`${CRM_BASE}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("連絡先の登録に失敗")
  return res.json()
}

export async function updateContact(id: string, data: Record<string, unknown>): Promise<ContactDTO> {
  const res = await fetch(`${CRM_BASE}/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("連絡先の更新に失敗")
  return res.json()
}

// --- 面談メモ ---
export async function fetchContactMeetings(contactId: string): Promise<ContactMeetingDTO[]> {
  const res = await fetch(`${CRM_BASE}/contacts/${contactId}/meetings`)
  if (!res.ok) throw new Error("面談メモの取得に失敗")
  return res.json()
}

export async function createContactMeeting(contactId: string, data: { date: string; summary?: string }): Promise<ContactMeetingDTO> {
  const res = await fetch(`${CRM_BASE}/contacts/${contactId}/meetings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("面談メモの登録に失敗")
  return res.json()
}

// --- サロン ---
export async function fetchSalons(): Promise<SalonDTO[]> {
  const res = await fetch(`${CRM_BASE}/salons`)
  if (!res.ok) throw new Error("サロン一覧の取得に失敗")
  return res.json()
}

export async function createSalon(data: Record<string, unknown>): Promise<SalonDTO> {
  const res = await fetch(`${CRM_BASE}/salons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("サロンの登録に失敗")
  return res.json()
}

export async function updateSalon(id: string, data: Record<string, unknown>): Promise<SalonDTO> {
  const res = await fetch(`${CRM_BASE}/salons/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("サロンの更新に失敗")
  return res.json()
}

export async function createCourse(data: Record<string, unknown>): Promise<SalonCourseDTO> {
  const res = await fetch(`${CRM_BASE}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("コースの登録に失敗")
  return res.json()
}

export async function updateCourse(id: string, data: Record<string, unknown>): Promise<SalonCourseDTO> {
  const res = await fetch(`${CRM_BASE}/courses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("コースの更新に失敗")
  return res.json()
}

// --- サブスクリプション ---
export async function fetchSubscriptions(params?: {
  contactId?: string
  courseId?: string
  status?: string
}): Promise<SubscriptionDTO[]> {
  const url = new URL(`${CRM_BASE}/subscriptions`, window.location.origin)
  if (params?.contactId) url.searchParams.set("contactId", params.contactId)
  if (params?.courseId) url.searchParams.set("courseId", params.courseId)
  if (params?.status) url.searchParams.set("status", params.status)
  const res = await fetch(url)
  if (!res.ok) throw new Error("サブスク一覧の取得に失敗")
  return res.json()
}

export async function createSubscription(data: Record<string, unknown>): Promise<SubscriptionDTO> {
  const res = await fetch(`${CRM_BASE}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("サブスクの登録に失敗")
  return res.json()
}

export async function updateSubscription(id: string, data: Record<string, unknown>): Promise<SubscriptionDTO> {
  const res = await fetch(`${CRM_BASE}/subscriptions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("サブスクの更新に失敗")
  return res.json()
}

// --- 決済確認 ---
export async function fetchPaymentChecks(params?: {
  year?: number
  month?: number
  isConfirmed?: boolean
}): Promise<PaymentCheckDTO[]> {
  const url = new URL(`${CRM_BASE}/payment-checks`, window.location.origin)
  if (params?.year) url.searchParams.set("year", String(params.year))
  if (params?.month) url.searchParams.set("month", String(params.month))
  if (params?.isConfirmed !== undefined) url.searchParams.set("isConfirmed", String(params.isConfirmed))
  const res = await fetch(url)
  if (!res.ok) throw new Error("決済確認の取得に失敗")
  return res.json()
}

export async function upsertPaymentCheck(data: Record<string, unknown> & { discordRoleAssigned?: boolean }): Promise<PaymentCheckDTO> {
  const res = await fetch(`${CRM_BASE}/payment-checks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("決済確認の更新に失敗")
  return res.json()
}

export async function generatePaymentChecks(data: { year: number; month: number }): Promise<{ count: number }> {
  const res = await fetch(`${CRM_BASE}/payment-checks/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("決済確認の生成に失敗")
  return res.json()
}

// --- 取引先 ---
export async function fetchPartners(): Promise<PartnerDTO[]> {
  const res = await fetch(`${CRM_BASE}/partners`)
  if (!res.ok) throw new Error("取引先一覧の取得に失敗")
  return res.json()
}

export async function fetchPartnerById(id: string): Promise<PartnerDTO> {
  const res = await fetch(`${CRM_BASE}/partners/${id}`)
  if (!res.ok) throw new Error("取引先の取得に失敗")
  return res.json()
}

export async function createPartner(data: Record<string, unknown>): Promise<PartnerDTO> {
  const res = await fetch(`${CRM_BASE}/partners`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("取引先の登録に失敗")
  return res.json()
}

export async function updatePartner(id: string, data: Record<string, unknown>): Promise<PartnerDTO> {
  const res = await fetch(`${CRM_BASE}/partners/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("取引先の更新に失敗")
  return res.json()
}

export async function addPartnerContact(partnerId: string, data: { contactId: string; role?: string }): Promise<void> {
  const res = await fetch(`${CRM_BASE}/partners/${partnerId}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("取引先への連絡先追加に失敗")
}

export async function addPartnerBusiness(partnerId: string, data: { businessId: string }): Promise<void> {
  const res = await fetch(`${CRM_BASE}/partners/${partnerId}/businesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("取引先への事業追加に失敗")
}

// --- チケット ---
export async function fetchTickets(params?: {
  status?: string
  priority?: string
  assigneeId?: string
  isArchived?: boolean
}): Promise<TicketDTO[]> {
  const url = new URL(`${CRM_BASE}/tickets`, window.location.origin)
  if (params?.status) url.searchParams.set("status", params.status)
  if (params?.priority) url.searchParams.set("priority", params.priority)
  if (params?.assigneeId) url.searchParams.set("assigneeId", params.assigneeId)
  if (params?.isArchived !== undefined) url.searchParams.set("isArchived", String(params.isArchived))
  const res = await fetch(url)
  if (!res.ok) throw new Error("チケット一覧の取得に失敗")
  return res.json()
}

export async function fetchTicketById(id: string): Promise<TicketDetailDTO> {
  const res = await fetch(`${CRM_BASE}/tickets/${id}`)
  if (!res.ok) throw new Error("チケットの取得に失敗")
  return res.json()
}

export async function createTicket(data: Record<string, unknown>): Promise<TicketDTO> {
  const res = await fetch(`${CRM_BASE}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("チケットの登録に失敗")
  return res.json()
}

export async function updateTicket(id: string, data: Record<string, unknown>): Promise<TicketDTO> {
  const res = await fetch(`${CRM_BASE}/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("チケットの更新に失敗")
  return res.json()
}

export async function addTicketComment(ticketId: string, data: { content: string; authorId: string }): Promise<TicketCommentDTO> {
  const res = await fetch(`${CRM_BASE}/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("コメントの登録に失敗")
  return res.json()
}

// ========== 事業管理 ==========

import type { BusinessDetailDTO, ProjectDTO, BusinessTaskDTO, BusinessIssueDTO, BusinessIssueNoteDTO, BusinessMemoDTO } from "@/types/dto"

const BUSINESS_BASE = "/api/business"

// --- 事業 ---
export async function fetchBusinessDetails(): Promise<BusinessDetailDTO[]> {
  const res = await fetch(`${BUSINESS_BASE}/businesses`)
  if (!res.ok) throw new Error("事業一覧の取得に失敗")
  return res.json()
}

export async function fetchBusinessById(id: string): Promise<BusinessDetailDTO> {
  const res = await fetch(`${BUSINESS_BASE}/businesses/${id}`)
  if (!res.ok) throw new Error("事業の取得に失敗")
  return res.json()
}

export async function createBusiness(data: Record<string, unknown>): Promise<BusinessDetailDTO> {
  const res = await fetch(`${BUSINESS_BASE}/businesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("事業の作成に失敗")
  return res.json()
}

export async function updateBusiness(id: string, data: Record<string, unknown>): Promise<BusinessDetailDTO> {
  const res = await fetch(`${BUSINESS_BASE}/businesses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("事業の更新に失敗")
  return res.json()
}

// --- プロジェクト ---
export async function fetchProjects(params?: { businessId?: string }): Promise<ProjectDTO[]> {
  const url = new URL(`${BUSINESS_BASE}/projects`, window.location.origin)
  if (params?.businessId) url.searchParams.set("businessId", params.businessId)
  const res = await fetch(url)
  if (!res.ok) throw new Error("プロジェクト一覧の取得に失敗")
  return res.json()
}

export async function fetchProjectById(id: string): Promise<ProjectDTO> {
  const res = await fetch(`${BUSINESS_BASE}/projects/${id}`)
  if (!res.ok) throw new Error("プロジェクトの取得に失敗")
  return res.json()
}

export async function createProject(data: Record<string, unknown>): Promise<ProjectDTO> {
  const res = await fetch(`${BUSINESS_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("プロジェクトの作成に失敗")
  return res.json()
}

export async function updateProject(id: string, data: Record<string, unknown>): Promise<ProjectDTO> {
  const res = await fetch(`${BUSINESS_BASE}/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("プロジェクトの更新に失敗")
  return res.json()
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${BUSINESS_BASE}/projects/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("プロジェクトの削除に失敗")
}

export async function deleteBusiness(id: string): Promise<void> {
  const res = await fetch(`${BUSINESS_BASE}/businesses/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("事業の削除に失敗")
}

// --- タスク ---
export async function fetchBusinessTasks(params?: { projectId?: string; assigneeId?: string; issueId?: string }): Promise<BusinessTaskDTO[]> {
  const url = new URL(`${BUSINESS_BASE}/tasks`, window.location.origin)
  if (params?.projectId) url.searchParams.set("projectId", params.projectId)
  if (params?.assigneeId) url.searchParams.set("assigneeId", params.assigneeId)
  if (params?.issueId) url.searchParams.set("issueId", params.issueId)
  const res = await fetch(url)
  if (!res.ok) throw new Error("タスク一覧の取得に失敗")
  return res.json()
}

export async function createBusinessTask(data: Record<string, unknown>): Promise<BusinessTaskDTO> {
  const res = await fetch(`${BUSINESS_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("タスクの作成に失敗")
  return res.json()
}

export async function updateBusinessTask(id: string, data: Record<string, unknown>): Promise<BusinessTaskDTO> {
  const res = await fetch(`${BUSINESS_BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("タスクの更新に失敗")
  return res.json()
}

export async function deleteBusinessTask(id: string): Promise<void> {
  const res = await fetch(`${BUSINESS_BASE}/tasks/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("タスクの削除に失敗")
}

export async function reorderBusinessTasks(data: { taskId: string; newSortOrder: number }): Promise<void> {
  const res = await fetch(`${BUSINESS_BASE}/tasks/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("タスクの並び替えに失敗")
}

// --- 課題 ---
export async function fetchBusinessIssues(params?: { projectId?: string; status?: string; priority?: string }): Promise<BusinessIssueDTO[]> {
  const url = new URL(`${BUSINESS_BASE}/issues`, window.location.origin)
  if (params?.projectId) url.searchParams.set("projectId", params.projectId)
  if (params?.status) url.searchParams.set("status", params.status)
  if (params?.priority) url.searchParams.set("priority", params.priority)
  const res = await fetch(url)
  if (!res.ok) throw new Error("課題一覧の取得に失敗")
  return res.json()
}

export async function createBusinessIssue(data: Record<string, unknown>): Promise<BusinessIssueDTO> {
  const res = await fetch(`${BUSINESS_BASE}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("課題の作成に失敗")
  return res.json()
}

export async function updateBusinessIssue(id: string, data: Record<string, unknown>): Promise<BusinessIssueDTO> {
  const res = await fetch(`${BUSINESS_BASE}/issues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("課題の更新に失敗")
  return res.json()
}

export async function deleteBusinessIssue(id: string): Promise<void> {
  const res = await fetch(`${BUSINESS_BASE}/issues/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("課題の削除に失敗")
}

export async function addBusinessIssueNote(issueId: string, data: { date: string; content: string; author?: string }): Promise<BusinessIssueNoteDTO> {
  const res = await fetch(`${BUSINESS_BASE}/issues/${issueId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("経過記録の追加に失敗")
  return res.json()
}

// ========== チェックリスト ==========

export async function addTaskChecklistItem(taskId: string, data: { title: string; sortOrder?: number }) {
  const res = await fetch(`${BUSINESS_BASE}/tasks/${taskId}/checklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("チェックリスト項目の追加に失敗")
  return res.json()
}

export async function updateTaskChecklistItem(taskId: string, itemId: string, data: { title?: string; checked?: boolean; sortOrder?: number }) {
  const res = await fetch(`${BUSINESS_BASE}/tasks/${taskId}/checklist/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("チェックリスト項目の更新に失敗")
  return res.json()
}

export async function deleteTaskChecklistItem(taskId: string, itemId: string) {
  const res = await fetch(`${BUSINESS_BASE}/tasks/${taskId}/checklist/${itemId}`, { method: "DELETE" })
  if (!res.ok) throw new Error("チェックリスト項目の削除に失敗")
}

export async function applyChecklistTemplate(taskId: string, templateId: string) {
  const res = await fetch(`${BUSINESS_BASE}/tasks/${taskId}/apply-template`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId }),
  })
  if (!res.ok) throw new Error("テンプレートの適用に失敗")
  return res.json()
}

// ========== チェックリストテンプレート ==========

export async function fetchChecklistTemplates(businessId?: string) {
  const url = new URL(`${BUSINESS_BASE}/checklist-templates`, window.location.origin)
  if (businessId) url.searchParams.set("businessId", businessId)
  const res = await fetch(url)
  if (!res.ok) throw new Error("テンプレート一覧の取得に失敗")
  return res.json()
}

export async function createChecklistTemplate(data: { name: string; businessId?: string; items: { title: string; sortOrder: number }[] }) {
  const res = await fetch(`${BUSINESS_BASE}/checklist-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("テンプレートの作成に失敗")
  return res.json()
}

export async function updateChecklistTemplate(id: string, data: { name: string; businessId?: string | null; items: { title: string; sortOrder: number }[] }) {
  const res = await fetch(`${BUSINESS_BASE}/checklist-templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("テンプレートの更新に失敗")
  return res.json()
}

export async function deleteChecklistTemplate(id: string) {
  const res = await fetch(`${BUSINESS_BASE}/checklist-templates/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("テンプレートの削除に失敗")
}

// ========== メモ ==========

export async function fetchBusinessMemos(params?: { businessId?: string; projectId?: string }): Promise<BusinessMemoDTO[]> {
  const url = new URL(`${BUSINESS_BASE}/memos`, window.location.origin)
  if (params?.businessId) url.searchParams.set("businessId", params.businessId)
  if (params?.projectId) url.searchParams.set("projectId", params.projectId)
  const res = await fetch(url)
  if (!res.ok) throw new Error("メモ一覧の取得に失敗")
  return res.json()
}

export async function createBusinessMemo(data: { businessId?: string; projectId?: string; date: string; content: string; author?: string }): Promise<BusinessMemoDTO> {
  const res = await fetch(`${BUSINESS_BASE}/memos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("メモの作成に失敗")
  return res.json()
}

export async function deleteBusinessMemo(id: string): Promise<void> {
  const res = await fetch(`${BUSINESS_BASE}/memos/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("メモの削除に失敗")
}

// ========== 操作履歴 ==========

import type { AuditLogDTO, DashboardLayoutDTO } from "@/types/dto"

export async function fetchAuditLogs(params?: { entityType?: string; limit?: number }): Promise<AuditLogDTO[]> {
  const sp = new URLSearchParams()
  if (params?.entityType) sp.set("entityType", params.entityType)
  if (params?.limit) sp.set("limit", String(params.limit))
  const res = await fetch(`/api/audit-logs?${sp}`)
  if (!res.ok) throw new Error("操作履歴の取得に失敗")
  return res.json()
}

// ========== ダッシュボード ==========

export async function fetchDashboardLayout(): Promise<DashboardLayoutDTO> {
  const res = await fetch("/api/dashboard/layout")
  if (!res.ok) throw new Error("ダッシュボードレイアウトの取得に失敗")
  return res.json()
}

export async function updateDashboardLayout(layout: unknown[]): Promise<DashboardLayoutDTO> {
  const res = await fetch("/api/dashboard/layout", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ layout }),
  })
  if (!res.ok) throw new Error("ダッシュボードレイアウトの更新に失敗")
  return res.json()
}

// ========== CRMタグ ==========

export async function fetchCrmTags(): Promise<CrmTagDTO[]> {
  const res = await fetch(`${CRM_BASE}/tags`)
  if (!res.ok) throw new Error("CRMタグの取得に失敗")
  return res.json()
}

export async function createCrmTag(data: { name: string; color?: string }): Promise<CrmTagDTO> {
  const res = await fetch(`${CRM_BASE}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("CRMタグの作成に失敗")
  return res.json()
}

export async function deleteCrmTag(id: string): Promise<void> {
  const res = await fetch(`${CRM_BASE}/tags/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("CRMタグの削除に失敗")
}

// ========== 面談 ==========

export async function fetchMeetingsByDate(date: string) {
  const res = await fetch(`${CRM_BASE}/meetings?date=${date}`)
  if (!res.ok) throw new Error("面談の取得に失敗")
  return res.json()
}

