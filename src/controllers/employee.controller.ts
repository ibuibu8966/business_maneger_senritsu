import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { GetEmployees } from "@/use-cases/get-employees.use-case"
import { CreateEmployee } from "@/use-cases/create-employee.use-case"
import { UpdateEmployee } from "@/use-cases/update-employee.use-case"
import { DeleteEmployee } from "@/use-cases/delete-employee.use-case"

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["master_admin", "admin", "employee"]).optional(),
  lineUserId: z.string().optional(),
  googleCalId: z.string().optional(),
  coreTimeStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  coreTimeEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  email: z.string().email().nullable().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["master_admin", "admin", "employee"]).optional(),
  lineUserId: z.string().nullable().optional(),
  googleCalId: z.string().nullable().optional(),
  coreTimeStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  coreTimeEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  isActive: z.boolean().optional(),
})

export class EmployeeController {
  static async list() {
    try {
      const data = await GetEmployees.execute()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: "従業員の取得に失敗しました" }, { status: 500 })
    }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createSchema.parse(body)
      const result = await CreateEmployee.execute(data)
      return NextResponse.json(result, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      return NextResponse.json({ error: "従業員の登録に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateSchema.parse(body)
      const result = await UpdateEmployee.execute(id, data)
      return NextResponse.json(result)
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ errors: e.issues }, { status: 400 })
      }
      logger.error("Employee update error:", e)
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({ error: "従業員の更新に失敗しました", detail: msg }, { status: 500 })
    }
  }

  static async delete(id: string) {
    try {
      await DeleteEmployee.execute(id)
      return NextResponse.json({ ok: true })
    } catch {
      return NextResponse.json({ error: "従業員の削除に失敗しました" }, { status: 500 })
    }
  }
}
