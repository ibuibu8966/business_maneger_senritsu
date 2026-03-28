import { NextRequest } from "next/server"
import { SalonController } from "@/controllers/crm.controller"

export async function GET(req: NextRequest) { return SalonController.list(req) }
export async function POST(req: NextRequest) { return SalonController.create(req) }
