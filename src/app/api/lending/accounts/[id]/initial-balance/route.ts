import { NextRequest } from "next/server"
import { LendingController } from "@/server/controllers/lending.controller"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return LendingController.upsertInitialBalance(req, id)
}
