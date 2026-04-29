-- Add INITIAL value to AccountTransactionType enum (口座作成時の初期残高用)
ALTER TYPE "AccountTransactionType" ADD VALUE IF NOT EXISTS 'INITIAL' BEFORE 'DEPOSIT';
