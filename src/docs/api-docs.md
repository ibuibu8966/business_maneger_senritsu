# API ドキュメント — 管理会計モジュール

## GET /api/accounting/transactions
- 用途: 取引一覧取得
- 認証: なし（将来追加予定）
- Query Parameters:
  - `dateFrom` (optional): 開始日 "YYYY-MM-DD"
  - `dateTo` (optional): 終了日 "YYYY-MM-DD"
  - `businessId` (optional): 事業ID
  - `accountId` (optional): 口座ID
  - `categoryId` (optional): カテゴリID
  - `type` (optional): "income" | "expense"
  - `isArchived` (optional): "true" | "false"
- Response 200: TransactionDTO[]
- 使用use-case: GetTransactions

## POST /api/accounting/transactions
- 用途: 取引新規登録
- 認証: なし（将来追加予定）
- Request Body:
  ```json
  {
    "date": "2026-03-01",
    "businessId": "b1",
    "accountId": "a1",
    "categoryId": "c1",
    "type": "income",
    "costType": "variable",  // optional, expense時のみ
    "amount": 100000,
    "comment": "メモ",        // optional
    "commentBy": "野田",      // optional
    "createdBy": "野田"       // optional
  }
  ```
- Response 201: TransactionDTO
- Response 400: zodバリデーションエラー
- 使用use-case: CreateTransaction

## PATCH /api/accounting/transactions/:id
- 用途: 取引更新（アーカイブ含む）
- 認証: なし（将来追加予定）
- Request Body: 更新したいフィールドのみ
  ```json
  {
    "amount": 150000,
    "isArchived": true
  }
  ```
- Response 200: TransactionDTO
- Response 400: zodバリデーションエラー
- 使用use-case: UpdateTransaction

## GET /api/accounting/businesses
- 用途: 事業一覧取得（isActive=trueのみ）
- 認証: なし
- Response 200: BusinessDTO[]
- 使用use-case: GetBusinesses

## GET /api/accounting/accounts
- 用途: 口座一覧取得（管理会計用: ownerType=INTERNAL & accountType=BANK のみ）
- 認証: なし
- Response 200: AccountDTO[]
- 使用use-case: GetAccounts

## GET /api/accounting/categories
- 用途: カテゴリ一覧取得（isActive=trueのみ）
- 認証: なし
- Response 200: CategoryDTO[]
- 使用use-case: GetCategories

## GET /api/accounting/fixed-costs
- 用途: 固定費一覧取得
- 認証: なし
- Response 200: FixedCostDTO[]
- 使用use-case: GetFixedCosts

## POST /api/accounting/fixed-costs
- 用途: 固定費新規登録
- Request Body:
  ```json
  {
    "businessId": "b2",
    "accountId": "a2",
    "categoryId": "c14",
    "amount": 150000,
    "dayOfMonth": 25,
    "memo": "事務所家賃"
  }
  ```
- Response 201: FixedCostDTO
- Response 400: zodバリデーションエラー

## PATCH /api/accounting/fixed-costs/:id
- 用途: 固定費更新（有効/無効切替含む）
- Request Body: 更新したいフィールドのみ
  ```json
  {
    "isActive": false
  }
  ```
- Response 200: FixedCostDTO

---

## GET /api/accounting/credit-cards
- 用途: クレカ一覧取得
- 認証: なし
- Response 200: CreditCardDTO[]
- 使用use-case: GetCreditCards

## POST /api/accounting/credit-cards
- 用途: クレカ新規登録
- Request Body:
  ```json
  {
    "name": "楽天カード",
    "accountId": "a1",
    "withdrawalDay": 27,
    "memo": "メインカード"  // optional
  }
  ```
- Response 201: CreditCardDTO
- Response 400: zodバリデーションエラー

## PATCH /api/accounting/credit-cards/:id
- 用途: クレカ更新（有効/無効切替含む）
- Request Body: 更新したいフィールドのみ
  ```json
  {
    "name": "楽天カード（個人）",
    "accountId": "a2",
    "withdrawalDay": 25,
    "memo": "サブカード",
    "isActive": false
  }
  ```
- Response 200: CreditCardDTO
- Response 400: zodバリデーションエラー

## POST /api/accounting/credit-cards/generate-pending
- 用途: 今日が引き落とし日のクレカに対して承認待ちTransaction（pending）を自動生成
- Request Body: なし
- Response 200:
  ```json
  { "count": 2 }
  ```
  - count: 新規生成された承認待ちTransactionの件数（既存がある場合はスキップ）
- Response 500: エラー

---

## GET /api/accounting/subscriptions
- 用途: サブスク一覧取得
- 認証: なし
- Response 200: SubscriptionEntryDTO[]
- 使用use-case: GetSubscriptionEntries

## POST /api/accounting/subscriptions
- 用途: サブスク新規登録
- Request Body:
  ```json
  {
    "name": "ChatGPT Plus",
    "creditCardId": "cc1",   // optional, nullable
    "amount": 3000,
    "dayOfMonth": 15,
    "categoryId": "c5",      // optional, nullable
    "memo": "AI利用料"        // optional
  }
  ```
- Response 201: SubscriptionEntryDTO
- Response 400: zodバリデーションエラー

## PATCH /api/accounting/subscriptions/:id
- 用途: サブスク更新（有効/無効切替含む）
- Request Body: 更新したいフィールドのみ
  ```json
  {
    "name": "ChatGPT Plus",
    "creditCardId": "cc2",
    "amount": 3500,
    "dayOfMonth": 20,
    "categoryId": "c6",
    "memo": "値上げ後",
    "isActive": false
  }
  ```
- Response 200: SubscriptionEntryDTO
- Response 400: zodバリデーションエラー

---

## GET /api/lending/tags
- 用途: タグ一覧取得
- 認証: なし
- Response 200: AccountTagDTO[]
- 使用use-case: AccountTagUseCase.list

## POST /api/lending/tags
- 用途: タグ新規作成
- Request Body:
  ```json
  {
    "name": "運用中",
    "color": "blue"    // optional
  }
  ```
- Response 201: AccountTagDTO
- Response 400: zodバリデーションエラー

## PATCH /api/lending/tags/:id
- 用途: タグ更新
- Request Body: 更新したいフィールドのみ
  ```json
  {
    "name": "凍結中",
    "color": "red"
  }
  ```
- Response 200: AccountTagDTO
- Response 400: zodバリデーションエラー

## DELETE /api/lending/tags/:id
- 用途: タグ削除
- Response 200:
  ```json
  { "ok": true }
  ```
- Response 500: エラー

---

## DTO型定義

### TransactionDTO
| フィールド | 型 | 説明 |
|---|---|---|
| id | string | 取引ID |
| date | string | 取引日 "YYYY-MM-DD" |
| businessId | string | 事業ID |
| businessName | string | 事業名 |
| accountId | string | 口座ID |
| accountName | string | 口座名 |
| categoryId | string | カテゴリID |
| categoryName | string | カテゴリ名 |
| type | "income" \| "expense" | 収支区分 |
| costType | "fixed" \| "variable" \| undefined | 固変区分（支出のみ） |
| amount | number | 金額（円） |
| comment | string | コメント |
| commentBy | string | コメント記入者 |
| isArchived | boolean | アーカイブ済みフラグ |
| createdAt | string | 作成日時 ISO |
| createdBy | string | 作成者 |

### BusinessDTO
| フィールド | 型 | 説明 |
|---|---|---|
| id | string | 事業ID |
| name | string | 事業名 |

### AccountDTO
| フィールド | 型 | 説明 |
|---|---|---|
| id | string | 口座ID |
| name | string | 口座名 |
| businessId | string \| null | 紐づく事業ID |

### CategoryDTO
| フィールド | 型 | 説明 |
|---|---|---|
| id | string | カテゴリID |
| name | string | カテゴリ名 |
| type | "income" \| "expense" | 収入/支出 |

### FixedCostDTO
| フィールド | 型 | 説明 |
|---|---|---|
| id | string | 固定費ID |
| businessId | string | 事業ID |
| businessName | string | 事業名 |
| accountId | string | 口座ID |
| accountName | string | 口座名 |
| categoryId | string | カテゴリID |
| categoryName | string | カテゴリ名 |
| amount | number | 月額金額（円） |
| dayOfMonth | number | 毎月の引き落とし日 |
| memo | string | メモ |
| isActive | boolean | 有効フラグ |

### CreditCardDTO
| フィールド | 型 | 説明 |
|---|---|---|
| id | string | クレカID |
| name | string | カード名 |
| accountId | string | 引き落とし口座ID |
| accountName | string | 引き落とし口座名 |
| withdrawalDay | number | 毎月の引き落とし日 |
| memo | string | メモ |
| isActive | boolean | 有効フラグ |

### SubscriptionEntryDTO
| フィールド | 型 | 説明 |
|---|---|---|
| id | string | サブスクID |
| name | string | サブスク名 |
| creditCardId | string \| null | 紐づくクレカID |
| creditCardName | string \| null | 紐づくクレカ名 |
| amount | number | 月額金額（円） |
| dayOfMonth | number | 毎月の支払日 |
| categoryId | string \| null | カテゴリID |
| categoryName | string \| null | カテゴリ名 |
| memo | string | メモ |
| isActive | boolean | 有効フラグ |

### AccountTagDTO
| フィールド | 型 | 説明 |
|---|---|---|
| id | string | タグID |
| name | string | タグ名 |
| color | string | バッジの色 |
| createdAt | string | 作成日時 ISO |
