import { NextRequest } from "next/server"
import { LendingController } from "@/controllers/lending.controller"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return LendingController.getAccount(id)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return LendingController.updateAccount(req, id)
}
