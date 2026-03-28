import { NextRequest } from "next/server"
import { SubscriptionController } from "@/controllers/crm.controller"

export async function GET(req: NextRequest) { return SubscriptionController.list(req) }
export async function POST(req: NextRequest) { return SubscriptionController.create(req) }
