import { NextRequest } from "next/server"
import { BusinessIssueController } from "@/server/controllers/business.controller"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return BusinessIssueController.addNote(req, id)
}
