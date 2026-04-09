import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-guard"
import { GetAccountDetails } from "@/use-cases/get-account-details.use-case"
import { CreateAccount } from "@/use-cases/create-account.use-case"
import { UpdateAccount } from "@/use-cases/update-account.use-case"
import { GetAccountTransactions } from "@/use-cases/get-account-transactions.use-case"
import { CreateAccountTransaction } from "@/use-cases/create-account-transaction.use-case"
import { UpdateAccountTransaction } from "@/use-cases/update-account-transaction.use-case"
import { GetLendings } from "@/use-cases/get-lendings.use-case"
import { CreateLending } from "@/use-cases/create-lending.use-case"
import { UpdateLending } from "@/use-cases/update-lending.use-case"
import { CreateLendingPayment } from "@/use-cases/create-lending-payment.use-case"
import { AccountTagUseCase } from "@/use-cases/account-tag.use-case"

// ========== Zod スキーマ ==========

const accountTransactionTypes = [
  "deposit", "withdrawal", "investment", "transfer",
  "lend", "borrow", "repayment_receive", "repayment_pay",
  "interest_receive", "interest_pay", "gain", "loss",
  "revenue", "misc_expense", "misc_income",
] as const

const createAccountSchema = z.object({
  name: z.string().min(1),
  ownerType: z.enum(["internal", "external"]),
  accountType: z.enum(["bank", "securities"]),
  businessId: z.string().nullable().optional(),
  balance: z.number().int().optional(),
  purpose: z.string().optional(),
  investmentPolicy: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const updateAccountSchema = z.object({
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

const createTransactionSchema = z.object({
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

const updateTransactionSchema = z.object({
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

const createLendingSchema = z.object({
  accountId: z.string(),
  counterparty: z.string().min(1),
  counterpartyAccountId: z.string().nullable().optional(),
  type: z.enum(["lend", "borrow"]),
  principal: z.number().int().positive(),
  dueDate: z.string().nullable().optional(),
  memo: z.string().optional(),
})

const updateLendingSchema = z.object({
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

const createPaymentSchema = z.object({
  lendingId: z.string(),
  amount: z.number().int().positive(),
  date: z.string(),
  memo: z.string().optional(),
})

// ========== Controller ==========

export class LendingController {
  // --- 口座 ---
  static async listAccounts(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const params = {
        ownerType: url.searchParams.get("ownerType")?.toUpperCase() as "INTERNAL" | "EXTERNAL" | undefined,
        accountType: url.searchParams.get("accountType")?.toUpperCase() as "BANK" | "SECURITIES" | undefined,
        isArchived: url.searchParams.has("isArchived")
          ? url.searchParams.get("isArchived") === "true"
          : undefined,
        isActive: url.searchParams.has("isActive")
          ? url.searchParams.get("isActive") === "true"
          : undefined,
      }
      const data = await GetAccountDetails.execute(params)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: "口座の取得に失敗しました" }, { status: 500 })
    }
  }

  static async getAccount(id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const data = await GetAccountDetails.executeOne(id)
      if (!data) return NextResponse.json({ error: "口座が見つかりません" }, { status: 404 })
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: "口座の取得に失敗しました" }, { status: 500 })
    }
  }

  static async getSummary() {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const data = await GetAccountDetails.getSummary()
      return NextResponse.json(data)
    } catch (e) {
      logger.error("getSummary error:", e)
      return NextResponse.json({ error: "サマリーの取得に失敗しました" }, { status: 500 })
    }
  }

  static async createAccount(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createAccountSchema.parse(body)
      const result = await CreateAccount.execute(data)
      return NextResponse.json(result, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      return NextResponse.json({ error: "口座の登録に失敗しました" }, { status: 500 })
    }
  }

  static async updateAccount(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateAccountSchema.parse(body)
      const result = await UpdateAccount.execute(id, data)
      return NextResponse.json(result)
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      return NextResponse.json({ error: "口座の更新に失敗しました" }, { status: 500 })
    }
  }

  // --- 口座取引 ---
  static async listTransactions(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const params = {
        accountId: url.searchParams.get("accountId") ?? undefined,
        type: url.searchParams.get("type")?.toUpperCase() as import("@/generated/prisma/client").AccountTransactionType | undefined,
        dateFrom: url.searchParams.get("dateFrom") ?? undefined,
        dateTo: url.searchParams.get("dateTo") ?? undefined,
        isArchived: url.searchParams.has("isArchived")
          ? url.searchParams.get("isArchived") === "true"
          : undefined,
      }
      const data = await GetAccountTransactions.execute(params)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: "口座取引の取得に失敗しました" }, { status: 500 })
    }
  }

  static async createTransaction(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createTransactionSchema.parse(body)

      // categoryIdからtypeを解決（振替以外）
      // モーダルからcategoryIdとして "DEPOSIT" 等のtype文字列が直接送られてくる
      let resolvedType = data.type as string | undefined  // "transfer" or undefined
      if (!resolvedType && data.categoryId) {
        resolvedType = data.categoryId.toLowerCase()
      }
      if (!resolvedType) {
        return NextResponse.json({ error: "取引種別を特定できません" }, { status: 400 })
      }

      const result = await CreateAccountTransaction.execute({
        ...data,
        type: resolvedType as import("@/types/dto").AccountTransactionTypeDTO,
      })
      return NextResponse.json(result, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      logger.error("口座取引登録エラー:", e)
      return NextResponse.json({ error: "口座取引の登録に失敗しました", detail: String(e) }, { status: 500 })
    }
  }

  static async updateTransaction(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateTransactionSchema.parse(body)
      const result = await UpdateAccountTransaction.execute(id, data)
      return NextResponse.json(result)
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      return NextResponse.json({ error: "口座取引の更新に失敗しました" }, { status: 500 })
    }
  }

  // --- 貸借 ---
  static async listLendings(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const params = {
        accountId: url.searchParams.get("accountId") ?? undefined,
        type: url.searchParams.get("type")?.toUpperCase() as "LEND" | "BORROW" | undefined,
        status: url.searchParams.get("status")?.toUpperCase() as "ACTIVE" | "COMPLETED" | "OVERDUE" | undefined,
        isArchived: url.searchParams.has("isArchived")
          ? url.searchParams.get("isArchived") === "true"
          : undefined,
      }
      const data = await GetLendings.execute(params)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: "貸借の取得に失敗しました" }, { status: 500 })
    }
  }

  static async createLending(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createLendingSchema.parse(body)
      const result = await CreateLending.execute(data)
      return NextResponse.json(result, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      logger.error("貸借登録エラー:", e)
      return NextResponse.json({ error: "貸借の登録に失敗しました", detail: String(e) }, { status: 500 })
    }
  }

  static async updateLending(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateLendingSchema.parse(body)
      const result = await UpdateLending.execute(id, data)
      return NextResponse.json(result)
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      return NextResponse.json({ error: "貸借の更新に失敗しました" }, { status: 500 })
    }
  }

  // --- 返済 ---
  static async createPayment(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createPaymentSchema.parse(body)
      const result = await CreateLendingPayment.execute(data)
      return NextResponse.json(result, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      return NextResponse.json({ error: "返済の登録に失敗しました" }, { status: 500 })
    }
  }

  // ========== タグ ==========

  static async listTags() {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const result = await AccountTagUseCase.list()
      return NextResponse.json(result)
    } catch {
      return NextResponse.json({ error: "タグの取得に失敗しました" }, { status: 500 })
    }
  }

  static async createTag(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = z.object({
        name: z.string().min(1),
        color: z.string().optional(),
      }).parse(body)
      const result = await AccountTagUseCase.create(data)
      return NextResponse.json(result, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      return NextResponse.json({ error: "タグの作成に失敗しました" }, { status: 500 })
    }
  }

  static async updateTag(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = z.object({
        name: z.string().min(1).optional(),
        color: z.string().optional(),
      }).parse(body)
      const result = await AccountTagUseCase.update(id, data)
      return NextResponse.json(result)
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      return NextResponse.json({ error: "タグの更新に失敗しました" }, { status: 500 })
    }
  }

  static async deleteTag(id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      await AccountTagUseCase.delete(id)
      return NextResponse.json({ ok: true })
    } catch {
      return NextResponse.json({ error: "タグの削除に失敗しました" }, { status: 500 })
    }
  }
}
