-- 決済確認に付箋フラグを追加（UI上で行を薄ピンク強調するためのON/OFFトグル）
ALTER TABLE "payment_checks" ADD COLUMN "hasNote" BOOLEAN NOT NULL DEFAULT false;
