import { NextRequest } from "next/server"
import { BusinessMemoController } from "@/server/controllers/business.controller"

export async function GET(req: NextRequest) { return BusinessMemoController.list(req) }
export async function POST(req: NextRequest) { return BusinessMemoController.create(req) }
