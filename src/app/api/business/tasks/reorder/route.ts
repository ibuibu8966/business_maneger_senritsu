import { NextRequest } from "next/server"
import { BusinessTaskController } from "@/controllers/business.controller"

export async function PATCH(req: NextRequest) { return BusinessTaskController.reorder(req) }
