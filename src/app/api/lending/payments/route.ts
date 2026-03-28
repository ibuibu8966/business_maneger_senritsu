import { NextRequest } from "next/server"
import { LendingController } from "@/controllers/lending.controller"

export async function POST(req: NextRequest) {
  return LendingController.createPayment(req)
}
