import { NextRequest } from "next/server"
import { LendingController } from "@/server/controllers/lending.controller"

export async function GET() {
  return LendingController.listTags()
}

export async function POST(req: NextRequest) {
  return LendingController.createTag(req)
}
