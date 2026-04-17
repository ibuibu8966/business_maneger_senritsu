/**
 * Lending系APIのZodバリデーションスキーマ
 * Controller から分離して責務を明確化
 */
import { z } from "zod"

const accountTransactionTypes = [
  "deposit", "withdrawal", "investment", "transfer",
  "lend", "borrow", "repayment_receive", "repayment_pay",
  "interest_receive", "interest_pay", "gain", "loss",
  "revenue", "misc_expense", "misc_income",
] as const

export const createAccountSchema = z.object({
  name: z.string().min(1),
  ownerType: z.enum(["internal", "external"]),
  accountType: z.enum(["bank", "securities"]),
  businessId: z.string().nullable().optional(),
  balance: z.number().int().optional(),
  purpose: z.string().optional(),
  investmentPolicy: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  ownerType: z.enum(["internal", "external"]).optional(),
  accountType: z.enum(["bank", "securities"]).optional(),
  businessId: z.string().nullable().optional(),
  balance: z.number().int().optional(),
  purpose: z.string().optional(),
  investmentPolicy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export const createTransactionSchema = z.object({
  accountId: z.string(),
  type: z.literal("transfer").optional(),       // 振替時のみ
  categoryId: z.string().optional(),            // 非振替時はcategoryIdからtype解決
  amount: z.number().int().positive(),
  date: z.string(),
  fromAccountId: z.string().nullable().optional(),
  toAccountId: z.string().nullable().optional(),
  counterparty: z.string().optional(),
  memo: z.string().optional(),
  editedBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  businessId: z.string().optional(),
}).refine(d => d.type === "transfer" || d.categoryId, {
  message: "振替以外はカテゴリの選択が必須です",
})

export const updateTransactionSchema = z.object({
  type: z.enum(accountTransactionTypes).optional(),
  amount: z.number().int().positive().optional(),
  date: z.string().optional(),
  fromAccountId: z.string().nullable().optional(),
  toAccountId: z.string().nullable().optional(),
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
  outstanding: z.number().int().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "overdue"]).optional(),
  memo: z.string().optional(),
  editedBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
})

export const createPaymentSchema = z.object({
  lendingId: z.string(),
  amount: z.number().int().positive(),
  date: z.string(),
  memo: z.string().optional(),
})
