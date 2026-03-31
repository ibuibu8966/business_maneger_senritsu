export const queryKeys = {
  businesses: { all: ["businesses"] as const },
  accounts: { all: ["accounts"] as const },
  employees: { all: ["employees"] as const },
  scheduleEvents: {
    all: ["scheduleEvents"] as const,
    list: (params?: Record<string, string>) =>
      ["scheduleEvents", params] as const,
  },
  accountDetails: {
    all: ["accountDetails"] as const,
    detail: (id: string) => ["accountDetails", id] as const,
  },
  accountSummary: { all: ["accountSummary"] as const },
  accountTransactions: {
    all: ["accountTransactions"] as const,
    list: (params?: Record<string, string>) =>
      ["accountTransactions", params] as const,
  },
  lendings: {
    all: ["lendings"] as const,
    list: (params?: Record<string, string>) =>
      ["lendings", params] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    list: (params?: Record<string, string>) => ["contacts", params] as const,
    detail: (id: string) => ["contacts", id] as const,
  },
  contactMeetings: {
    all: ["contactMeetings"] as const,
    list: (contactId: string) => ["contactMeetings", contactId] as const,
  },
  salons: { all: ["salons"] as const },
  subscriptions: {
    all: ["subscriptions"] as const,
    list: (params?: Record<string, string>) => ["subscriptions", params] as const,
  },
  paymentChecks: {
    all: ["paymentChecks"] as const,
    list: (params?: Record<string, string>) => ["paymentChecks", params] as const,
  },
  partners: {
    all: ["partners"] as const,
    detail: (id: string) => ["partners", id] as const,
  },
  accountTags: { all: ["accountTags"] as const },
  crmTags: { all: ["crmTags"] as const },
  tickets: {
    all: ["tickets"] as const,
    list: (params?: Record<string, string>) => ["tickets", params] as const,
    detail: (id: string) => ["tickets", id] as const,
  },
  // 事業管理
  businessDetails: {
    all: ["businessDetails"] as const,
    detail: (id: string) => ["businessDetails", id] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (params?: Record<string, string>) => ["projects", params] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  businessTasks: {
    all: ["businessTasks"] as const,
    list: (params?: Record<string, string>) => ["businessTasks", params] as const,
  },
  businessIssues: {
    all: ["businessIssues"] as const,
    list: (params?: Record<string, string>) => ["businessIssues", params] as const,
  },
  checklistTemplates: {
    all: ["checklistTemplates"] as const,
    list: (params?: Record<string, string>) =>
      ["checklistTemplates", params] as const,
  },
  auditLogs: { all: ["auditLogs"] as const },
  dashboardLayout: { all: ["dashboardLayout"] as const },
  meetingsByDate: {
    all: ["meetingsByDate"] as const,
    date: (date: string) => ["meetingsByDate", date] as const,
  },
}
