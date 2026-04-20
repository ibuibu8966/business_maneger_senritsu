-- Add attachments JSON column to business_tasks (for file/url attachments)
ALTER TABLE "business_tasks" ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]'::jsonb;
