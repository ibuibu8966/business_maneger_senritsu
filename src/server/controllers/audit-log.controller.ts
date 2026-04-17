import { NextRequest, NextResponse } from "next/server"
import { GetAuditLogs } from "@/server/use-cases/get-audit-logs.use-case"
import { requireRole } from "@/lib/auth-guard"
import { handleApiError } from "@/server/lib/error-response"

export class AuditLogController {
  static async list(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const url = new URL(req.url)
      const entityType = url.searchParams.get("entityType") ?? undefined
      const userId = url.searchParams.get("userId") ?? undefined
      const limitStr = url.searchParams.get("limit")
      const limit = limitStr ? parseInt(limitStr, 10) : undefined

      const data = await GetAuditLogs.execute({ entityType, userId, limit })
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "操作履歴", action: "取得" })
    }
  }
}
