-- Add GIN index on contacts.nicknames for efficient array containment queries
CREATE INDEX IF NOT EXISTS "contacts_nicknames_gin_idx" ON "contacts" USING GIN ("nicknames");

-- Add index on contacts.realName for faster lookup
CREATE INDEX IF NOT EXISTS "contacts_realName_idx" ON "contacts" ("realName");
