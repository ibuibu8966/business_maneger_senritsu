/**
 * balance-dashboard のインライン編集型
 */
export type TxEditField = "date" | "type" | "amount" | "counterparty" | "memo"
// outstanding は計算値（principal − Σ返済）。UIでの直接編集は不可。
export type LendingEditField = "counterparty" | "dueDate" | "status" | "memo"
