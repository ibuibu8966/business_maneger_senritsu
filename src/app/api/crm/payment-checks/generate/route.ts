import { NextRequest } from "next/server"
import { PaymentCheckController } from "@/controllers/crm.controller"

export async function POST(req: NextRequest) { return PaymentCheckController.generate(req) }
