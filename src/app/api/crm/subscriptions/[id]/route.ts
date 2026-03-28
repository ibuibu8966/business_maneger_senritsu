import { NextRequest } from "next/server"
import { SubscriptionController } from "@/controllers/crm.controller"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return SubscriptionController.update(req, id)
}
