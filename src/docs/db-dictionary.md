# データベース辞書 — 管理会計モジュール

## テーブル一覧

| テーブル名 | モデル名 | 説明 | 唯一の情報源？ |
|---|---|---|---|
| businesses | Business | 事業マスタ | ◯ |
| accounts | Account | 口座マスタ | ◯ |
| categories | Category | カテゴリマスタ | ◯ |
| transactions | Transaction | 取引明細 | ◯ |
| fixed_costs | FixedCost | 固定費マスタ | ◯ |
| credit_cards | CreditCard | クレジットカードマスタ | ◯ |
| subscription_entries | SubscriptionEntry | サブスク台帳 | ◯ |
| account_tags | AccountTag | 口座タグ | ◯ |

---

## businesses（事業）

| カラム | 型 | 説明 | 備考 |
|---|---|---|---|
| id | String (cuid) | 事業ID | PK |
| name | String | 事業名 | 例: アビトラ、スーパーサロン |
| isActive | Boolean | 有効フラグ | default: true |
| createdAt | DateTime | 作成日時 | auto |
| updatedAt | DateTime | 更新日時 | auto |

## accounts（口座）

| カラム | 型 | 説明 | 備考 |
|---|---|---|---|
| id | String (cuid) | 口座ID | PK |
| name | String | 口座名 | 例: 楽天銀行、SBI証券 |
| ownerType | Enum | 所有区分 | INTERNAL=社内, EXTERNAL=外部 |
| accountType | Enum | 口座種別 | BANK=銀行, SECURITIES=証券 |
| businessId | String? | 紐づく事業ID | FK → businesses.id, 任意 |
| isActive | Boolean | 有効フラグ | default: true |
| createdAt | DateTime | 作成日時 | auto |
| updatedAt | DateTime | 更新日時 | auto |

**管理会計での制約:** `ownerType=INTERNAL` かつ `accountType=BANK` の口座のみ選択可能。
証券口座・外部口座は「貸借・口座」モジュールで管理。

## categories（カテゴリ）

| カラム | 型 | 説明 | 備考 |
|---|---|---|---|
| id | String (cuid) | カテゴリID | PK |
| name | String | カテゴリ名 | 例: サロン会費、外注費 |
| type | Enum | 収入/支出 | INCOME or EXPENSE |
| isActive | Boolean | 有効フラグ | default: true |
| createdAt | DateTime | 作成日時 | auto |
| updatedAt | DateTime | 更新日時 | auto |

## transactions（取引）

| カラム | 型 | 説明 | 備考 |
|---|---|---|---|
| id | String (cuid) | 取引ID | PK |
| date | DateTime (Date) | 取引日 | @@index |
| businessId | String | 事業ID | FK → businesses.id, @@index |
| accountId | String | 口座ID | FK → accounts.id |
| categoryId | String | カテゴリID | FK → categories.id |
| type | Enum | 収支区分 | INCOME or EXPENSE, @@index |
| costType | Enum? | 固変区分 | FIXED or VARIABLE, 支出のみ。収入はnull |
| amount | Int | 金額（円） | |
| comment | String | コメント・メモ | default: "" |
| commentBy | String | コメント記入者 | default: "" |
| isArchived | Boolean | アーカイブ済みフラグ | default: false |
| createdAt | DateTime | 作成日時 | auto |
| createdBy | String | 作成者 | default: "" |
| updatedAt | DateTime | 更新日時 | auto |

## fixed_costs（固定費）

| カラム | 型 | 説明 | 備考 |
|---|---|---|---|
| id | String (cuid) | 固定費ID | PK |
| businessId | String | 事業ID | FK → businesses.id |
| accountId | String | 引き落とし口座ID | FK → accounts.id |
| categoryId | String | カテゴリID | FK → categories.id |
| amount | Int | 月額金額（円） | |
| dayOfMonth | Int | 毎月の引き落とし日 | 1-31 |
| memo | String | メモ | default: "" |
| isActive | Boolean | 有効フラグ | default: true |
| createdAt | DateTime | 作成日時 | auto |
| updatedAt | DateTime | 更新日時 | auto |

## credit_cards（クレジットカード）

| カラム | 型 | 説明 | 備考 |
|---|---|---|---|
| id | String (cuid) | クレカID | PK |
| name | String | カード名 | 例: 楽天カード |
| accountId | String | 引き落とし口座ID | FK → accounts.id |
| withdrawalDay | Int | 毎月の引き落とし日 | 1-31 |
| memo | String | メモ | default: "" |
| isActive | Boolean | 有効フラグ | default: true |
| createdAt | DateTime | 作成日時 | auto |
| updatedAt | DateTime | 更新日時 | auto |

**リレーション:** Account(多対1), SubscriptionEntry(1対多)

## subscription_entries（サブスク台帳）

| カラム | 型 | 説明 | 備考 |
|---|---|---|---|
| id | String (cuid) | サブスクID | PK |
| name | String | サブスク名 | 例: ChatGPT Plus |
| creditCardId | String? | 紐づくクレカID | FK → credit_cards.id, 任意 |
| amount | Int | 月額金額（円） | |
| dayOfMonth | Int | 毎月の支払日 | 1-31 |
| categoryId | String? | カテゴリID | FK → categories.id, 任意 |
| memo | String | メモ | default: "" |
| isActive | Boolean | 有効フラグ | default: true |
| createdAt | DateTime | 作成日時 | auto |
| updatedAt | DateTime | 更新日時 | auto |

**リレーション:** CreditCard(多対1), Category(多対1)

## account_tags（口座タグ）

| カラム | 型 | 説明 | 備考 |
|---|---|---|---|
| id | String (cuid) | タグID | PK |
| name | String | タグ名 | @unique |
| color | String | バッジの色 | default: "", 例: blue, red, green |
| createdAt | DateTime | 作成日時 | auto |

---

## Enum定義

| Enum名 | 値 | 説明 |
|---|---|---|
| OwnerType | INTERNAL, EXTERNAL | 社内口座 / 外部口座 |
| AccountType | BANK, SECURITIES | 銀行口座 / 証券口座 |
| CategoryType | INCOME, EXPENSE | 収入カテゴリ / 支出カテゴリ |
| TransactionType | INCOME, EXPENSE | 収入 / 支出 |
| CostType | FIXED, VARIABLE | 固定費 / 変動費 |

---

## リレーション図

```
Business 1───N Transaction
Business 1───N Account
Business 1───N FixedCost
Account  1───N Transaction
Account  1───N FixedCost
Account  1───N CreditCard
CreditCard 1───N SubscriptionEntry
Category 1───N Transaction
Category 1───N FixedCost
Category 1───N SubscriptionEntry
```
