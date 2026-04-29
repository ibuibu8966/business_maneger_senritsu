-- account_transactions に全口座共通の通し番号 serialNumber を追加
-- SERIAL型なので自動的にシーケンスが作成され、既存レコードにも採番される
-- 既存レコードはINSERT順に番号が振られる
ALTER TABLE "account_transactions" ADD COLUMN "serialNumber" SERIAL NOT NULL;
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_serialNumber_key" UNIQUE ("serialNumber");
