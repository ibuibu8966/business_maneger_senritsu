import { NextRequest } from "next/server"
import { PartnerController } from "@/server/controllers/crm.controller"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return PartnerController.getById(req, id)
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return PartnerController.update(req, id)
}
