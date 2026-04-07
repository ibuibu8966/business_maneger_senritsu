import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * 未達成ログ一覧取得
 * GET /api/business/tasks/missed-log?date=YYYY-MM-DD
 *   date 省略時: 全期間を新しい順に返す（上限200件）
 *   date 指定時: その日の scheduledDate のみ
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const date = url.searchParams.get("date")

    const where = date
      ? { scheduledDate: new Date(date) }
      : {}

    const logs = await prisma.taskMissedLog.findMany({
      where,
      orderBy: [{ scheduledDate: "desc" }, { missedAt: "desc" }],
      take: 200,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
          },
        },
      },
    })

    return NextResponse.json(logs)
  } catch (e) {
    logger.error("未達成ログの取得に失敗しました", e)
    return NextResponse.json({ error: "未達成ログの取得に失敗しました" }, { status: 500 })
  }
}
