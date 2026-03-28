import { NextRequest } from "next/server"
import { TaskChecklistController } from "@/controllers/business.controller"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { itemId } = await params
  return TaskChecklistController.updateItem(req, itemId)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { itemId } = await params
  return TaskChecklistController.deleteItem(req, itemId)
}
