import type { AccountTransactionType } from "@/generated/prisma/client"

/**
 * 各取引種別の残高への影響（複式簿記版で廃止予定）
 *
 * 複式簿記版では 1取引=1レコード（fromAccountId→toAccountId）の構造のため、
 * type 別の delta は不要（fromAccountId なら -amount、toAccountId なら +amount）。
 *
 * 移行期間中の互換用に値 0 のマップとして残置している。
 * 参照箇所は順次 fromAccountId/toAccountId ベースの計算に置き換える。
 */
export const BALANCE_DELTA: Record<AccountTransactionType, number> = {
  INITIAL: 0,
  INVESTMENT: 0,
  TRANSFER: 0,
  LENDING: 0,
  REPAYMENT: 0,
  INTEREST: 0,
  DEPOSIT_WITHDRAWAL: 0,
  GAIN: 0,
  LOSS: 0,
  REVENUE: 0,
  MISC_EXPENSE: 0,
  MISC_INCOME: 0,
}
