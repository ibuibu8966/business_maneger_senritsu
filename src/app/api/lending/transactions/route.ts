import { NextRequest } from "next/server"
import { LendingController } from "@/controllers/lending.controller"

export async function GET(req: NextRequest) {
  return LendingController.listTransactions(req)
}

export async function POST(req: NextRequest) {
  return LendingController.createTransaction(req)
}
