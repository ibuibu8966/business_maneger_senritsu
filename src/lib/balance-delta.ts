import type { AccountTransactionType } from "@/generated/prisma/client"

/** 各取引種別の残高への影響（正=入金, 負=出金） */
export const BALANCE_DELTA: Record<AccountTransactionType, number> = {
  DEPOSIT: 1,
  WITHDRAWAL: -1,
  INVESTMENT: 1,
  TRANSFER: 0,           // 振替は fromAccount と toAccount で個別処理
  LEND: -1,
  BORROW: 1,
  REPAYMENT_RECEIVE: 1,
  REPAYMENT_PAY: -1,
  INTEREST_RECEIVE: 1,
  INTEREST_PAY: -1,
  GAIN: 1,
  LOSS: -1,
  REVENUE: 1,
  MISC_EXPENSE: -1,
  MISC_INCOME: 1,
}
