import { NextRequest } from "next/server"
import { SalonController } from "@/controllers/crm.controller"

export async function POST(req: NextRequest) { return SalonController.createCourse(req) }
