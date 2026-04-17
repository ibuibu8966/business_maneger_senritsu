import { LendingController } from "@/server/controllers/lending.controller"

export async function GET() {
  return LendingController.getSummary()
}
