import { NextRequest } from "next/server"
import { BusinessMemoController } from "@/controllers/business.controller"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return BusinessMemoController.delete(req, id)
}
