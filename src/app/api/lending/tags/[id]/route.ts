import { NextRequest } from "next/server"
import { LendingController } from "@/server/controllers/lending.controller"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return LendingController.updateTag(req, id)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return LendingController.deleteTag(id)
}
