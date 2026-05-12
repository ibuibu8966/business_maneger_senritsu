import { NextRequest } from "next/server"
import { BusinessTaskController } from "@/server/controllers/business.controller"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return BusinessTaskController.completeIrregular(req, id)
}
