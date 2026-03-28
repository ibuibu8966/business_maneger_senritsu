import { NextRequest } from "next/server"
import { BusinessController } from "@/controllers/business.controller"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return BusinessController.getById(req, id)
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return BusinessController.update(req, id)
}
