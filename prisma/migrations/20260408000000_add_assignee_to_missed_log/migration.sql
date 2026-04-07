-- AlterTable
ALTER TABLE "task_missed_logs"
  ADD COLUMN "assigneeId" TEXT,
  ADD COLUMN "assigneeName" TEXT NOT NULL DEFAULT '';
