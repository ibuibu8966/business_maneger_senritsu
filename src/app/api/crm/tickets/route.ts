import { NextRequest } from "next/server"
import { TicketController } from "@/controllers/crm.controller"

export async function GET(req: NextRequest) { return TicketController.list(req) }
export async function POST(req: NextRequest) { return TicketController.create(req) }
