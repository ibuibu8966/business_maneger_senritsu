-- 仮想口座フラグを追加（複式簿記の集約口座など、UI非表示用）
ALTER TABLE "accounts" ADD COLUMN "isVirtual" BOOLEAN NOT NULL DEFAULT false;

-- 既存の「外部」仮想集約口座にフラグを立てる
UPDATE "accounts" SET "isVirtual" = true WHERE "ownerType" = 'EXTERNAL' AND "name" = '外部';
