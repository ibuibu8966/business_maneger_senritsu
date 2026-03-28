import { LendingController } from "@/controllers/lending.controller"

export async function GET() {
  return LendingController.getSummary()
}
