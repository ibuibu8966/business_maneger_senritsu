import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-guard"
import { GetAccountDetails } from "@/server/use-cases/get-account-details.use-case"
import { CreateAccount } from "@/server/use-cases/create-account.use-case"
import { UpdateAccount } from "@/server/use-cases/update-account.use-case"
import { GetAccountTransactions } from "@/server/use-cases/get-account-transactions.use-case"
import { CreateAccountTransaction } from "@/server/use-cases/create-account-transaction.use-case"
import { UpdateAccountTransaction } from "@/server/use-cases/update-account-transaction.use-case"
import { GetLendings } from "@/server/use-cases/get-lendings.use-case"
import { CreateLending } from "@/server/use-cases/create-lending.use-case"
import { UpdateLending } from "@/server/use-cases/update-lending.use-case"
import { CreateLendingPayment } from "@/server/use-cases/create-lending-payment.use-case"
import { UpsertInitialBalance } from "@/server/use-cases/upsert-initial-balance.use-case"
import { AccountTagUseCase } from "@/server/use-cases/account-tag.use-case"
import {
  createAccountSchema,
  updateAccountSchema,
  createTransactionSchema,
  updateTransactionSchema,
  createLendingSchema,
  updateLendingSchema,
  createPaymentSchema,
} from "@/server/schemas/lending.schema"
import { handleApiError } from "@/server/lib/error-response"

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
    } catch (e) {
      return handleApiError(e, { resource: "口座", action: "取得" })
    }
  }

  static async getAccount(id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const data = await GetAccountDetails.executeOne(id)
      if (!data) return NextResponse.json({ error: "口座が見つかりません" }, { status: 404 })
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "口座", action: "取得" })
    }
  }

  static async getSummary() {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const data = await GetAccountDetails.getSummary()
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "サマリー", action: "取得" })
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
      return handleApiError(e, { resource: "口座", action: "登録" })
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
      return handleApiError(e, { resource: "口座", action: "更新" })
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
    } catch (e) {
      return handleApiError(e, { resource: "口座取引", action: "取得" })
    }
  }

  static async createTransaction(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()

      // UI互換補完：accountId + direction が来た場合、外部口座を介して from/to を組み立てる
      // direction: "in" = 外部 → accountId（入金系）, "out" = accountId → 外部（出金系）
      let payload = { ...body }
      if (!payload.fromAccountId || !payload.toAccountId) {
        const acctId = payload.accountId
        const dir = payload.direction
        if (acctId && dir) {
          const { AccountRepository } = await import("@/server/repositories/account.repository")
          const externalId = await AccountRepository.findExternalAccountId()
          if (dir === "in") {
            payload.fromAccountId = payload.fromAccountId ?? externalId
            payload.toAccountId = payload.toAccountId ?? acctId
          } else if (dir === "out") {
            payload.fromAccountId = payload.fromAccountId ?? acctId
            payload.toAccountId = payload.toAccountId ?? externalId
          }
        }
      }
      // 旧フィールドは validation で拒否されるので削除
      delete payload.accountId
      delete payload.direction
      delete payload.categoryId

      const data = createTransactionSchema.parse(payload)

      const result = await CreateAccountTransaction.execute({
        type: data.type,
        amount: data.amount,
        date: data.date,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        counterparty: data.counterparty,
        lendingId: data.lendingId,
        memo: data.memo,
        editedBy: data.editedBy,
        tags: data.tags,
      })
      return NextResponse.json(result, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "口座取引", action: "登録" })
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
      return handleApiError(e, { resource: "口座取引", action: "更新" })
    }
  }

  static async upsertInitialBalance(req: NextRequest, accountId: string) {
    try {
      const { session, error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = z
        .object({
          amount: z.number().int(),
          date: z.string().optional(),
          memo: z.string().optional(),
        })
        .parse(body)
      const result = await UpsertInitialBalance.execute({
        accountId,
        amount: data.amount,
        date: data.date,
        memo: data.memo,
        editedBy: session?.user?.name ?? "",
      })
      return NextResponse.json(result, { status: 200 })
    } catch (e) {
      return handleApiError(e, { resource: "初期残高", action: "登録" })
    }
  }

  // --- 貸借 ---
  static async listLendings(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const statusFilter = url.searchParams.get("status")?.toLowerCase() as "active" | "completed" | "overdue" | undefined
      const params = {
        accountId: url.searchParams.get("accountId") ?? undefined,
        type: url.searchParams.get("type")?.toUpperCase() as "LEND" | "BORROW" | undefined,
        // status は廃止（DBに存在しない）→ 取得後にDTO側でフィルタ
        isArchived: url.searchParams.has("isArchived")
          ? url.searchParams.get("isArchived") === "true"
          : undefined,
      }
      const data = await GetLendings.execute(params)
      const filtered = statusFilter ? data.filter((l) => l.status === statusFilter) : data
      return NextResponse.json(filtered)
    } catch (e) {
      return handleApiError(e, { resource: "貸借", action: "取得" })
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
      return handleApiError(e, { resource: "貸借", action: "登録" })
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
      return handleApiError(e, { resource: "貸借", action: "更新" })
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
      return handleApiError(e, { resource: "返済", action: "登録" })
    }
  }

  // ========== タグ ==========

  static async listTags() {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const result = await AccountTagUseCase.list()
      return NextResponse.json(result)
    } catch (e) {
      return handleApiError(e, { resource: "タグ", action: "取得" })
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
      return handleApiError(e, { resource: "タグ", action: "作成" })
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
      return handleApiError(e, { resource: "タグ", action: "更新" })
    }
  }

  static async deleteTag(id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      await AccountTagUseCase.delete(id)
      return NextResponse.json({ ok: true })
    } catch (e) {
      return handleApiError(e, { resource: "タグ", action: "削除" })
    }
  }
}
