import { NextRequest } from "next/server"
import { ProjectController } from "@/server/controllers/business.controller"

export async function GET(req: NextRequest) { return ProjectController.list(req) }
export async function POST(req: NextRequest) { return ProjectController.create(req) }
