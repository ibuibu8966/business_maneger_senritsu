-- AlterTable
ALTER TABLE "business_tasks"
  ADD COLUMN "todayFlag" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "todayFlaggedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "business_tasks_todayFlag_idx" ON "business_tasks"("todayFlag");

-- CreateTable
CREATE TABLE "task_missed_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL DEFAULT '',
    "scheduledDate" DATE NOT NULL,
    "missedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusAtMissed" "BusinessTaskStatus" NOT NULL,

    CONSTRAINT "task_missed_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_missed_logs_taskId_idx" ON "task_missed_logs"("taskId");

-- CreateIndex
CREATE INDEX "task_missed_logs_scheduledDate_idx" ON "task_missed_logs"("scheduledDate");

-- CreateIndex
CREATE INDEX "task_missed_logs_projectId_idx" ON "task_missed_logs"("projectId");

-- AddForeignKey
ALTER TABLE "task_missed_logs" ADD CONSTRAINT "task_missed_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "business_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
