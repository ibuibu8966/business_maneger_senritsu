-- AlterTable: add notification settings to business_tasks
ALTER TABLE "business_tasks"
  ADD COLUMN "notifyEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyMinutesBefore" INTEGER NOT NULL DEFAULT 10;
