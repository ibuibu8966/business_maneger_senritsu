// Prisma型を直接UIに渡さない → DTO型に変換してフロントに返す

export interface BusinessDTO {
  id: string
  name: string
}

export interface AccountDTO {
  id: string
  name: string
  businessId: string | null
}

// ========== スケジュール ==========

export interface EmployeeDTO {
  id: string
  name: string
  color: string
  email: string | null
  role: "master_admin" | "admin" | "employee"
  lineUserId: string | null
  googleCalId: string | null
  coreTimeStart: string | null
  coreTimeEnd: string | null
  isActive: boolean
}

// ========== 貸借・口座管理 ==========

export type AccountTransactionTypeDTO =
  | "deposit"
  | "withdrawal"
  | "investment"
  | "transfer"
  | "lend"
  | "borrow"
  | "repayment_receive"
  | "repayment_pay"
  | "interest_receive"
  | "interest_pay"
  | "gain"
  | "loss"
  | "revenue"
  | "misc_expense"
  | "misc_income"

export interface AccountDetailDTO {
  id: string
  name: string
  ownerType: "internal" | "external"
  accountType: "bank" | "securities"
  businessId: string | null
  businessName: string | null
  balance: number
  purpose: string
  investmentPolicy: string
  tags: string[]
  isArchived: boolean
  isActive: boolean
  createdAt: string
}

export interface AccountTransactionDTO {
  id: string
  accountId: string
  accountName: string
  type: AccountTransactionTypeDTO
  categoryName: string            // カテゴリ名（管理会計連携時はカテゴリ名、それ以外はtypeラベル）
  amount: number
  date: string                    // "YYYY-MM-DD"
  fromAccountId: string | null
  fromAccountName: string | null
  toAccountId: string | null
  toAccountName: string | null
  counterparty: string
  linkedTransactionId: string | null
  linkedTransferId: string | null
  lendingId: string | null
  lendingPaymentId: string | null
  direction: string | null
  memo: string
  editedBy: string
  tags: string[]
  isArchived: boolean
  createdAt: string
}

export interface LendingDTO {
  id: string
  accountId: string
  accountName: string
  counterparty: string
  counterpartyAccountId: string | null
  counterpartyAccountName: string | null
  linkedLendingId: string | null
  type: "lend" | "borrow"
  principal: number
  outstanding: number
  dueDate: string | null          // "YYYY-MM-DD"
  status: "active" | "completed" | "overdue"
  memo: string
  editedBy: string
  tags: string[]
  isArchived: boolean
  createdAt: string
  payments: LendingPaymentDTO[]
}

export interface LendingPaymentDTO {
  id: string
  lendingId: string
  amount: number
  date: string                    // "YYYY-MM-DD"
  memo: string
  createdAt: string
}

// ========== スケジュール ==========

export interface ScheduleEventDTO {
  id: string
  title: string
  description: string
  startAt: string        // ISO-8601
  endAt: string          // ISO-8601
  allDay: boolean
  eventType: "meeting" | "holiday" | "outing" | "work" | "other"
  employeeId: string
  employeeName: string
  employeeColor: string
  googleEventId: string | null
  createdAt: string
  groupId?: string       // 複数人参加の場合のグループID
  participants?: { id: string; name: string; color: string }[]
}

// ========== CRM ==========

export interface ContactDTO {
  id: string
  name: string
  type: "salon_member" | "partner_contact"
  occupation: string
  age: number | null
  interests: string
  mindset: string
  lineId: string
  discordId: string
  email: string
  phone: string
  memo: string
  memberpayId: string
  robotpayId: string
  paypalId: string
  nextMeetingDate: string | null
  lastMeetingDate: string | null
  isFinalMeeting: boolean
  tags: string[]
  isArchived: boolean
  createdAt: string
}

export interface CrmTagDTO {
  id: string
  name: string
  color: string
}

export interface ContactMeetingDTO {
  id: string
  contactId: string
  date: string
  summary: string
  createdAt: string
}

export interface SalonDTO {
  id: string
  name: string
  isActive: boolean
  courses: SalonCourseDTO[]
}

export interface SalonCourseDTO {
  id: string
  salonId: string
  salonName: string
  name: string
  monthlyFee: number
  discordRoleName: string
  isActive: boolean
}

export interface SubscriptionDTO {
  id: string
  contactId: string
  contactName: string
  courseId: string
  courseName: string
  salonName: string
  paymentMethod: "memberpay" | "robotpay" | "paypal" | "univpay" | "other"
  paymentServiceId: string
  discordRoleAssigned: boolean
  isExempt: boolean
  discordRoleName: string
  status: "active" | "cancelled"
  startDate: string
  endDate: string | null
}

export interface PaymentCheckDTO {
  id: string
  subscriptionId: string
  contactName: string
  courseName: string
  salonName: string
  discordId: string
  paymentServiceId: string
  discordRoleName: string
  discordRoleAssigned: boolean
  isExempt: boolean
  paymentMethod: "memberpay" | "robotpay" | "paypal" | "univpay" | "other"
  year: number
  month: number
  isConfirmed: boolean
  confirmedBy: string
  confirmedAt: string | null
}

export interface PartnerDTO {
  id: string
  name: string
  memo: string
  businessDescription: string
  needs: string
  relationshipPlan: string
  tags: string[]
  isArchived: boolean
  contacts: { contactId: string; contactName: string; role: string }[]
  businesses: { businessId: string; businessName: string }[]
}

export interface TicketDTO {
  id: string
  title: string
  contactId: string | null
  contactName: string | null
  partnerId: string | null
  partnerName: string | null
  assigneeId: string
  assigneeName: string
  tool: "line" | "telegram" | "discord" | "phone" | "zoom" | "in_person"
  priority: "high" | "medium" | "low"
  status: "open" | "waiting" | "in_progress" | "completed"
  content: string
  memo: string
  dueDate: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface TicketCommentDTO {
  id: string
  ticketId: string
  content: string
  authorId: string
  authorName: string
  createdAt: string
}

export interface TicketDetailDTO extends TicketDTO {
  comments: TicketCommentDTO[]
}

// ========== 口座タグ ==========

export interface AccountTagDTO {
  id: string
  name: string
  color: string
}

// ========== 事業管理 ==========

export interface BusinessDetailDTO {
  id: string
  name: string
  purpose: string
  revenue: number
  expense: number
  status: "active" | "on-hold" | "completed"
  priority: "highest" | "high" | "medium" | "low"
  assigneeIds: string[]
  assignees: { id: string; name: string }[]
  accountNames: string[]
  partnerNames: string[]
  contractMemo: string
  relatedPartners: { id: string; name: string }[]
  relatedContacts: { id: string; name: string; role: string; source: "partner" | "direct" }[]
  attachments: { id: string; name: string; url: string; type: string }[]
  isActive: boolean
}

export interface ProjectDTO {
  id: string
  businessId: string
  parentId: string | null
  name: string
  purpose: string
  deadline: string | null
  revenue: number
  expense: number
  status: "active" | "on-hold" | "completed"
  priority: "highest" | "high" | "medium" | "low"
  assigneeIds: string[]
  assignees: { id: string; name: string }[]
  accountNames: string[]
  partnerNames: string[]
  contractMemo: string
  relatedPartners: { id: string; name: string }[]
  relatedContacts: { id: string; name: string; role: string; source: "partner" | "direct" }[]
  attachments: { id: string; name: string; url: string; type: string }[]
  sortOrder: number
}

export interface TaskChecklistItemDTO {
  id: string
  title: string
  checked: boolean
  sortOrder: number
}

export interface BusinessTaskDTO {
  id: string
  projectId: string
  projectName: string
  title: string
  detail: string
  assigneeId: string | null
  assigneeName: string | null
  deadline: string | null
  status: "todo" | "in-progress" | "waiting" | "done"
  memo: string
  contactId: string | null
  contactName: string | null
  partnerId: string | null
  partnerName: string | null
  tool: "LINE" | "TELEGRAM" | "DISCORD" | "PHONE" | "ZOOM" | "IN_PERSON" | null
  priority: "highest" | "high" | "medium" | "low"
  recurring: boolean
  recurringPattern: string | null
  recurringDay: number | null
  recurringWeek: number | null
  recurringEndDate: string | null
  lastGeneratedAt: string | null
  createdBy: string
  sortOrder: number
  createdAt: string
  // 今日やるフラグ
  todayFlag: boolean
  todayFlaggedAt: string | null
  // 実行時刻
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
  projectPriority: "highest" | "high" | "medium" | "low"
  projectAssigneeName: string | null
  projectContractMemo: string
  projectAccountNames: string[]
  projectPartnerNames: string[]
  // 事業情報
  businessId: string
  businessName: string
  businessPurpose: string
  businessStatus: "active" | "on-hold" | "completed"
  businessPriority: "highest" | "high" | "medium" | "low"
  // チェックリスト
  checklistItems: TaskChecklistItemDTO[]
}

export interface ChecklistTemplateDTO {
  id: string
  name: string
  businessId: string | null
  items: { id: string; title: string; sortOrder: number }[]
  createdAt: string
}

export interface BusinessMemoDTO {
  id: string
  businessId: string | null
  projectId: string | null
  date: string
  content: string
  author: string
  createdAt: string
}

export interface BusinessIssueNoteDTO {
  id: string
  date: string
  content: string
  author: string
}

export interface BusinessIssueDTO {
  id: string
  projectId: string
  projectName: string
  title: string
  detail: string
  assigneeId: string | null
  assigneeName: string | null
  createdBy: string
  deadline: string | null
  priority: "highest" | "high" | "medium" | "low"
  status: "unresolved" | "in-progress" | "resolved"
  createdAt: string
  progressNotes: BusinessIssueNoteDTO[]
}

// ========== 操作履歴 ==========

export interface AuditLogDTO {
  id: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  changes: Record<string, { old: unknown; new: unknown }>
  userId: string
  userName: string
  createdAt: string
}

// ========== ダッシュボード ==========

export interface DashboardCardConfig {
  cardType: "my-task" | "all-task" | "my-issue" | "all-issue" | "schedule" | "salon-meeting" | "balance" | "audit"
  id: string
  sortOrder: number
  colSpan?: 1 | 2
}

export interface DashboardLayoutDTO {
  id: string
  userId: string
  layout: DashboardCardConfig[]
}
