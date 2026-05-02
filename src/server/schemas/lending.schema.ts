/**
 * Lending系APIのZodバリデーションスキーマ（複式簿記版）
 * Controller から分離して責務を明確化
 */
import { z } from "zod"

// 12種に統合（旧16種から方向違いを統合）
const accountTransactionTypes = [
  "initial",
  "investment",
  "transfer",
  "lending",            // 旧 lend/borrow 統合
  "repayment",          // 旧 repayment_receive/pay 統合
  "interest",           // 旧 interest_receive/pay 統合
  "deposit_withdrawal", // 旧 deposit/withdrawal 統合
  "gain",
  "loss",
  "revenue",
  "expense",
  "misc_expense",
  "misc_income",
] as const

export const createAccountSchema = z.object({
  name: z.string().min(1),
  ownerType: z.enum(["internal", "external"]),
  accountType: z.enum(["bank", "securities"]),
  businessId: z.string().nullable().optional(),
  // balance は廃止（初期残高は INITIAL 取引で表現）
  purpose: z.string().optional(),
  investmentPolicy: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  ownerType: z.enum(["internal", "external"]).optional(),
  accountType: z.enum(["bank", "securities"]).optional(),
  businessId: z.string().nullable().optional(),
  // balance は廃止（都度計算）
  purpose: z.string().optional(),
  investmentPolicy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

// 1取引=1レコード（fromAccountId/toAccountId 必須）
export const createTransactionSchema = z.object({
  type: z.enum(accountTransactionTypes),
  categoryId: z.string().optional(),            // type が管理会計連携の場合に使用
  amount: z.number().int().positive(),
  date: z.string(),
  fromAccountId: z.string(),                    // 必須化
  toAccountId: z.string(),                      // 必須化
  counterparty: z.string().optional(),
  memo: z.string().optional(),
  editedBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  businessId: z.string().optional(),
  lendingId: z.string().optional(),             // type=lending/repayment/interest の場合
})

export const updateTransactionSchema = z.object({
  type: z.enum(accountTransactionTypes).optional(),
  amount: z.number().int().positive().optional(),
  date: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  counterparty: z.string().optional(),
  memo: z.string().optional(),
  editedBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
})

export const createLendingSchema = z.object({
  accountId: z.string(),
  counterparty: z.string().min(1),
  counterpartyAccountId: z.string().nullable().optional(),
  type: z.enum(["lend", "borrow"]),
  principal: z.number().int().positive(),
  dueDate: z.string().nullable().optional(),
  memo: z.string().optional(),
})

export const updateLendingSchema = z.object({
  counterparty: z.string().optional(),
  counterpartyAccountId: z.string().nullable().optional(),
  // outstanding は廃止（principal − SUM(REPAYMENT) で都度計算）
  // status は廃止（自動判定）
  dueDate: z.string().nullable().optional(),
  memo: z.string().optional(),
  editedBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
})

// 返済登録は createTransactionSchema (type=repayment) で代替するが、
// 既存APIの後方互換のためスキーマ自体は残す
export const createPaymentSchema = z.object({
  lendingId: z.string(),
  amount: z.number().int().positive(),
  date: z.string(),
  memo: z.string().optional(),
})
