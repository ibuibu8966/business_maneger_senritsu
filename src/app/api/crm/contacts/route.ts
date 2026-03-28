import { NextRequest } from "next/server"
import { ContactController } from "@/controllers/crm.controller"

export async function GET(req: NextRequest) { return ContactController.list(req) }
export async function POST(req: NextRequest) { return ContactController.create(req) }
