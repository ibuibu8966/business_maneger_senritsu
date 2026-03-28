import { NextRequest } from "next/server"
import { ChecklistTemplateController } from "@/controllers/business.controller"

export async function GET(req: NextRequest) {
  return ChecklistTemplateController.list(req)
}

export async function POST(req: NextRequest) {
  return ChecklistTemplateController.create(req)
}
