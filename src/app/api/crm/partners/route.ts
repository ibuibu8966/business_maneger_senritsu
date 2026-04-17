import { NextRequest } from "next/server"
import { PartnerController } from "@/server/controllers/crm.controller"

export async function GET(req: NextRequest) { return PartnerController.list(req) }
export async function POST(req: NextRequest) { return PartnerController.create(req) }
