import { NextRequest } from "next/server"
import { ScheduleController } from "@/server/controllers/schedule.controller"

export async function GET(req: NextRequest) {
  return ScheduleController.list(req)
}

export async function POST(req: NextRequest) {
  return ScheduleController.create(req)
}
