/**
 * balance-dashboard で使う定数（複式簿記版・12種）
 */

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  initial: "初期残高",
  investment: "出資",
  transfer: "振替",
  lending: "貸借",
  repayment: "返済",
  interest: "利息",
  deposit_withdrawal: "純入出金",
  gain: "運用益",
  loss: "運用損",
  revenue: "売上",
  expense: "支出",
  misc_expense: "雑費",
  misc_income: "その他売上",
}

/**
 * 取引タイプのカラークラス
 *
 * 複式簿記版では from→to で方向が決まるので、表示は対象口座から見た方向で判定する。
 * 呼び出し側で `accountId === toAccountId` の場合は「入金（緑）」、`accountId === fromAccountId` の場合は「出金（赤）」と判定。
 * 振替は別色（slate）。
 */
export function getTxTypeColor(args: { type: string; isInflow: boolean }): string {
  if (args.type === "transfer")
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
  return args.isInflow
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800"
}

/**
 * 取引のfrom/to表示用ラベル。
 * 仮想口座（複式簿記の集約口座など、UI非表示）の側は API レスポンスで null になるため、
 * カテゴリラベルに置き換えて表示する（純入出金は方向で「純入金/純出金」を出し分け）。
 */
export function formatTxFromName(t: { fromAccountName: string | null; toAccountName: string | null; type: string; categoryName: string }): string {
  if (t.fromAccountName) return t.fromAccountName
  if (t.type === "deposit_withdrawal") return "（純入金）"
  return `（${t.categoryName}）`
}

export function formatTxToName(t: { fromAccountName: string | null; toAccountName: string | null; type: string; categoryName: string }): string {
  if (t.toAccountName) return t.toAccountName
  if (t.type === "deposit_withdrawal") return "（純出金）"
  return `（${t.categoryName}）`
}

export const LENDING_STATUS_LABELS: Record<string, string> = {
  active: "返済中",
  completed: "完済",
  overdue: "延滞",
}
