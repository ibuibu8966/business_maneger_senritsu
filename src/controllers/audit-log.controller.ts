import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { GetAuditLogs } from "@/use-cases/get-audit-logs.use-case"

export class AuditLogController {
  static async list(req: NextRequest) {
    try {
      const url = new URL(req.url)
      const entityType = url.searchParams.get("entityType") ?? undefined
      const userId = url.searchParams.get("userId") ?? undefined
      const limitStr = url.searchParams.get("limit")
      const limit = limitStr ? parseInt(limitStr, 10) : undefined

      const data = await GetAuditLogs.execute({ entityType, userId, limit })
      return NextResponse.json(data)
    } catch (e) {
      logger.error("操作履歴の取得に失敗しました", e)
      return NextResponse.json({ error: "操作履歴の取得に失敗しました" }, { status: 500 })
    }
  }
}
