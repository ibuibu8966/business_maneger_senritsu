-- 「毎週」パターンで複数曜日選択を可能にするためのカラム追加
-- 既存の recurringDay（単一）は互換のため残す
ALTER TABLE "business_tasks"
ADD COLUMN "recurringDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[] NOT NULL;
