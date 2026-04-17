import { NextRequest } from "next/server"
import { AuditLogController } from "@/server/controllers/audit-log.controller"

export async function GET(req: NextRequest) { return AuditLogController.list(req) }
