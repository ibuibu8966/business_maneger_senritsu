import { NextRequest } from "next/server"
import { LendingController } from "@/server/controllers/lending.controller"

export async function GET(req: NextRequest) {
  return LendingController.listLendings(req)
}

export async function POST(req: NextRequest) {
  return LendingController.createLending(req)
}
