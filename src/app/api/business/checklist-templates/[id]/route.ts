import { NextRequest } from "next/server"
import { ChecklistTemplateController } from "@/server/controllers/business.controller"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return ChecklistTemplateController.update(req, id)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return ChecklistTemplateController.delete(req, id)
}
