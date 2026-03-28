import { NextRequest } from "next/server"
import { ContactMeetingController } from "@/controllers/crm.controller"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return ContactMeetingController.list(req, id)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return ContactMeetingController.create(req, id)
}
