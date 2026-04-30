# 複式簿記化 修正ルール集

複式簿記版スキーマへの移行に伴うコード修正の指針。
`feature/double-entry-bookkeeping` ブランチでの実装時に参照する。

> **基本原則**
> 1. 1取引＝1レコード（fromAccountId/toAccountId 必須）
> 2. 外部口座（`Account.ownerType=EXTERNAL`）を介して全外部取引を表現
> 3. 残高は都度計算（`AccountBalanceSnapshot` で日次キャッシュ）
> 4. type は 12種に統合（方向違いは from/to で表現）

---

## 1. EXTERNAL口座のID取得方法

### 取得ルール
- 名前固定：`name = '外部'` の `ownerType = 'EXTERNAL'` レコード（DB上に1件のみ存在）
- 起動時に1回フェッチして in-memory キャッシュ（recreateの可能性ほぼゼロ）

### 実装パターン
```ts
// src/server/utils/external-account.ts
let cached: string | null = null;

export async function getExternalAccountId(prismaClient = prisma): Promise<string> {
  if (cached) return cached;
  const a = await prismaClient.account.findFirst({
    where: { ownerType: 'EXTERNAL', name: '外部' },
    select: { id: true },
  });
  if (!a) throw new Error('EXTERNAL口座が存在しません。データ移行を確認してください。');
  cached = a.id;
  return cached;
}
```

### 注意
- データ移行スクリプト `scripts/migrate-double-entry.js` で必ず Phase 1 で作成済み
- 環境変数化は不要（DB側で一意に保証）

---

## 2. type 12種マッピング表（旧16種 → 新12種）

| 旧 type | 新 type | 補足 |
|---------|---------|------|
| INITIAL | INITIAL | そのまま |
| DEPOSIT | DEPOSIT_WITHDRAWAL | from/to で方向区別 |
| WITHDRAWAL | DEPOSIT_WITHDRAWAL | 同上 |
| INVESTMENT | INVESTMENT | そのまま |
| TRANSFER | TRANSFER | そのまま（ただし1レコード方式に） |
| LEND | LENDING | from/to で方向区別 |
| BORROW | LENDING | 同上 |
| REPAYMENT_RECEIVE | REPAYMENT | 同上 |
| REPAYMENT_PAY | REPAYMENT | 同上 |
| INTEREST_RECEIVE | INTEREST | 同上 |
| INTEREST_PAY | INTEREST | 同上 |
| GAIN | GAIN | そのまま |
| LOSS | LOSS | そのまま |
| REVENUE | REVENUE | そのまま |
| MISC_EXPENSE | MISC_EXPENSE | そのまま |
| MISC_INCOME | MISC_INCOME | そのまま |

### 表示ラベル（UI用）
```ts
export const TYPE_LABELS: Record<AccountTransactionType, string> = {
  INITIAL: '初期残高',
  INVESTMENT: '出資',
  TRANSFER: '振替',
  LENDING: '貸借',
  REPAYMENT: '返済',
  INTEREST: '利息',
  DEPOSIT_WITHDRAWAL: '純入出金',
  GAIN: '運用益',
  LOSS: '運用損',
  REVENUE: '売上',
  MISC_EXPENSE: '雑費',
  MISC_INCOME: '雑収入',
};
```

---

## 3. type別 from/to 設定ルール

| type | 操作 | fromAccountId | toAccountId | 備考 |
|------|------|---------------|-------------|------|
| INITIAL | 初期残高 | 外部口座 | 対象口座 | 元金が外部から振り込まれた扱い |
| INVESTMENT | 出資 | 外部口座 | 対象口座 | 出資金の受入 |
| TRANSFER | 振替 | 出金元口座 | 入金先口座 | 内部間 |
| LENDING | 貸出 | 自分口座 | 相手口座 | 自分→相手 |
| LENDING | 借入 | 相手口座 | 自分口座 | 相手→自分 |
| REPAYMENT | 返済受取 | 相手口座 | 自分口座 | 相手→自分 |
| REPAYMENT | 返済支払 | 自分口座 | 相手口座 | 自分→相手 |
| INTEREST | 利息受取 | 外部口座 | 対象口座 | 外部→自分 |
| INTEREST | 利息支払 | 対象口座 | 外部口座 | 自分→外部 |
| DEPOSIT_WITHDRAWAL | 純入金 | 外部口座 | 対象口座 | 外部→内部 |
| DEPOSIT_WITHDRAWAL | 純出金 | 対象口座 | 外部口座 | 内部→外部 |
| GAIN | 運用益 | 外部口座 | 対象口座 | 外部→自分 |
| LOSS | 運用損 | 対象口座 | 外部口座 | 自分→外部 |
| REVENUE | 売上 | 外部口座 | 対象口座 | 外部→自分（counterparty=取引先） |
| MISC_INCOME | 雑収入 | 外部口座 | 対象口座 | 外部→自分 |
| MISC_EXPENSE | 雑費 | 対象口座 | 外部口座 | 自分→外部 |

### 重要
- 1取引で必ず両方とも非NULL
- 「相手口座」が DB に Account として存在しない外部の人/会社の場合は `counterparty` 文字列で記録し、相手口座は外部口座を使う

---

## 4. 残高計算ロジック

### 基本式
```
残高 = SUM(toAccountId=対象口座 のamount) − SUM(fromAccountId=対象口座 のamount)
```

### スナップショット使用版（高速化）
```
残高 = 直近スナップ.balance
     + SUM(toAccountId=対象口座 ＆ date > 直近スナップ.date のamount)
     − SUM(fromAccountId=対象口座 ＆ date > 直近スナップ.date のamount)
```

### 実装パターン
```ts
export async function getAccountBalance(accountId: string): Promise<number> {
  const snap = await prisma.accountBalanceSnapshot.findFirst({
    where: { accountId },
    orderBy: { date: 'desc' },
  });
  const baseDate = snap?.date ?? new Date(0);
  const baseBalance = snap?.balance ?? 0;

  const [inflow, outflow] = await Promise.all([
    prisma.accountTransaction.aggregate({
      _sum: { amount: true },
      where: { toAccountId: accountId, date: { gt: baseDate } },
    }),
    prisma.accountTransaction.aggregate({
      _sum: { amount: true },
      where: { fromAccountId: accountId, date: { gt: baseDate } },
    }),
  ]);

  return baseBalance + (inflow._sum.amount ?? 0) - (outflow._sum.amount ?? 0);
}
```

---

## 5. 未返済額計算ロジック

### 基本式
```
未返済額 = principal − SUM(REPAYMENT取引 のamount)
```

### LEND側 / BORROW側で取引方向が違う
- **LEND（貸出）側のLending**: 返済はrelevant相手 → 自分（toAccountId=Lending.accountId）
- **BORROW（借入）側のLending**: 返済は自分 → 相手（fromAccountId=Lending.accountId）

### 実装パターン
```ts
export async function getOutstanding(lending: { id: string; principal: number; accountId: string; type: 'LEND' | 'BORROW' }): Promise<number> {
  const sum = await prisma.accountTransaction.aggregate({
    _sum: { amount: true },
    where: {
      lendingId: lending.id,
      type: 'REPAYMENT',
      // LEND: 自分が貸した → 返済受取（to=自分）
      // BORROW: 自分が借りた → 返済支払（from=自分）
      ...(lending.type === 'LEND'
        ? { toAccountId: lending.accountId }
        : { fromAccountId: lending.accountId }),
    },
  });
  return lending.principal - (sum._sum.amount ?? 0);
}
```

---

## 6. status自動判定ロジック

### 判定ルール
```ts
export function computeLendingStatus(args: {
  outstanding: number;
  dueDate: Date | null;
  today?: Date;
}): 'ACTIVE' | 'COMPLETED' | 'OVERDUE' {
  const today = args.today ?? new Date();
  if (args.outstanding === 0) return 'COMPLETED';
  if (args.dueDate && args.dueDate < today) return 'OVERDUE';
  return 'ACTIVE';
}
```

### DTO組立時に追加
- `Lending.status` フィールドはDBにないので、DTO返却時に動的計算

---

## 7. スナップショット更新ルール

### 3つのトリガー

#### a) 日次バッチ（メイン）
- 毎日0時にcronで実行
- 全口座 × 前日の残高を計算 → `AccountBalanceSnapshot` に upsert（unique [accountId, date]）

#### b) 過去日遡り取引時（ユーザー操作）
- 取引登録/編集時、`date` が今日より前 → `Account.recalcRequiredFromDate` を更新
  - 既にフラグがある場合は、より古い日付に更新
- 翌日0時のバッチで `recalcRequiredFromDate` 以降のスナップショットを再生成 → フラグクリア

#### c) 取引登録時の即時更新（オプション・推奨：実装しない）
- 真実は AccountTransaction なので、表示時の都度計算で十分速い
- 即時書込は競合・整合性問題を生むので見送り

### 実装パターン（バッチ処理）
```ts
// scripts/snapshot-daily-batch.js (cron) - 毎日0時実行
async function generateSnapshots() {
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const accounts = await prisma.account.findMany({ where: { isArchived: false } });
  for (const a of accounts) {
    const balance = await calculateBalanceAt(a.id, yesterday);
    await prisma.accountBalanceSnapshot.upsert({
      where: { accountId_date: { accountId: a.id, date: yesterday } },
      update: { balance },
      create: { accountId: a.id, date: yesterday, balance },
    });
  }
  // recalcRequiredFromDate がある口座は遡って再生成
  const flagged = await prisma.account.findMany({ where: { recalcRequiredFromDate: { not: null } } });
  for (const a of flagged) {
    await regenerateSnapshotsFrom(a.id, a.recalcRequiredFromDate);
    await prisma.account.update({ where: { id: a.id }, data: { recalcRequiredFromDate: null } });
  }
}
```

---

## 8. UI表示ルール

### type別の表示
- 「自口座→外部」「外部→自口座」のような形で from/to を可視化
- TRANSFER: 「住信SBI → GMOメイン」
- 純入出金: 「純入金 (外部 → 住信SBI)」「純出金 (住信SBI → 外部)」
- 貸借: 「貸出 (自分 → 山田さん)」「借入 (山田さん → 自分)」

### 削除されるUI要素
- `direction` 表示（in/out バッジ）→ from/to で代替
- `linkedTransferId` 表示（振替ペア）→ 1レコードなので不要
- `balanceAfter` 表示（時点残高）→ スナップショットから引く or 削除

### 計算済みフィールドの表示
- `outstanding` / `status` は API レスポンスで計算済み値として返す（クライアント側計算なし）

---

## 9. API互換性ルール

### 廃止エンドポイント
- `POST /api/lending-payments` → 廃止
  - 代替: `POST /api/account-transactions` で `{ type: 'REPAYMENT', lendingId, fromAccountId, toAccountId, amount, date }` を送る

### 廃止フィールド（リクエスト時無視）
- `direction`, `linkedTransferId`, `linkedTransactionId`, `lendingPaymentId`, `accountId`（from/toに置き換え）, `balanceAfter`

### 廃止フィールド（レスポンス時null返却 or 削除）
- `Account.balance` → 別エンドポイントで計算値返却
- `Lending.outstanding` / `Lending.status` → DTO組立時に計算値追加

### 振替の入力形式
- 旧: `{ type: 'TRANSFER', accountId: A, fromAccountId: A, toAccountId: B }` → 2レコード作成
- 新: `{ type: 'TRANSFER', fromAccountId: A, toAccountId: B }` → 1レコード作成

### 純入出金の入力形式
- 旧: `{ type: 'DEPOSIT', accountId: A, amount: 100 }`
- 新: `{ type: 'DEPOSIT_WITHDRAWAL', fromAccountId: 外部ID, toAccountId: A, amount: 100 }`
- バックエンドで自動補完するヘルパー（旧→新変換ラッパ）を用意してもよい

---

## 修正実装順序

1. `lib/balance-delta.ts` - enum 12種更新（基礎）
2. `lib/recompute-balance-after.ts` - 廃止 or スナップショット書込関数に再定義
3. `types/dto.ts` - 不要フィールド削除（linkedTransferId, lendingPaymentId, direction, balanceAfter等）
4. `server/schemas/lending.schema.ts` - Zod validation を 12種に更新
5. `server/repositories/account-transaction.repository.ts` - DB層 from/to ベース
6. `server/repositories/lending.repository.ts` - status/outstanding 廃止
7. `server/repositories/account.repository.ts` - balance 廃止
8. `server/use-cases/upsert-initial-balance.use-case.ts` - INITIAL = 外部→対象
9. `server/use-cases/create-account-transaction.use-case.ts` - 振替1レコード化・EXTERNAL経由
10. `server/use-cases/update-account-transaction.use-case.ts` - 振替編集の単純化
11. `server/use-cases/get-account-transactions.use-case.ts` - DTO整備
12. `server/use-cases/get-account-details.use-case.ts` - 残高計算ロジック
13. `server/use-cases/create-lending.use-case.ts` - LENDING取引化
14. `server/use-cases/update-lending.use-case.ts` - status/outstanding廃止
15. `server/use-cases/get-lendings.use-case.ts` - 計算済みフィールド追加
16. `server/use-cases/create-lending-payment.use-case.ts` - REPAYMENT取引へ統合
17. `server/controllers/lending.controller.ts` - エンドポイント整理
18. `features/lending/components/*` - UI更新（5ファイル）
19. `hooks/use-lending.ts` - React Query更新
20. `app/balance/*` - ページ更新

---

## チェックリスト（実装時）

各ファイル修正時に確認：

- [ ] 旧 type 値（DEPOSIT/WITHDRAWAL/LEND/BORROW/REPAYMENT_*/INTEREST_*）が残っていないか
- [ ] `accountId` フィールド参照が残っていないか（from/to に統一）
- [ ] `direction` / `linkedTransferId` / `linkedTransactionId` / `lendingPaymentId` / `balanceAfter` が残っていないか
- [ ] `Account.balance` 直接参照が残っていないか（getAccountBalance 経由か）
- [ ] `Lending.outstanding` / `Lending.status` 直接参照が残っていないか
- [ ] LendingPayment テーブル参照が残っていないか
- [ ] 振替が2レコード作成になっていないか（1レコードか）
- [ ] 純入出金がEXTERNAL口座経由になっているか
