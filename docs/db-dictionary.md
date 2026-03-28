# データベース辞書

business-manager の全テーブル・カラム定義。

- DB: PostgreSQL
- ORM: Prisma
- ID生成: cuid()

---

## 目次

1. [businesses（事業）](#1-businesses事業)
2. [accounts（口座）](#2-accounts口座)
3. [categories（カテゴリ）](#3-categoriesカテゴリ)
4. [transactions（取引）](#4-transactions取引)
5. [fixed_costs（固定費）](#5-fixed_costs固定費)
6. [account_transactions（口座取引）](#6-account_transactions口座取引)
7. [lendings（貸借）](#7-lendings貸借)
8. [lending_payments（貸借返済）](#8-lending_payments貸借返済)
9. [employees（従業員）](#9-employees従業員)
10. [schedule_events（スケジュール）](#10-schedule_eventsスケジュール)
11. [Enum 定義](#11-enum-定義)
12. [ER図（リレーション）](#12-er図リレーション)

---

## 1. businesses（事業）

**Prisma モデル名:** `Business`

事業マスタ。取引・口座・固定費の親テーブル。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | 事業ID（PK） |
| `name` | String | NO | - | 事業名（例: アビトラ、スーパーサロン） |
| `isActive` | Boolean | NO | true | 有効フラグ |
| `createdAt` | DateTime | NO | now() | 作成日時 |
| `updatedAt` | DateTime | NO | 自動更新 | 更新日時 |

**リレーション:**

| 対象テーブル | 関係 | 説明 |
|---|---|---|
| transactions | 1:N | この事業の取引一覧 |
| accounts | 1:N | この事業に紐づく口座 |
| fixed_costs | 1:N | この事業の固定費 |

**インデックス:** なし（PKのみ）

**唯一の情報源:** はい。事業マスタの正データ。

**注意事項:** なし

---

## 2. accounts（口座）

**Prisma モデル名:** `Account`

口座マスタ。銀行口座・証券口座の両方を管理。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | 口座ID（PK） |
| `name` | String | NO | - | 口座名（例: 楽天銀行、SBI証券） |
| `ownerType` | OwnerType | NO | INTERNAL | 所有区分（社内/外部） |
| `accountType` | AccountType | NO | BANK | 口座種別（銀行/証券） |
| `businessId` | String | **YES** | - | 紐づく事業ID（FK、任意） |
| `isActive` | Boolean | NO | true | 有効フラグ |
| `createdAt` | DateTime | NO | now() | 作成日時 |
| `updatedAt` | DateTime | NO | 自動更新 | 更新日時 |

**リレーション:**

| 対象テーブル | 関係 | FK | 説明 |
|---|---|---|---|
| businesses | N:1 | businessId → businesses.id | 紐づく事業（任意） |
| transactions | 1:N | - | この口座の管理会計取引一覧 |
| fixed_costs | 1:N | - | この口座の固定費 |
| account_transactions | 1:N | - | この口座の口座取引一覧（AccountTransactions） |
| account_transactions | 1:N | - | 振替元としての口座取引（FromAccountTransactions） |
| account_transactions | 1:N | - | 振替先としての口座取引（ToAccountTransactions） |
| lendings | 1:N | - | この口座の貸借一覧 |
| lendings | 1:N | - | 相手口座としての貸借（CounterpartyLendings） |

**インデックス:** なし（PKのみ）

**唯一の情報源:** はい。口座マスタの正データ。

**注意事項:**
- 管理会計で選択可能なのは `ownerType=INTERNAL` かつ `accountType=BANK` のみ
- `businessId` は任意。事業横断の口座は null になる

---

## 3. categories（カテゴリ）

**Prisma モデル名:** `Category`

収支カテゴリマスタ。収入用と支出用に分かれる。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | カテゴリID（PK） |
| `name` | String | NO | - | カテゴリ名（例: サロン会費、外注費） |
| `type` | CategoryType | NO | - | 収入/支出の区分 |
| `isActive` | Boolean | NO | true | 有効フラグ |
| `createdAt` | DateTime | NO | now() | 作成日時 |
| `updatedAt` | DateTime | NO | 自動更新 | 更新日時 |

**リレーション:**

| 対象テーブル | 関係 | 説明 |
|---|---|---|
| transactions | 1:N | このカテゴリの取引一覧 |
| fixed_costs | 1:N | このカテゴリの固定費 |

**インデックス:** なし（PKのみ）

**唯一の情報源:** はい。カテゴリマスタの正データ。

**注意事項:**
- `type` により収入カテゴリと支出カテゴリが明確に分かれる
- 取引登録時、取引の `type` とカテゴリの `type` が一致する必要がある（アプリ側バリデーション）

---

## 4. transactions（取引）

**Prisma モデル名:** `Transaction`

取引トランザクションテーブル。管理会計の中核データ。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | 取引ID（PK） |
| `date` | DateTime (Date) | NO | - | 取引日（日付のみ、時刻なし） |
| `businessId` | String | **YES** | - | 事業ID（FK）。承認待ち（pending）はnull |
| `accountId` | String | NO | - | 口座ID（FK） |
| `categoryId` | String | **YES** | - | カテゴリID（FK）。承認待ち（pending）はnull |
| `type` | TransactionType | NO | - | 収支区分（INCOME/EXPENSE） |
| `costType` | CostType | **YES** | - | 固変区分（FIXED/VARIABLE）。支出のみ。収入は null |
| `status` | String | NO | "approved" | 承認状態（approved/pending/skipped） |
| `amount` | Int | NO | - | 金額（円、正の整数） |
| `comment` | String | NO | "" | コメント・メモ |
| `commentBy` | String | NO | "" | コメント記入者 |
| `isArchived` | Boolean | NO | false | アーカイブ済みフラグ |
| `createdAt` | DateTime | NO | now() | 作成日時 |
| `createdBy` | String | NO | "" | 作成者名 |
| `updatedAt` | DateTime | NO | 自動更新 | 更新日時 |

**リレーション:**

| 対象テーブル | 関係 | FK | 説明 |
|---|---|---|---|
| businesses | N:1 | businessId → businesses.id | 所属事業 |
| accounts | N:1 | accountId → accounts.id | 使用口座 |
| categories | N:1 | categoryId → categories.id | 仕訳カテゴリ |

**インデックス:**

| インデックス | カラム | 用途 |
|---|---|---|
| @@index([date]) | date | 日付検索の高速化 |
| @@index([businessId]) | businessId | 事業別検索の高速化 |
| @@index([type]) | type | 収支別検索の高速化 |
| @@index([status]) | status | 承認状態検索の高速化 |

**唯一の情報源:** はい。取引データの正データ。

**注意事項:**
- `date` は PostgreSQL の `Date` 型（`@db.Date`）。時刻情報は持たない
- `costType` は支出（EXPENSE）の場合のみ設定。収入（INCOME）の場合は null
- `status` は承認フロー用。口座管理から自動連携された利息・運用損益は `pending` で作成され、管理会計画面で承認（approved）またはスキップ（skipped）する。手動登録は `approved` がデフォルト
- `businessId` / `categoryId` は承認待ち（pending）の段階では null 許容。承認時にアプリ層で必須チェックする
- `isArchived` が true の取引は通常一覧に表示しない（論理削除相当）
- 物理削除用の DELETE エンドポイントは存在しない（アーカイブ運用）
- findMany はデフォルトで `status="approved"` のみ返す。pending を取得するにはパラメータで指定が必要

---

## 5. fixed_costs（固定費）

**Prisma モデル名:** `FixedCost`

毎月定期発生する固定費の定義テーブル。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | 固定費ID（PK） |
| `businessId` | String | NO | - | 事業ID（FK） |
| `accountId` | String | NO | - | 引き落とし口座ID（FK） |
| `categoryId` | String | NO | - | カテゴリID（FK） |
| `amount` | Int | NO | - | 月額金額（円、正の整数） |
| `dayOfMonth` | Int | NO | - | 毎月の引き落とし日（1〜31） |
| `memo` | String | NO | "" | メモ |
| `isActive` | Boolean | NO | true | 有効フラグ（false = 停止中） |
| `createdAt` | DateTime | NO | now() | 作成日時 |
| `updatedAt` | DateTime | NO | 自動更新 | 更新日時 |

**リレーション:**

| 対象テーブル | 関係 | FK | 説明 |
|---|---|---|---|
| businesses | N:1 | businessId → businesses.id | 所属事業 |
| accounts | N:1 | accountId → accounts.id | 引き落とし口座 |
| categories | N:1 | categoryId → categories.id | 仕訳カテゴリ |

**インデックス:** なし（PKのみ）

**唯一の情報源:** はい。固定費テンプレートの正データ。

**注意事項:**
- これは「テンプレート」であり、実際の取引データではない
- `dayOfMonth` が 31 の場合、月末日が 30 や 28 の月ではアプリ側で調整が必要
- `isActive` を false にすると固定費を停止できる（物理削除しない）

---

## 6. account_transactions（口座取引）

**Prisma モデル名:** `AccountTransaction`

口座取引台帳。全ての口座のお金の動きを一元管理。入出金・振替・貸借・利息・運用損益を記録する。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | 口座取引ID（PK） |
| `accountId` | String | NO | - | 対象口座ID（FK） |
| `type` | AccountTransactionType | NO | - | 取引種別（12種） |
| `amount` | Int | NO | - | 金額（円、常に正の値） |
| `date` | DateTime (Date) | NO | - | 取引日（日付のみ、時刻なし） |
| `fromAccountId` | String | **YES** | - | 振替元口座ID（FK、振替の場合） |
| `toAccountId` | String | **YES** | - | 振替先口座ID（FK、振替の場合） |
| `counterparty` | String | NO | "" | 相手名（貸借・利息の場合） |
| `linkedTransactionId` | String | **YES** | - | 自動計上した管理会計Transaction ID |
| `memo` | String | NO | "" | メモ |
| `editedBy` | String | NO | "" | 編集者 |
| `isArchived` | Boolean | NO | false | アーカイブ済みフラグ |
| `createdAt` | DateTime | NO | now() | 作成日時 |
| `updatedAt` | DateTime | NO | 自動更新 | 更新日時 |

**リレーション:**

| 対象テーブル | 関係 | FK | 説明 |
|---|---|---|---|
| accounts | N:1 | accountId → accounts.id | 対象口座（AccountTransactions） |
| accounts | N:1 | fromAccountId → accounts.id | 振替元口座（FromAccountTransactions） |
| accounts | N:1 | toAccountId → accounts.id | 振替先口座（ToAccountTransactions） |

**インデックス:**

| インデックス | カラム | 用途 |
|---|---|---|
| @@index([accountId]) | accountId | 口座別検索の高速化 |
| @@index([date]) | date | 日付検索の高速化 |
| @@index([type]) | type | 種別検索の高速化 |

**唯一の情報源:** はい。口座取引台帳の正データ。

**注意事項:**
- `date` は PostgreSQL の `Date` 型（`@db.Date`）。時刻情報は持たない
- `amount` は常に正の値。入金/出金の方向は `type` で判別する
- `fromAccountId` / `toAccountId` は `type=TRANSFER` の場合のみ使用。それ以外は null
- `counterparty` は貸借系・利息系の取引で相手名を記録する
- `linkedTransactionId` は口座取引から管理会計の Transaction を自動計上した際のリンク
- 貸借系6種（LEND, BORROW, REPAYMENT_RECEIVE, REPAYMENT_PAY, INTEREST_RECEIVE, INTEREST_PAY）はLending/LendingPayment作成時にuse-caseが自動計上する。口座取引モーダルからの手動登録は不可。

---

## 7. lendings（貸借）

**Prisma モデル名:** `Lending`

貸借管理。元本・未返済額・ステータスを管理。社内口座間はlinkedLendingIdで双方向ペア。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | 貸借ID（PK） |
| `accountId` | String | NO | - | どの口座からの貸借か（FK） |
| `counterparty` | String | NO | - | 相手名（社外の場合） |
| `counterpartyAccountId` | String | **YES** | - | 相手口座ID（FK、社内口座間の場合） |
| `linkedLendingId` | String | **YES** | - | ペアの貸借ID（社内口座間で互いにリンク、UNIQUE） |
| `type` | LendingType | NO | - | 貸出/借入 |
| `principal` | Int | NO | - | 元本（円） |
| `outstanding` | Int | NO | - | 未返済額（円） |
| `dueDate` | DateTime (Date) | **YES** | - | 返済期限（任意） |
| `status` | LendingStatus | NO | ACTIVE | 状態 |
| `memo` | String | NO | "" | メモ |
| `isArchived` | Boolean | NO | false | アーカイブ済みフラグ |
| `createdAt` | DateTime | NO | now() | 作成日時 |
| `updatedAt` | DateTime | NO | 自動更新 | 更新日時 |

**リレーション:**

| 対象テーブル | 関係 | FK | 説明 |
|---|---|---|---|
| accounts | N:1 | accountId → accounts.id | 自分側の口座 |
| accounts | N:1 | counterpartyAccountId → accounts.id | 相手口座（CounterpartyLendings） |
| lending_payments | 1:N | - | この貸借の返済記録 |

**インデックス:**

| インデックス | カラム | 用途 |
|---|---|---|
| @@index([accountId]) | accountId | 口座別検索の高速化 |
| @@index([counterpartyAccountId]) | counterpartyAccountId | 相手口座別検索の高速化 |
| @@index([status]) | status | ステータス検索の高速化 |

**ユニーク制約:** `linkedLendingId` （@unique）

**唯一の情報源:** はい。貸借マスタの正データ。

**注意事項:**
- 社内口座間の貸借は `counterpartyAccountId` で相手口座を指定し、`linkedLendingId` で双方向のペアをリンクする
- 社外の場合は `counterparty` に相手名を記録し、`counterpartyAccountId` は null
- `dueDate` は PostgreSQL の `Date` 型（`@db.Date`）。返済期限未定の場合は null
- `outstanding` は返済のたびに減算される。0 になったら `status=COMPLETED`
- Lending 作成時、口座取引（account_transactions）に LEND または BORROW が自動計上される

---

## 8. lending_payments（貸借返済）

**Prisma モデル名:** `LendingPayment`

貸借返済記録。返済の都度レコードを追加する。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | 返済ID（PK） |
| `lendingId` | String | NO | - | 対象の貸借ID（FK） |
| `amount` | Int | NO | - | 返済金額（円） |
| `date` | DateTime (Date) | NO | - | 返済日（日付のみ、時刻なし） |
| `memo` | String | NO | "" | メモ |
| `createdAt` | DateTime | NO | now() | 作成日時 |

**リレーション:**

| 対象テーブル | 関係 | FK | 説明 |
|---|---|---|---|
| lendings | N:1 | lendingId → lendings.id | 対象の貸借（onDelete: Cascade） |

**インデックス:**

| インデックス | カラム | 用途 |
|---|---|---|
| @@index([lendingId]) | lendingId | 貸借別検索の高速化 |

**唯一の情報源:** はい。貸借返済の正データ。

**注意事項:**
- `date` は PostgreSQL の `Date` 型（`@db.Date`）。時刻情報は持たない
- Lending が削除されると、紐づく LendingPayment も Cascade 削除される
- LendingPayment 作成時、口座取引（account_transactions）に REPAYMENT_RECEIVE または REPAYMENT_PAY が自動計上される

---

## 9. employees（従業員）

**Prisma モデル名:** `Employee`

従業員マスタ。スケジュール管理の主体。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | 従業員ID（PK） |
| `name` | String | NO | - | 名前（例: 野田、大成、麦田） |
| `color` | String | NO | "#3B82F6" | カレンダー表示色（HEX） |
| `googleCalId` | String | **YES** | - | Google サブカレンダー ID |
| `isActive` | Boolean | NO | true | 有効フラグ |
| `createdAt` | DateTime | NO | now() | 作成日時 |
| `updatedAt` | DateTime | NO | 自動更新 | 更新日時 |

**リレーション:**

| 対象テーブル | 関係 | 説明 |
|---|---|---|
| schedule_events | 1:N | この従業員の予定一覧 |

**インデックス:** なし（PKのみ）

**唯一の情報源:** はい。従業員マスタの正データ。

**注意事項:**
- `googleCalId` は Google Calendar 連携用。未連携の従業員は null
- `color` のデフォルトは青（#3B82F6、Tailwind blue-500）

---

## 10. schedule_events（スケジュール）

**Prisma モデル名:** `ScheduleEvent`

従業員の予定・スケジュールを管理するテーブル。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | String (cuid) | NO | cuid() | 予定ID（PK） |
| `title` | String | NO | - | 予定名 |
| `description` | String | NO | "" | 詳細・メモ |
| `startAt` | DateTime | NO | - | 開始日時 |
| `endAt` | DateTime | NO | - | 終了日時 |
| `allDay` | Boolean | NO | false | 終日フラグ |
| `eventType` | EventType | NO | MEETING | 予定種別 |
| `employeeId` | String | NO | - | 従業員ID（FK） |
| `googleEventId` | String | **YES** | - | Google Calendar イベントID |
| `createdAt` | DateTime | NO | now() | 作成日時 |
| `updatedAt` | DateTime | NO | 自動更新 | 更新日時 |

**リレーション:**

| 対象テーブル | 関係 | FK | 説明 |
|---|---|---|---|
| employees | N:1 | employeeId → employees.id | 対象従業員 |

**インデックス:**

| インデックス | カラム | 用途 |
|---|---|---|
| @@index([startAt]) | startAt | 日時範囲検索の高速化 |
| @@index([employeeId]) | employeeId | 従業員別検索の高速化 |
| @@index([eventType]) | eventType | 種別検索の高速化 |

**唯一の情報源:** Google Calendar と双方向同期の場合は `googleEventId` で紐付け。ローカルのみの予定も存在しうる。

**注意事項:**
- `googleEventId` は Google Calendar 連携済みイベントの識別子。ローカル専用予定は null
- `allDay` が true の場合、`startAt` / `endAt` の時刻部分は無視される

---

## 11. Enum 定義

### OwnerType（所有区分）

| 値 | 説明 |
|---|---|
| `INTERNAL` | 社内口座 |
| `EXTERNAL` | 外部口座 |

### AccountType（口座種別）

| 値 | 説明 |
|---|---|
| `BANK` | 銀行口座 |
| `SECURITIES` | 証券口座 |

### CategoryType（カテゴリ区分）

| 値 | 説明 |
|---|---|
| `INCOME` | 収入カテゴリ |
| `EXPENSE` | 支出カテゴリ |

### TransactionType（収支区分）

| 値 | 説明 |
|---|---|
| `INCOME` | 収入 |
| `EXPENSE` | 支出 |

### CostType（固変区分）

| 値 | 説明 |
|---|---|
| `FIXED` | 固定費 |
| `VARIABLE` | 変動費 |

### EventType（予定種別）

| 値 | 説明 |
|---|---|
| `MEETING` | 打ち合わせ |
| `HOLIDAY` | 休み |
| `OUTING` | 外出 |
| `WORK` | 作業 |
| `OTHER` | その他 |

### AccountTransactionType（口座取引種別）

| 値 | 説明 |
|---|---|
| `DEPOSIT` | 純入金 |
| `WITHDRAWAL` | 純出金 |
| `INVESTMENT` | 出資 |
| `TRANSFER` | 振替 |
| `LEND` | 貸出 |
| `BORROW` | 借入 |
| `REPAYMENT_RECEIVE` | 返済受取 |
| `REPAYMENT_PAY` | 返済支払 |
| `INTEREST_RECEIVE` | 利息受取 |
| `INTEREST_PAY` | 利息支払 |
| `GAIN` | 運用益 |
| `LOSS` | 運用損 |

**注意:** LEND, BORROW, REPAYMENT_RECEIVE, REPAYMENT_PAY, INTEREST_RECEIVE, INTEREST_PAY の6種はLending/LendingPayment作成時にuse-caseが自動計上する。手動登録不可。

### LendingType（貸借種別）

| 値 | 説明 |
|---|---|
| `LEND` | 貸出 |
| `BORROW` | 借入 |

### LendingStatus（貸借ステータス）

| 値 | 説明 |
|---|---|
| `ACTIVE` | 返済中 |
| `COMPLETED` | 完済 |
| `OVERDUE` | 延滞 |

---

## 12. ER図（リレーション）

```
businesses ──┬── 1:N ── transactions
             ├── 1:N ── accounts
             └── 1:N ── fixed_costs

accounts ────┬── 1:N ── transactions
             ├── 1:N ── fixed_costs
             ├── 1:N ── account_transactions (AccountTransactions)
             ├── 1:N ── account_transactions (FromAccountTransactions)
             ├── 1:N ── account_transactions (ToAccountTransactions)
             ├── 1:N ── lendings
             └── 1:N ── lendings (CounterpartyLendings)

categories ──┬── 1:N ── transactions
             └── 1:N ── fixed_costs

lendings ────── 1:N ── lending_payments

employees ───── 1:N ── schedule_events
```

**管理会計ドメイン:** businesses / accounts / categories がマスタ、transactions / fixed_costs がトランザクション

**口座管理ドメイン:** accounts がマスタ、account_transactions / lendings / lending_payments がトランザクション

**スケジュールドメイン:** employees がマスタ、schedule_events がトランザクション

管理会計ドメインと口座管理ドメインは accounts を共有する。スケジュールドメインとの間にリレーションはない。
