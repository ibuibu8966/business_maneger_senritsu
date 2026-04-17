import { NextRequest } from "next/server"
import { ScheduleController } from "@/server/controllers/schedule.controller"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return ScheduleController.updateParticipants(req, id)
}
