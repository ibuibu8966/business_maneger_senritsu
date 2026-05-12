-- 不定期繰り返しタスク用のフィールド追加
-- nextScheduledAt: 不定期親タスクの次回生成予定日
-- parentTaskId: 不定期生成元の親タスクへの参照（子タスク→親）
ALTER TABLE "business_tasks" ADD COLUMN "nextScheduledAt" DATE;
ALTER TABLE "business_tasks" ADD COLUMN "parentTaskId" TEXT;

ALTER TABLE "business_tasks"
  ADD CONSTRAINT "business_tasks_parentTaskId_fkey"
  FOREIGN KEY ("parentTaskId") REFERENCES "business_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
