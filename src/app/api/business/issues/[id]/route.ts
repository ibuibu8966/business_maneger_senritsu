import { NextRequest } from "next/server"
import { BusinessIssueController } from "@/controllers/business.controller"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return BusinessIssueController.update(req, id)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return BusinessIssueController.delete(req, id)
}
