#!/usr/bin/env node
/**
 * business-manager 取引テーブル 複式簿記化 データ移行スクリプト
 *
 * このスクリプトは「Prismaのmigration適用 *前* に」実行する。
 * 既存データを新スキーマで受け入れ可能な形に変換する。
 *
 * 使い方:
 *   node scripts/migrate-double-entry.js --dry-run   # 確認のみ（DB変更なし）
 *   node scripts/migrate-double-entry.js --execute   # 実行
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// .env読み込み
const envPath = path.join(__dirname, '..', '.env');
fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const eq = line.indexOf('=');
  if (eq < 0) return;
  let key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
});

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

if (!DRY_RUN && !EXECUTE) {
  console.error('使い方: node scripts/migrate-double-entry.js [--dry-run | --execute]');
  process.exit(1);
}

console.log(`==========================================`);
console.log(`複式簿記化 データ移行スクリプト`);
console.log(`モード: ${EXECUTE ? '★本番実行★' : 'ドライラン（DB変更なし）'}`);
console.log(`==========================================`);
console.log('');

function generateCuidLike() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'c';
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function count(client, sql, params = []) {
  const r = await client.query(sql, params);
  return Number(r.rows[0].count);
}

async function main() {
  const conn = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error('ERROR: DATABASE_URL/DIRECT_URL 未設定');
    process.exit(1);
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  console.log('[OK] DB接続');
  console.log('');

  // 開始時件数
  const beforeAT = await count(client, 'SELECT COUNT(*) FROM account_transactions');
  const beforeLend = await count(client, 'SELECT COUNT(*) FROM lendings');
  const beforeLP = await count(client, 'SELECT COUNT(*) FROM lending_payments');
  console.log(`[開始時件数] AccountTransaction=${beforeAT} / Lending=${beforeLend} / LendingPayment=${beforeLP}`);
  console.log('');

  try {
    if (EXECUTE) {
      await client.query('BEGIN');
      console.log('--- BEGIN TRANSACTION ---');
      console.log('');
    }

    // === Phase 1: 外部口座作成 ===
    console.log('=== Phase 1: 外部口座作成 ===');
    const extRes = await client.query(`SELECT id FROM accounts WHERE "ownerType" = 'EXTERNAL' AND name = '外部' LIMIT 1`);
    let externalId;
    if (extRes.rows.length > 0) {
      externalId = extRes.rows[0].id;
      console.log(`[既存] 外部口座: ${externalId}`);
    } else {
      externalId = generateCuidLike();
      console.log(`[作成予定] 外部口座 id=${externalId} name="外部" ownerType=EXTERNAL`);
      if (EXECUTE) {
        await client.query(
          `INSERT INTO accounts (id, name, "ownerType", "accountType", "isActive", "isArchived", "businessId", purpose, "investmentPolicy", balance, tags, "createdAt", "updatedAt")
           VALUES ($1, '外部', 'EXTERNAL', 'BANK', true, false, NULL, '全外部取引の仮想集約口座（複式簿記化で追加）', '', 0, ARRAY[]::text[], NOW(), NOW())`,
          [externalId]
        );
      }
    }
    console.log('');

    // === Phase 2: TRANSFER 'in' 削除（ペア統合） ===
    console.log('=== Phase 2: TRANSFER ペア統合（in側を削除） ===');
    const transferIn = await count(client, `SELECT COUNT(*) FROM account_transactions WHERE type = 'TRANSFER' AND direction = 'in'`);
    const transferOut = await count(client, `SELECT COUNT(*) FROM account_transactions WHERE type = 'TRANSFER' AND direction = 'out'`);
    console.log(`削除: TRANSFER 'in' = ${transferIn} 件 / 残す: TRANSFER 'out' = ${transferOut} 件`);
    if (EXECUTE) {
      await client.query(`DELETE FROM account_transactions WHERE type = 'TRANSFER' AND direction = 'in'`);
    }
    console.log('');

    // === Phase 3: BORROW 削除（社内貸借はLEND側で完結） ===
    console.log('=== Phase 3: BORROW 重複削除 ===');
    const borrowCount = await count(client, `SELECT COUNT(*) FROM account_transactions WHERE type = 'BORROW'`);
    console.log(`削除: BORROW = ${borrowCount} 件（社内貸借のためLEND側で1取引化）`);
    if (EXECUTE) {
      await client.query(`DELETE FROM account_transactions WHERE type = 'BORROW'`);
    }
    console.log('');

    // === Phase 4: type別 from/to 設定 + type値マッピング ===
    console.log('=== Phase 4: from/to 設定 + type値マッピング ===');
    const phase4 = [
      { type: 'INITIAL', newType: 'INITIAL', from: 'EXT', to: 'ACC',
        sql: `UPDATE account_transactions SET "fromAccountId" = $1, "toAccountId" = "accountId" WHERE type = 'INITIAL'` },
      { type: 'DEPOSIT', newType: 'DEPOSIT_WITHDRAWAL', from: 'EXT', to: 'ACC',
        sql: `UPDATE account_transactions SET type = 'DEPOSIT_WITHDRAWAL', "fromAccountId" = $1, "toAccountId" = "accountId" WHERE type = 'DEPOSIT'` },
      { type: 'WITHDRAWAL', newType: 'DEPOSIT_WITHDRAWAL', from: 'ACC', to: 'EXT',
        sql: `UPDATE account_transactions SET type = 'DEPOSIT_WITHDRAWAL', "fromAccountId" = "accountId", "toAccountId" = $1 WHERE type = 'WITHDRAWAL'` },
      { type: 'GAIN', newType: 'GAIN', from: 'EXT', to: 'ACC',
        sql: `UPDATE account_transactions SET "fromAccountId" = $1, "toAccountId" = "accountId" WHERE type = 'GAIN'` },
      { type: 'LOSS', newType: 'LOSS', from: 'ACC', to: 'EXT',
        sql: `UPDATE account_transactions SET "fromAccountId" = "accountId", "toAccountId" = $1 WHERE type = 'LOSS'` },
      { type: 'MISC_INCOME', newType: 'MISC_INCOME', from: 'EXT', to: 'ACC',
        sql: `UPDATE account_transactions SET "fromAccountId" = $1, "toAccountId" = "accountId" WHERE type = 'MISC_INCOME'` },
      { type: 'MISC_EXPENSE', newType: 'MISC_EXPENSE', from: 'ACC', to: 'EXT',
        sql: `UPDATE account_transactions SET "fromAccountId" = "accountId", "toAccountId" = $1 WHERE type = 'MISC_EXPENSE'` },
    ];

    for (const p of phase4) {
      const c = await count(client, `SELECT COUNT(*) FROM account_transactions WHERE type = $1`, [p.type]);
      console.log(`${p.type} → ${p.newType} : ${c} 件 (from=${p.from === 'EXT' ? '外部' : 'accountId'}, to=${p.to === 'EXT' ? '外部' : 'accountId'})`);
      if (EXECUTE && c > 0) await client.query(p.sql, [externalId]);
    }

    // LEND → LENDING (from=accountId, to=Lending.counterpartyAccountId)
    const lendCount = await count(client, `SELECT COUNT(*) FROM account_transactions WHERE type = 'LEND'`);
    console.log(`LEND → LENDING : ${lendCount} 件 (from=accountId, to=Lending.counterpartyAccountId)`);
    if (EXECUTE && lendCount > 0) {
      await client.query(`
        UPDATE account_transactions t
        SET type = 'LENDING',
            "fromAccountId" = t."accountId",
            "toAccountId" = COALESCE(l."counterpartyAccountId", $1)
        FROM lendings l
        WHERE t.type = 'LEND' AND t."lendingId" = l.id
      `, [externalId]);
    }

    // REPAYMENT_RECEIVE → REPAYMENT (lendingId付きならcounterpartyAccountId、なければ外部)
    const rrCount = await count(client, `SELECT COUNT(*) FROM account_transactions WHERE type = 'REPAYMENT_RECEIVE'`);
    console.log(`REPAYMENT_RECEIVE → REPAYMENT : ${rrCount} 件 (from=counterpartyAccountId or 外部, to=accountId)`);
    if (EXECUTE && rrCount > 0) {
      // lendingId付き: counterpartyAccountIdベース
      await client.query(`
        UPDATE account_transactions t
        SET type = 'REPAYMENT',
            "fromAccountId" = COALESCE(l."counterpartyAccountId", $1),
            "toAccountId" = t."accountId"
        FROM lendings l
        WHERE t.type = 'REPAYMENT_RECEIVE' AND t."lendingId" = l.id
      `, [externalId]);
      // lendingId NULL: 外部口座経由
      await client.query(`
        UPDATE account_transactions
        SET type = 'REPAYMENT',
            "fromAccountId" = $1,
            "toAccountId" = "accountId"
        WHERE type = 'REPAYMENT_RECEIVE' AND "lendingId" IS NULL
      `, [externalId]);
    }

    // REPAYMENT_PAY → REPAYMENT (lendingId付きならcounterpartyAccountId、なければ外部)
    const rpCount = await count(client, `SELECT COUNT(*) FROM account_transactions WHERE type = 'REPAYMENT_PAY'`);
    console.log(`REPAYMENT_PAY → REPAYMENT : ${rpCount} 件 (from=accountId, to=counterpartyAccountId or 外部)`);
    if (EXECUTE && rpCount > 0) {
      await client.query(`
        UPDATE account_transactions t
        SET type = 'REPAYMENT',
            "fromAccountId" = t."accountId",
            "toAccountId" = COALESCE(l."counterpartyAccountId", $1)
        FROM lendings l
        WHERE t.type = 'REPAYMENT_PAY' AND t."lendingId" = l.id
      `, [externalId]);
      await client.query(`
        UPDATE account_transactions
        SET type = 'REPAYMENT',
            "fromAccountId" = "accountId",
            "toAccountId" = $1
        WHERE type = 'REPAYMENT_PAY' AND "lendingId" IS NULL
      `, [externalId]);
    }

    // TRANSFER (out残ったやつ): 既存 from/to で正しい
    const transferRest = await count(client, `SELECT COUNT(*) FROM account_transactions WHERE type = 'TRANSFER'`);
    console.log(`TRANSFER (残存) : ${transferRest} 件 (既存fromAccountId/toAccountId維持)`);
    console.log('');

    // === Phase 5: LendingPayment → AccountTransaction(REPAYMENT) 変換 ===
    console.log('=== Phase 5: LendingPayment → AccountTransaction(REPAYMENT) 変換 ===');
    // 社内貸借ではLEND側とBORROW側のLendingに同じLPが作られる重複なので、
    // LEND側のLPのみを変換対象にする（社外貸借はそのまま）
    const lps = await client.query(`
      SELECT lp.id, lp."lendingId", lp.amount, lp.date, lp.memo, lp."createdAt",
             l."accountId", l."counterpartyAccountId", l.type AS lending_type
      FROM lending_payments lp
      JOIN lendings l ON lp."lendingId" = l.id
      WHERE l.type = 'LEND' OR l."counterpartyAccountId" IS NULL
    `);
    console.log(`変換予定: ${lps.rows.length} 件`);
    for (const lp of lps.rows) {
      const newId = generateCuidLike();
      const fromId = lp.lending_type === 'LEND' ? lp.counterpartyAccountId : lp.accountId;
      const toId = lp.lending_type === 'LEND' ? lp.accountId : lp.counterpartyAccountId;
      console.log(`  LP[${lp.id}] → AT lendingType=${lp.lending_type} amount=${lp.amount} from=${fromId || '(NULL)'} to=${toId || '(NULL)'}`);
      if (EXECUTE) {
        await client.query(`
          INSERT INTO account_transactions
            (id, type, amount, date, "fromAccountId", "toAccountId", "accountId", counterparty, "lendingId", memo, "editedBy", tags, "isArchived", "balanceAfter", "createdAt", "updatedAt")
          VALUES ($1, 'REPAYMENT', $2, $3, $4, $5, $4, '', $6, $7, '', ARRAY[]::text[], false, 0, $8, $8)
        `, [newId, lp.amount, lp.date, fromId, toId, lp.lendingId, lp.memo || '', lp.createdAt]);
      }
    }
    console.log('');

    // === 検証 ===
    console.log('=== 検証: from/to NOT NULL チェック ===');
    const stillNull = await count(client, `SELECT COUNT(*) FROM account_transactions WHERE "fromAccountId" IS NULL OR "toAccountId" IS NULL`);
    console.log(`from/to が NULL のレコード: ${stillNull} 件 (0であるべき)`);
    if (stillNull > 0 && EXECUTE) {
      throw new Error(`整合性エラー: from/to NULL レコードが ${stillNull} 件残っています`);
    }
    console.log('');

    if (EXECUTE) {
      await client.query('COMMIT');
      console.log('--- COMMIT ---');
    } else {
      console.log('=== DRY RUN 完了（DBに変更なし）===');
    }
  } catch (e) {
    if (EXECUTE) {
      try { await client.query('ROLLBACK'); console.error('--- ROLLBACK ---'); } catch (_) {}
    }
    console.error('エラー:', e.message);
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
