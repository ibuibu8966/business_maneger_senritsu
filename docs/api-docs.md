# API ドキュメント

business-manager の全 API エンドポイント仕様書。

---

## 目次

1. [取引（Transactions）](#1-取引transactions)
2. [固定費（Fixed Costs）](#2-固定費fixed-costs)
3. [事業（Businesses）](#3-事業businesses)
4. [口座（Accounts）](#4-口座accounts)
5. [カテゴリ（Categories）](#5-カテゴリcategories)
6. [貸借・口座管理（Lending）](#6-貸借口座管理lending)

---

## 共通仕様

### ベースパス

```
/api/accounting
```

### エラーレスポンス形式

| ステータス | 形式 | 説明 |
|---|---|---|
| 400 | `{ "errors": ZodIssue[] }` | バリデーションエラー（Zodスキーマ違反） |
| 500 | `{ "error": string }` | サーバーエラー（日本語メッセージ） |

---

## 1. 取引（Transactions）

### GET /api/accounting/transactions

取引一覧を取得する。

**用途:** 管理会計画面での取引一覧表示・フィルタ検索

**Query Params:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `dateFrom` | string | - | 取得開始日（YYYY-MM-DD） |
| `dateTo` | string | - | 取得終了日（YYYY-MM-DD） |
| `businessId` | string | - | 事業IDでフィルタ |
| `accountId` | string | - | 口座IDでフィルタ |
| `categoryId` | string | - | カテゴリIDでフィルタ |
| `type` | string | - | 収支区分（`INCOME` / `EXPENSE`、大文字に変換される） |
| `status` | string | - | 承認状態（`"approved"` / `"pending"` / `"skipped"`）。省略時は `"approved"` |
| `isArchived` | string | - | アーカイブ状態（`"true"` / `"false"`） |

**Response:** `200 OK`

```ts
TransactionDTO[]
```

```ts
interface TransactionDTO {
  id: string
  date: string                      // "YYYY-MM-DD"
  businessId: string | null         // pending時はnull
  businessName: string | null       // pending時はnull
  accountId: string
  accountName: string
  categoryId: string | null         // pending時はnull
  categoryName: string | null       // pending時はnull
  type: "income" | "expense"
  costType?: "fixed" | "variable"
  status: "approved" | "pending" | "skipped"
  amount: number
  comment: string
  commentBy: string
  isArchived: boolean
  createdAt: string
  createdBy: string
}
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 500 | `{ "error": "取引の取得に失敗しました" }` |

**使用 use-case:** `GetTransactions`

---

### POST /api/accounting/transactions

新規取引を登録する。

**用途:** 管理会計画面での取引入力

**Request Body:**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `date` | string | **必須** | 取引日（YYYY-MM-DD） |
| `businessId` | string | **必須** | 事業ID |
| `accountId` | string | **必須** | 口座ID |
| `categoryId` | string | **必須** | カテゴリID |
| `type` | `"income"` \| `"expense"` | **必須** | 収支区分 |
| `costType` | `"fixed"` \| `"variable"` | - | 固変区分（支出時のみ） |
| `amount` | number | **必須** | 金額（正の整数、円単位） |
| `comment` | string | - | コメント・メモ |
| `commentBy` | string | - | コメント記入者 |
| `createdBy` | string | - | 作成者名 |

**Response:** `201 Created`

```ts
TransactionDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "取引の登録に失敗しました" }` |

**使用 use-case:** `CreateTransaction`

---

### PATCH /api/accounting/transactions/:id

既存の取引を更新する。

**用途:** 取引内容の修正、アーカイブ操作

**パスパラメータ:**

| パラメータ | 型 | 説明 |
|---|---|---|
| `id` | string | 取引ID（cuid） |

**Request Body:**（全フィールド任意。送信したフィールドのみ更新）

| フィールド | 型 | 説明 |
|---|---|---|
| `date` | string | 取引日（YYYY-MM-DD） |
| `businessId` | string | 事業ID |
| `accountId` | string | 口座ID |
| `categoryId` | string | カテゴリID |
| `type` | `"income"` \| `"expense"` | 収支区分 |
| `costType` | `"fixed"` \| `"variable"` \| `null` | 固変区分（nullで解除可） |
| `status` | `"approved"` \| `"pending"` \| `"skipped"` | 承認状態（承認/スキップ操作用） |
| `amount` | number | 金額（正の整数） |
| `comment` | string | コメント |
| `commentBy` | string | コメント記入者 |
| `isArchived` | boolean | アーカイブフラグ |

**Response:** `200 OK`

```ts
TransactionDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "取引の更新に失敗しました" }` |

**使用 use-case:** `UpdateTransaction`

---

## 2. 固定費（Fixed Costs）

### GET /api/accounting/fixed-costs

固定費一覧を取得する。

**用途:** 固定費管理画面での一覧表示

**Query Params:** なし

**Response:** `200 OK`

```ts
FixedCostDTO[]
```

```ts
interface FixedCostDTO {
  id: string
  businessId: string
  businessName: string
  accountId: string
  accountName: string
  categoryId: string
  categoryName: string
  amount: number
  dayOfMonth: number
  memo: string
  isActive: boolean
}
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 500 | `{ "error": "固定費一覧の取得に失敗しました" }` |

**使用 use-case:** `GetFixedCosts`

---

### POST /api/accounting/fixed-costs

新規固定費を登録する。

**用途:** 毎月発生する固定費の登録

**Request Body:**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `businessId` | string | **必須** | 事業ID |
| `accountId` | string | **必須** | 引き落とし口座ID |
| `categoryId` | string | **必須** | カテゴリID |
| `amount` | number | **必須** | 月額金額（正の整数、円単位） |
| `dayOfMonth` | number | **必須** | 毎月の引き落とし日（1〜31） |
| `memo` | string | - | メモ |

**Response:** `201 Created`

```ts
FixedCostDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "固定費の登録に失敗しました" }` |

**使用リポジトリ:** `FixedCostRepository.create`

---

### PATCH /api/accounting/fixed-costs/:id

既存の固定費を更新する。

**用途:** 固定費の金額変更、無効化（停止）

**パスパラメータ:**

| パラメータ | 型 | 説明 |
|---|---|---|
| `id` | string | 固定費ID（cuid） |

**Request Body:**（全フィールド任意。送信したフィールドのみ更新）

| フィールド | 型 | 説明 |
|---|---|---|
| `businessId` | string | 事業ID |
| `accountId` | string | 引き落とし口座ID |
| `categoryId` | string | カテゴリID |
| `amount` | number | 月額金額（正の整数） |
| `dayOfMonth` | number | 引き落とし日（1〜31） |
| `memo` | string | メモ |
| `isActive` | boolean | 有効フラグ（falseで停止） |

**Response:** `200 OK`

```ts
FixedCostDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "固定費の更新に失敗しました" }` |

**使用リポジトリ:** `FixedCostRepository.update`

---

## 3. 事業（Businesses）

### GET /api/accounting/businesses

事業一覧を取得する。

**用途:** セレクトボックス等でのマスタデータ表示

**Query Params:** なし

**Response:** `200 OK`

```ts
BusinessDTO[]
```

```ts
interface BusinessDTO {
  id: string
  name: string
}
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 500 | `{ "error": "事業一覧の取得に失敗しました" }` |

**使用 use-case:** `GetBusinesses`

---

## 4. 口座（Accounts）

### GET /api/accounting/accounts

口座一覧を取得する。

**用途:** セレクトボックス等でのマスタデータ表示

**Query Params:** なし

**Response:** `200 OK`

```ts
AccountDTO[]
```

```ts
interface AccountDTO {
  id: string
  name: string
  businessId: string | null
}
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 500 | `{ "error": "口座一覧の取得に失敗しました" }` |

**使用 use-case:** `GetAccounts`

---

## 5. カテゴリ（Categories）

### GET /api/accounting/categories

カテゴリ一覧を取得する。

**用途:** セレクトボックス等でのマスタデータ表示

**Query Params:** なし

**Response:** `200 OK`

```ts
CategoryDTO[]
```

```ts
interface CategoryDTO {
  id: string
  name: string
  type: "income" | "expense"
}
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 500 | `{ "error": "カテゴリ一覧の取得に失敗しました" }` |

**使用 use-case:** `GetCategories`

---

## 6. 貸借・口座管理（Lending）

### ベースパス

```
/api/lending
```

### DTO インターフェース

```ts
type AccountTransactionTypeDTO =
  | "deposit"
  | "withdrawal"
  | "investment"
  | "transfer"
  | "lend"
  | "borrow"
  | "repayment_receive"
  | "repayment_pay"
  | "interest_receive"
  | "interest_pay"
  | "gain"
  | "loss"

interface AccountDetailDTO {
  id: string
  name: string
  ownerType: "internal" | "external"
  accountType: "bank" | "securities"
  businessId: string | null
  businessName: string | null
  balance: number
  purpose: string
  investmentPolicy: string
  isArchived: boolean
  isActive: boolean
  createdAt: string
}

interface AccountTransactionDTO {
  id: string
  accountId: string
  accountName: string
  type: AccountTransactionTypeDTO
  amount: number
  date: string                    // "YYYY-MM-DD"
  fromAccountId: string | null
  fromAccountName: string | null
  toAccountId: string | null
  toAccountName: string | null
  counterparty: string
  linkedTransactionId: string | null
  memo: string
  editedBy: string
  isArchived: boolean
  createdAt: string
}

interface LendingDTO {
  id: string
  accountId: string
  accountName: string
  counterparty: string
  counterpartyAccountId: string | null
  counterpartyAccountName: string | null
  linkedLendingId: string | null
  type: "lend" | "borrow"
  principal: number
  outstanding: number
  dueDate: string | null          // "YYYY-MM-DD"
  status: "active" | "completed" | "overdue"
  memo: string
  isArchived: boolean
  createdAt: string
  payments: LendingPaymentDTO[]
}

interface LendingPaymentDTO {
  id: string
  lendingId: string
  amount: number
  date: string                    // "YYYY-MM-DD"
  memo: string
  createdAt: string
}
```

---

### 6-1. 口座（Accounts）

#### GET /api/lending/accounts

口座一覧を取得する。

**用途:** 貸借・口座管理画面での口座一覧表示・フィルタ検索

**Query Params:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `ownerType` | string | - | 口座所有者区分（`"internal"` / `"external"`、大文字に変換される） |
| `accountType` | string | - | 口座種別（`"bank"` / `"securities"`、大文字に変換される） |
| `isArchived` | string | - | アーカイブ状態（`"true"` / `"false"`） |
| `isActive` | string | - | 有効状態（`"true"` / `"false"`） |

**Response:** `200 OK`

```ts
AccountDetailDTO[]
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 500 | `{ "error": "口座の取得に失敗しました" }` |

**使用 use-case:** `GetAccountDetails`

---

#### GET /api/lending/accounts/:id

口座を1件取得する。

**用途:** 口座詳細画面での表示

**パスパラメータ:**

| パラメータ | 型 | 説明 |
|---|---|---|
| `id` | string | 口座ID（cuid） |

**Response:** `200 OK`

```ts
AccountDetailDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 404 | `{ "error": "口座が見つかりません" }` |
| 500 | `{ "error": "口座の取得に失敗しました" }` |

**使用 use-case:** `GetAccountDetails`

---

#### POST /api/lending/accounts

新規口座を登録する。

**用途:** 貸借・口座管理画面での口座追加

**Request Body:**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `name` | string | **必須** | 口座名（1文字以上） |
| `ownerType` | `"internal"` \| `"external"` | **必須** | 口座所有者区分 |
| `accountType` | `"bank"` \| `"securities"` | **必須** | 口座種別 |
| `businessId` | string \| null | - | 紐づく事業ID |
| `balance` | number | - | 初期残高（整数、円単位） |
| `purpose` | string | - | 口座用途 |
| `investmentPolicy` | string | - | 運用方針 |

**Response:** `201 Created`

```ts
AccountDetailDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "口座の登録に失敗しました" }` |

**使用 use-case:** `CreateAccount`

---

#### PATCH /api/lending/accounts/:id

既存の口座を更新する。

**用途:** 口座情報の変更、アーカイブ・無効化

**パスパラメータ:**

| パラメータ | 型 | 説明 |
|---|---|---|
| `id` | string | 口座ID（cuid） |

**Request Body:**（全フィールド任意。送信したフィールドのみ更新）

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | string | 口座名（1文字以上） |
| `ownerType` | `"internal"` \| `"external"` | 口座所有者区分 |
| `accountType` | `"bank"` \| `"securities"` | 口座種別 |
| `businessId` | string \| null | 紐づく事業ID |
| `balance` | number | 残高（整数、円単位） |
| `purpose` | string | 口座用途 |
| `investmentPolicy` | string | 運用方針 |
| `isArchived` | boolean | アーカイブフラグ |
| `isActive` | boolean | 有効フラグ |

**Response:** `200 OK`

```ts
AccountDetailDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "口座の更新に失敗しました" }` |

**使用 use-case:** `UpdateAccount`

---

### 6-2. サマリー（Summary）

#### GET /api/lending/summary

純資産サマリーを取得する。有効口座の残高合計・貸出中・借入中・純資産を返す。

**用途:** ダッシュボードでの純資産表示

**Query Params:** なし

**Response:** `200 OK`

```ts
interface LendingSummaryResponse {
  totalBalance: number      // 有効口座の残高合計
  totalLent: number         // 貸出中の未回収残高合計（外部のみ）
  totalBorrowed: number     // 借入中の未返済残高合計（外部のみ）
  netAssets: number         // 純資産 = totalBalance + totalLent - totalBorrowed
}
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 500 | `{ "error": "サマリーの取得に失敗しました" }` |

**使用 use-case:** `GetAccountDetails`

---

### 6-3. 口座取引（Account Transactions）

#### GET /api/lending/transactions

口座取引一覧を取得する。

**用途:** 口座取引履歴の表示・フィルタ検索

**Query Params:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `accountId` | string | - | 口座IDでフィルタ |
| `type` | string | - | 取引種別でフィルタ（大文字に変換される） |
| `dateFrom` | string | - | 取得開始日（YYYY-MM-DD） |
| `dateTo` | string | - | 取得終了日（YYYY-MM-DD） |
| `isArchived` | string | - | アーカイブ状態（`"true"` / `"false"`） |

**Response:** `200 OK`

```ts
AccountTransactionDTO[]
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 500 | `{ "error": "口座取引の取得に失敗しました" }` |

**使用 use-case:** `GetAccountTransactions`

---

#### POST /api/lending/transactions

新規口座取引を登録する。

**用途:** 入出金・振替・投資等の取引記録

**Request Body:**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `accountId` | string | **必須** | 口座ID |
| `type` | AccountTransactionTypeDTO | **必須** | 取引種別 |
| `amount` | number | **必須** | 金額（正の整数、円単位） |
| `date` | string | **必須** | 取引日（YYYY-MM-DD） |
| `fromAccountId` | string \| null | - | 振替元口座ID |
| `toAccountId` | string \| null | - | 振替先口座ID |
| `counterparty` | string | - | 取引先名 |
| `memo` | string | - | メモ |
| `editedBy` | string | - | 編集者名 |
| `businessId` | string | - | 事業ID |
| `categoryId` | string | - | カテゴリID |

**Response:** `201 Created`

```ts
AccountTransactionDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "口座取引の登録に失敗しました" }` |

**使用 use-case:** `CreateAccountTransaction`

---

#### PATCH /api/lending/transactions/:id

既存の口座取引を更新する。

**用途:** 口座取引の修正、アーカイブ操作

**パスパラメータ:**

| パラメータ | 型 | 説明 |
|---|---|---|
| `id` | string | 口座取引ID（cuid） |

**Request Body:**（全フィールド任意。送信したフィールドのみ更新）

| フィールド | 型 | 説明 |
|---|---|---|
| `type` | AccountTransactionTypeDTO | 取引種別 |
| `amount` | number | 金額（正の整数） |
| `date` | string | 取引日（YYYY-MM-DD） |
| `fromAccountId` | string \| null | 振替元口座ID |
| `toAccountId` | string \| null | 振替先口座ID |
| `counterparty` | string | 取引先名 |
| `memo` | string | メモ |
| `editedBy` | string | 編集者名 |
| `isArchived` | boolean | アーカイブフラグ |

**Response:** `200 OK`

```ts
AccountTransactionDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "口座取引の更新に失敗しました" }` |

**使用 use-case:** `UpdateAccountTransaction`

---

### 6-4. 貸借（Lendings）

#### GET /api/lending/lendings

貸借一覧を取得する。

**用途:** 貸借管理画面での一覧表示・フィルタ検索

**Query Params:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `accountId` | string | - | 口座IDでフィルタ |
| `type` | string | - | 貸借区分（`"lend"` / `"borrow"`、大文字に変換される） |
| `status` | string | - | ステータス（`"active"` / `"completed"` / `"overdue"`、大文字に変換される） |
| `isArchived` | string | - | アーカイブ状態（`"true"` / `"false"`） |

**Response:** `200 OK`

```ts
LendingDTO[]
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 500 | `{ "error": "貸借の取得に失敗しました" }` |

**使用 use-case:** `GetLendings`

---

#### POST /api/lending/lendings

新規貸借を登録する。

**用途:** 貸出・借入の記録

**Request Body:**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `accountId` | string | **必須** | 口座ID |
| `counterparty` | string | **必須** | 取引先名（1文字以上） |
| `counterpartyAccountId` | string \| null | - | 相手方の口座ID（社内口座間の場合） |
| `type` | `"lend"` \| `"borrow"` | **必須** | 貸借区分 |
| `principal` | number | **必須** | 元本金額（正の整数、円単位） |
| `dueDate` | string \| null | - | 返済期日（YYYY-MM-DD） |
| `memo` | string | - | メモ |

**Response:** `201 Created`

```ts
LendingDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "貸借の登録に失敗しました" }` |

**使用 use-case:** `CreateLending`

---

#### PATCH /api/lending/lendings/:id

既存の貸借を更新する。

**用途:** 貸借情報の修正、ステータス変更、アーカイブ操作

**パスパラメータ:**

| パラメータ | 型 | 説明 |
|---|---|---|
| `id` | string | 貸借ID（cuid） |

**Request Body:**（全フィールド任意。送信したフィールドのみ更新）

| フィールド | 型 | 説明 |
|---|---|---|
| `counterparty` | string | 取引先名 |
| `outstanding` | number | 未回収/未返済残高（整数） |
| `dueDate` | string \| null | 返済期日（YYYY-MM-DD、nullで解除可） |
| `status` | `"active"` \| `"completed"` \| `"overdue"` | ステータス |
| `memo` | string | メモ |
| `isArchived` | boolean | アーカイブフラグ |

**Response:** `200 OK`

```ts
LendingDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "貸借の更新に失敗しました" }` |

**使用 use-case:** `UpdateLending`

---

### 6-5. 返済（Payments）

#### POST /api/lending/payments

返済を登録する。

**用途:** 貸借に対する返済の記録

**Request Body:**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `lendingId` | string | **必須** | 貸借ID |
| `amount` | number | **必須** | 返済金額（正の整数、円単位） |
| `date` | string | **必須** | 返済日（YYYY-MM-DD） |
| `memo` | string | - | メモ |

**Response:** `201 Created`

```ts
LendingPaymentDTO
```

**エラーレスポンス:**

| ステータス | レスポンス |
|---|---|
| 400 | `{ "errors": ZodIssue[] }` — バリデーションエラー |
| 500 | `{ "error": "返済の登録に失敗しました" }` |

**使用 use-case:** `CreateLendingPayment`
