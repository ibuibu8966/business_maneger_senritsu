import { NextRequest } from "next/server"
import { BusinessController } from "@/server/controllers/business.controller"

export async function GET(req: NextRequest) { return BusinessController.list(req) }
export async function POST(req: NextRequest) { return BusinessController.create(req) }
