-- Make projectId nullable (for business-direct tasks)
ALTER TABLE "business_tasks" ALTER COLUMN "projectId" DROP NOT NULL;

-- Add businessId column for direct tasks under Business (skipping Project)
ALTER TABLE "business_tasks" ADD COLUMN "businessId" TEXT;

-- FK to businesses
ALTER TABLE "business_tasks"
  ADD CONSTRAINT "business_tasks_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for lookups by business
CREATE INDEX "business_tasks_businessId_idx" ON "business_tasks"("businessId");
