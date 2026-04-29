-- 担当者ごとに独立した並び順を保存するテーブル
CREATE TABLE "task_user_sort_orders" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "task_user_sort_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_user_sort_orders_taskId_employeeId_key"
ON "task_user_sort_orders"("taskId", "employeeId");

CREATE INDEX "task_user_sort_orders_taskId_idx"
ON "task_user_sort_orders"("taskId");

CREATE INDEX "task_user_sort_orders_employeeId_idx"
ON "task_user_sort_orders"("employeeId");

ALTER TABLE "task_user_sort_orders"
ADD CONSTRAINT "task_user_sort_orders_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "business_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
