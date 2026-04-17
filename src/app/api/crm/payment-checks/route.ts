import { NextRequest } from "next/server"
import { PaymentCheckController } from "@/server/controllers/crm.controller"

export async function GET(req: NextRequest) { return PaymentCheckController.list(req) }
export async function POST(req: NextRequest) { return PaymentCheckController.upsert(req) }
