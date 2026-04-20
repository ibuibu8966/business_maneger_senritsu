-- CreateTable: task_assignees (intermediate table for BusinessTask <-> Employee)
CREATE TABLE "task_assignees" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_assignees_taskId_employeeId_key" ON "task_assignees"("taskId", "employeeId");
CREATE INDEX "task_assignees_taskId_idx" ON "task_assignees"("taskId");
CREATE INDEX "task_assignees_employeeId_idx" ON "task_assignees"("employeeId");

ALTER TABLE "task_assignees"
  ADD CONSTRAINT "task_assignees_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "business_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_assignees"
  ADD CONSTRAINT "task_assignees_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: issue_assignees (intermediate table for BusinessIssue <-> Employee)
CREATE TABLE "issue_assignees" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "issue_assignees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "issue_assignees_issueId_employeeId_key" ON "issue_assignees"("issueId", "employeeId");
CREATE INDEX "issue_assignees_issueId_idx" ON "issue_assignees"("issueId");
CREATE INDEX "issue_assignees_employeeId_idx" ON "issue_assignees"("employeeId");

ALTER TABLE "issue_assignees"
  ADD CONSTRAINT "issue_assignees_issueId_fkey"
  FOREIGN KEY ("issueId") REFERENCES "business_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "issue_assignees"
  ADD CONSTRAINT "issue_assignees_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: migrate existing single-assignee data to the new intermediate tables
INSERT INTO "task_assignees" ("id", "taskId", "employeeId", "createdAt")
SELECT
  gen_random_uuid()::text,
  "id",
  "assigneeId",
  CURRENT_TIMESTAMP
FROM "business_tasks"
WHERE "assigneeId" IS NOT NULL
ON CONFLICT ("taskId", "employeeId") DO NOTHING;

INSERT INTO "issue_assignees" ("id", "issueId", "employeeId", "createdAt")
SELECT
  gen_random_uuid()::text,
  "id",
  "assigneeId",
  CURRENT_TIMESTAMP
FROM "business_issues"
WHERE "assigneeId" IS NOT NULL
ON CONFLICT ("issueId", "employeeId") DO NOTHING;
