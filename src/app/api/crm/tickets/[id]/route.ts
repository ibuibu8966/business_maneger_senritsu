import { NextRequest } from "next/server"
import { TicketController } from "@/server/controllers/crm.controller"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return TicketController.getById(req, id)
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return TicketController.update(req, id)
}
