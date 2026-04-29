-- Add balanceAfter column to account_transactions (時点残高: この取引を反映した直後の口座残高)
ALTER TABLE "account_transactions" ADD COLUMN "balanceAfter" INTEGER NOT NULL DEFAULT 0;
