import { NextRequest } from "next/server"
import { LendingController } from "@/server/controllers/lending.controller"

export async function GET(req: NextRequest) {
  return LendingController.listAccounts(req)
}

export async function POST(req: NextRequest) {
  return LendingController.createAccount(req)
}
