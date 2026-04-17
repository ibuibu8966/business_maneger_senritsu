import { NextRequest } from "next/server"
import { ChecklistTemplateController } from "@/server/controllers/business.controller"

export async function GET(req: NextRequest) {
  return ChecklistTemplateController.list(req)
}

export async function POST(req: NextRequest) {
  return ChecklistTemplateController.create(req)
}
