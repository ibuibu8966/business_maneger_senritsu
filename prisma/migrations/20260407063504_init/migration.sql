-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BusinessPriority" AS ENUM ('HIGHEST', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BusinessTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'WAITING', 'DONE');

-- CreateEnum
CREATE TYPE "BusinessIssueStatus" AS ENUM ('UNRESOLVED', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK', 'SECURITIES');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'TRANSFER', 'LEND', 'BORROW', 'REPAYMENT_RECEIVE', 'REPAYMENT_PAY', 'INTEREST_RECEIVE', 'INTEREST_PAY', 'GAIN', 'LOSS', 'REVENUE', 'MISC_EXPENSE', 'MISC_INCOME');

-- CreateEnum
CREATE TYPE "LendingType" AS ENUM ('LEND', 'BORROW');

-- CreateEnum
CREATE TYPE "LendingStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('MASTER_ADMIN', 'ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MEETING', 'HOLIDAY', 'OUTING', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('SALON_MEMBER', 'PARTNER_CONTACT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MEMBERPAY', 'ROBOTPAY', 'PAYPAL', 'UNIVPAY', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'WAITING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TicketTool" AS ENUM ('LINE', 'TELEGRAM', 'DISCORD', 'PHONE', 'ZOOM', 'IN_PERSON');

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "expense" INTEGER NOT NULL DEFAULT 0,
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "BusinessPriority" NOT NULL DEFAULT 'MEDIUM',
    "contractMemo" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "deadline" DATE,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "expense" INTEGER NOT NULL DEFAULT 0,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "BusinessPriority" NOT NULL DEFAULT 'MEDIUM',
    "contractMemo" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "accountNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "partnerNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "assigneeId" TEXT,
    "deadline" DATE,
    "status" "BusinessTaskStatus" NOT NULL DEFAULT 'TODO',
    "memo" TEXT NOT NULL DEFAULT '',
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "recurringDay" INTEGER,
    "recurringWeek" INTEGER,
    "recurringEndDate" DATE,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "contactId" TEXT,
    "partnerId" TEXT,
    "tool" "TicketTool",
    "priority" "BusinessPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_issues" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "assigneeId" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "deadline" DATE,
    "priority" "BusinessPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "BusinessIssueStatus" NOT NULL DEFAULT 'UNRESOLVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_issue_notes" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_issue_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerType" "OwnerType" NOT NULL DEFAULT 'INTERNAL',
    "accountType" "AccountType" NOT NULL DEFAULT 'BANK',
    "businessId" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "purpose" TEXT NOT NULL DEFAULT '',
    "investmentPolicy" TEXT NOT NULL DEFAULT '',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "accountType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "AccountTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "counterparty" TEXT NOT NULL DEFAULT '',
    "linkedTransactionId" TEXT,
    "origin" TEXT NOT NULL DEFAULT '',
    "linkedTransferId" TEXT,
    "lendingId" TEXT,
    "lendingPaymentId" TEXT,
    "direction" TEXT,
    "memo" TEXT NOT NULL DEFAULT '',
    "editedBy" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lendings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "counterpartyAccountId" TEXT,
    "linkedLendingId" TEXT,
    "type" "LendingType" NOT NULL,
    "principal" INTEGER NOT NULL,
    "outstanding" INTEGER NOT NULL,
    "dueDate" DATE,
    "status" "LendingStatus" NOT NULL DEFAULT 'ACTIVE',
    "memo" TEXT NOT NULL DEFAULT '',
    "editedBy" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lendings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lending_payments" (
    "id" TEXT NOT NULL,
    "lendingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "memo" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lending_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "email" TEXT,
    "passwordHash" TEXT,
    "role" "EmployeeRole" NOT NULL DEFAULT 'EMPLOYEE',
    "lineUserId" TEXT,
    "googleCalId" TEXT,
    "coreTimeStart" TEXT,
    "coreTimeEnd" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_assignees" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignees" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "eventType" "EventType" NOT NULL DEFAULT 'MEETING',
    "employeeId" TEXT NOT NULL,
    "googleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "occupation" TEXT NOT NULL DEFAULT '',
    "age" INTEGER,
    "interests" TEXT NOT NULL DEFAULT '',
    "mindset" TEXT NOT NULL DEFAULT '',
    "lineId" TEXT NOT NULL DEFAULT '',
    "discordId" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "memo" TEXT NOT NULL DEFAULT '',
    "memberpayId" TEXT NOT NULL DEFAULT '',
    "robotpayId" TEXT NOT NULL DEFAULT '',
    "paypalId" TEXT NOT NULL DEFAULT '',
    "nextMeetingDate" TIMESTAMP(3),
    "lastMeetingDate" TIMESTAMP(3),
    "isFinalMeeting" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_meetings" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salon_courses" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyFee" INTEGER NOT NULL DEFAULT 0,
    "discordRoleName" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salon_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
    "paymentServiceId" TEXT NOT NULL DEFAULT '',
    "discordRoleAssigned" BOOLEAN NOT NULL DEFAULT false,
    "isExempt" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_checks" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT NOT NULL DEFAULT '',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "memo" TEXT NOT NULL DEFAULT '',
    "businessDescription" TEXT NOT NULL DEFAULT '',
    "needs" TEXT NOT NULL DEFAULT '',
    "relationshipPlan" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_contacts" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_businesses" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_projects" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_businesses" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_projects" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "memo" TEXT NOT NULL DEFAULT '',
    "contactId" TEXT,
    "partnerId" TEXT,
    "assigneeId" TEXT NOT NULL,
    "tool" "TicketTool" NOT NULL DEFAULT 'LINE',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" DATE,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_checklist_items" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL DEFAULT '',
    "changes" JSONB NOT NULL DEFAULT '{}',
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layout" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_businessId_idx" ON "projects"("businessId");

-- CreateIndex
CREATE INDEX "projects_parentId_idx" ON "projects"("parentId");

-- CreateIndex
CREATE INDEX "business_tasks_projectId_idx" ON "business_tasks"("projectId");

-- CreateIndex
CREATE INDEX "business_tasks_assigneeId_idx" ON "business_tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "business_tasks_status_idx" ON "business_tasks"("status");

-- CreateIndex
CREATE INDEX "business_tasks_contactId_idx" ON "business_tasks"("contactId");

-- CreateIndex
CREATE INDEX "business_tasks_partnerId_idx" ON "business_tasks"("partnerId");

-- CreateIndex
CREATE INDEX "business_tasks_priority_idx" ON "business_tasks"("priority");

-- CreateIndex
CREATE INDEX "business_issues_projectId_idx" ON "business_issues"("projectId");

-- CreateIndex
CREATE INDEX "business_issues_assigneeId_idx" ON "business_issues"("assigneeId");

-- CreateIndex
CREATE INDEX "business_issues_status_idx" ON "business_issues"("status");

-- CreateIndex
CREATE INDEX "business_issues_priority_idx" ON "business_issues"("priority");

-- CreateIndex
CREATE INDEX "business_issue_notes_issueId_idx" ON "business_issue_notes"("issueId");

-- CreateIndex
CREATE INDEX "account_transactions_accountId_idx" ON "account_transactions"("accountId");

-- CreateIndex
CREATE INDEX "account_transactions_date_idx" ON "account_transactions"("date");

-- CreateIndex
CREATE INDEX "account_transactions_type_idx" ON "account_transactions"("type");

-- CreateIndex
CREATE INDEX "account_transactions_accountId_date_idx" ON "account_transactions"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "lendings_linkedLendingId_key" ON "lendings"("linkedLendingId");

-- CreateIndex
CREATE INDEX "lendings_accountId_idx" ON "lendings"("accountId");

-- CreateIndex
CREATE INDEX "lendings_counterpartyAccountId_idx" ON "lendings"("counterpartyAccountId");

-- CreateIndex
CREATE INDEX "lendings_status_idx" ON "lendings"("status");

-- CreateIndex
CREATE INDEX "lending_payments_lendingId_idx" ON "lending_payments"("lendingId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "business_assignees_businessId_idx" ON "business_assignees"("businessId");

-- CreateIndex
CREATE INDEX "business_assignees_employeeId_idx" ON "business_assignees"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "business_assignees_businessId_employeeId_key" ON "business_assignees"("businessId", "employeeId");

-- CreateIndex
CREATE INDEX "project_assignees_projectId_idx" ON "project_assignees"("projectId");

-- CreateIndex
CREATE INDEX "project_assignees_employeeId_idx" ON "project_assignees"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignees_projectId_employeeId_key" ON "project_assignees"("projectId", "employeeId");

-- CreateIndex
CREATE INDEX "schedule_events_startAt_idx" ON "schedule_events"("startAt");

-- CreateIndex
CREATE INDEX "schedule_events_employeeId_idx" ON "schedule_events"("employeeId");

-- CreateIndex
CREATE INDEX "schedule_events_eventType_idx" ON "schedule_events"("eventType");

-- CreateIndex
CREATE INDEX "schedule_events_employeeId_startAt_idx" ON "schedule_events"("employeeId", "startAt");

-- CreateIndex
CREATE INDEX "contacts_type_idx" ON "contacts"("type");

-- CreateIndex
CREATE INDEX "contacts_isArchived_idx" ON "contacts"("isArchived");

-- CreateIndex
CREATE INDEX "contact_meetings_contactId_idx" ON "contact_meetings"("contactId");

-- CreateIndex
CREATE INDEX "salon_courses_salonId_idx" ON "salon_courses"("salonId");

-- CreateIndex
CREATE INDEX "subscriptions_contactId_idx" ON "subscriptions"("contactId");

-- CreateIndex
CREATE INDEX "subscriptions_courseId_idx" ON "subscriptions"("courseId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "payment_checks_year_month_idx" ON "payment_checks"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payment_checks_subscriptionId_year_month_key" ON "payment_checks"("subscriptionId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "partner_contacts_partnerId_contactId_key" ON "partner_contacts"("partnerId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_businesses_partnerId_businessId_key" ON "partner_businesses"("partnerId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_projects_partnerId_projectId_key" ON "partner_projects"("partnerId", "projectId");

-- CreateIndex
CREATE INDEX "contact_businesses_contactId_idx" ON "contact_businesses"("contactId");

-- CreateIndex
CREATE INDEX "contact_businesses_businessId_idx" ON "contact_businesses"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_businesses_contactId_businessId_key" ON "contact_businesses"("contactId", "businessId");

-- CreateIndex
CREATE INDEX "contact_projects_contactId_idx" ON "contact_projects"("contactId");

-- CreateIndex
CREATE INDEX "contact_projects_projectId_idx" ON "contact_projects"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_projects_contactId_projectId_key" ON "contact_projects"("contactId", "projectId");

-- CreateIndex
CREATE INDEX "tickets_contactId_idx" ON "tickets"("contactId");

-- CreateIndex
CREATE INDEX "tickets_partnerId_idx" ON "tickets"("partnerId");

-- CreateIndex
CREATE INDEX "tickets_assigneeId_idx" ON "tickets"("assigneeId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");

-- CreateIndex
CREATE INDEX "ticket_comments_ticketId_idx" ON "ticket_comments"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "account_tags_name_key" ON "account_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_tags_name_key" ON "crm_tags"("name");

-- CreateIndex
CREATE INDEX "task_checklist_items_taskId_idx" ON "task_checklist_items"("taskId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_userId_key" ON "dashboard_layouts"("userId");

-- CreateIndex
CREATE INDEX "checklist_templates_businessId_idx" ON "checklist_templates"("businessId");

-- CreateIndex
CREATE INDEX "checklist_template_items_templateId_idx" ON "checklist_template_items"("templateId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tasks" ADD CONSTRAINT "business_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tasks" ADD CONSTRAINT "business_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tasks" ADD CONSTRAINT "business_tasks_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tasks" ADD CONSTRAINT "business_tasks_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_issues" ADD CONSTRAINT "business_issues_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_issues" ADD CONSTRAINT "business_issues_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_issue_notes" ADD CONSTRAINT "business_issue_notes_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "business_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lendings" ADD CONSTRAINT "lendings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lendings" ADD CONSTRAINT "lendings_counterpartyAccountId_fkey" FOREIGN KEY ("counterpartyAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lending_payments" ADD CONSTRAINT "lending_payments_lendingId_fkey" FOREIGN KEY ("lendingId") REFERENCES "lendings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_assignees" ADD CONSTRAINT "business_assignees_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_assignees" ADD CONSTRAINT "business_assignees_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_meetings" ADD CONSTRAINT "contact_meetings_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salon_courses" ADD CONSTRAINT "salon_courses_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "salon_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_checks" ADD CONSTRAINT "payment_checks_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_businesses" ADD CONSTRAINT "partner_businesses_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_businesses" ADD CONSTRAINT "partner_businesses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_projects" ADD CONSTRAINT "partner_projects_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_projects" ADD CONSTRAINT "partner_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_businesses" ADD CONSTRAINT "contact_businesses_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_businesses" ADD CONSTRAINT "contact_businesses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_projects" ADD CONSTRAINT "contact_projects_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_projects" ADD CONSTRAINT "contact_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "business_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
