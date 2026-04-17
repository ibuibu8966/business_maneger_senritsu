import { NextRequest, NextResponse } from "next/server"
import { EmployeeController } from "@/server/controllers/employee.controller"
import { requireRole } from "@/lib/auth-guard"
import { EmployeeRepository } from "@/server/repositories/employee.repository"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole("master_admin", "admin")
  if (error) return error

  const { id } = await params

  // MASTER_ADMIN の編集は master_admin のみ
  const target = await EmployeeRepository.findById(id)
  if (target?.role === "MASTER_ADMIN" && session!.user.role !== "master_admin") {
    return NextResponse.json({ error: "マスター管理者の編集権限がありません" }, { status: 403 })
  }

  return EmployeeController.update(req, id)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole("master_admin", "admin")
  if (error) return error

  const { id } = await params

  // MASTER_ADMIN の削除は master_admin のみ
  const target = await EmployeeRepository.findById(id)
  if (target?.role === "MASTER_ADMIN" && session!.user.role !== "master_admin") {
    return NextResponse.json({ error: "マスター管理者の削除権限がありません" }, { status: 403 })
  }

  return EmployeeController.delete(id)
}
