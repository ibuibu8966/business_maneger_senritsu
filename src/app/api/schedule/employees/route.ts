import { NextRequest } from "next/server"
import { EmployeeController } from "@/server/controllers/employee.controller"
import { requireRole } from "@/lib/auth-guard"

export async function GET() {
  return EmployeeController.list()
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("master_admin", "admin")
  if (error) return error
  return EmployeeController.create(req)
}
