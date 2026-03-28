import { NextRequest } from "next/server"
import { TaskChecklistController } from "@/controllers/business.controller"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return TaskChecklistController.addItem(req, id)
}
