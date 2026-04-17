import { NextRequest } from "next/server"
import { TicketController } from "@/server/controllers/crm.controller"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return TicketController.addComment(req, id)
}
