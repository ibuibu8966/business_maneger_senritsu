-- 複式簿記版への移行 migration
-- 重要: この migration を適用する *前* に、移行スクリプト
--   `node scripts/migrate-double-entry.js --execute` を実行して
-- 旧データ（accountId/from/to/linkedTransferId 等）を新形式に変換しておくこと。
-- 本SQLは構造変更を行うが、enum値の旧→新マッピングはこの中で行う。

-- AlterEnum: 旧16種から新12種への変換
-- USINGキャストは新enumにない値があると失敗するため、一度TEXTに退避してUPDATEで値を書き換える
BEGIN;
CREATE TYPE "AccountTransactionType_new" AS ENUM ('INITIAL', 'INVESTMENT', 'TRANSFER', 'LENDING', 'REPAYMENT', 'INTEREST', 'DEPOSIT_WITHDRAWAL', 'GAIN', 'LOSS', 'REVENUE', 'MISC_EXPENSE', 'MISC_INCOME');

-- 一旦 TEXT に変換してから値書き換え
ALTER TABLE "account_transactions" ALTER COLUMN "type" TYPE TEXT;

-- 旧値→新値のマッピング
UPDATE "account_transactions" SET "type" = 'DEPOSIT_WITHDRAWAL' WHERE "type" IN ('DEPOSIT', 'WITHDRAWAL');
UPDATE "account_transactions" SET "type" = 'LENDING' WHERE "type" IN ('LEND', 'BORROW');
UPDATE "account_transactions" SET "type" = 'REPAYMENT' WHERE "type" IN ('REPAYMENT_RECEIVE', 'REPAYMENT_PAY');
UPDATE "account_transactions" SET "type" = 'INTEREST' WHERE "type" IN ('INTEREST_RECEIVE', 'INTEREST_PAY');

-- 新 enum に変換
ALTER TABLE "account_transactions" ALTER COLUMN "type" TYPE "AccountTransactionType_new" USING ("type"::"AccountTransactionType_new");
ALTER TYPE "AccountTransactionType" RENAME TO "AccountTransactionType_old";
ALTER TYPE "AccountTransactionType_new" RENAME TO "AccountTransactionType";
DROP TYPE "AccountTransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "account_transactions" DROP CONSTRAINT "account_transactions_accountId_fkey";

-- DropForeignKey
ALTER TABLE "account_transactions" DROP CONSTRAINT "account_transactions_fromAccountId_fkey";

-- DropForeignKey
ALTER TABLE "account_transactions" DROP CONSTRAINT "account_transactions_toAccountId_fkey";

-- DropForeignKey
ALTER TABLE "lending_payments" DROP CONSTRAINT "lending_payments_lendingId_fkey";

-- DropIndex
DROP INDEX "account_transactions_accountId_idx";

-- DropIndex
DROP INDEX "account_transactions_accountId_date_idx";

-- DropIndex
DROP INDEX "lendings_status_idx";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "balance",
ADD COLUMN     "recalcRequiredFromDate" DATE;

-- AlterTable
ALTER TABLE "account_transactions" DROP COLUMN "accountId",
DROP COLUMN "balanceAfter",
DROP COLUMN "direction",
DROP COLUMN "lendingPaymentId",
DROP COLUMN "linkedTransactionId",
DROP COLUMN "linkedTransferId",
DROP COLUMN "origin",
ALTER COLUMN "fromAccountId" SET NOT NULL,
ALTER COLUMN "toAccountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "lendings" DROP COLUMN "outstanding",
DROP COLUMN "status";

-- DropTable
DROP TABLE "lending_payments";

-- DropEnum
DROP TYPE "LendingStatus";

-- CreateTable
CREATE TABLE "account_balance_snapshots" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "balance" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_balance_snapshots_accountId_idx" ON "account_balance_snapshots"("accountId");

-- CreateIndex
CREATE INDEX "account_balance_snapshots_date_idx" ON "account_balance_snapshots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "account_balance_snapshots_accountId_date_key" ON "account_balance_snapshots"("accountId", "date");

-- CreateIndex
CREATE INDEX "account_transactions_fromAccountId_idx" ON "account_transactions"("fromAccountId");

-- CreateIndex
CREATE INDEX "account_transactions_toAccountId_idx" ON "account_transactions"("toAccountId");

-- CreateIndex
CREATE INDEX "account_transactions_fromAccountId_date_idx" ON "account_transactions"("fromAccountId", "date");

-- CreateIndex
CREATE INDEX "account_transactions_toAccountId_date_idx" ON "account_transactions"("toAccountId", "date");

-- CreateIndex
CREATE INDEX "account_transactions_lendingId_idx" ON "account_transactions"("lendingId");

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balance_snapshots" ADD CONSTRAINT "account_balance_snapshots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
