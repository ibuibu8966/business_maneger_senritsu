import { NextRequest } from "next/server"
import { PaymentCheckController } from "@/server/controllers/crm.controller"

export async function POST(req: NextRequest) { return PaymentCheckController.importCsv(req) }
