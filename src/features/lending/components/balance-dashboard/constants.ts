/**
 * balance-dashboard で使う定数
 */

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  deposit: "純入金",
  withdrawal: "純出金",
  investment: "出資",
  transfer: "振替",
  lend: "貸出",
  borrow: "借入",
  repayment_receive: "返済受取",
  repayment_pay: "返済支払",
  interest_receive: "利息受取",
  interest_pay: "利息支払",
  gain: "運用益",
  loss: "運用損",
  revenue: "売上",
  misc_expense: "雑費",
  misc_income: "その他売上",
}

/** 入金系（緑）の取引タイプ */
export const PLUS_TYPES = new Set([
  "deposit",
  "investment",
  "borrow",
  "repayment_receive",
  "interest_receive",
  "gain",
  "revenue",
  "misc_income",
])

/** 取引タイプのカラークラス */
export function getTxTypeColor(type: string): string {
  if (type === "transfer")
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
  return PLUS_TYPES.has(type)
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800"
}

export const LENDING_STATUS_LABELS: Record<string, string> = {
  active: "返済中",
  completed: "完済",
  overdue: "延滞",
}
