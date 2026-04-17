-- AlterTable: add realName and nicknames to contacts (CRM: サロン生/取引先担当者の本名・別名紐付け)
ALTER TABLE "contacts"
  ADD COLUMN "realName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "nicknames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
