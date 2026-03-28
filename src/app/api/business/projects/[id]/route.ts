import { NextRequest } from "next/server"
import { ProjectController } from "@/controllers/business.controller"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return ProjectController.getById(req, id)
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return ProjectController.update(req, id)
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return ProjectController.delete(req, id)
}
