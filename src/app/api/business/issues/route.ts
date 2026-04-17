import { NextRequest } from "next/server"
import { BusinessIssueController } from "@/server/controllers/business.controller"

export async function GET(req: NextRequest) { return BusinessIssueController.list(req) }
export async function POST(req: NextRequest) { return BusinessIssueController.create(req) }
