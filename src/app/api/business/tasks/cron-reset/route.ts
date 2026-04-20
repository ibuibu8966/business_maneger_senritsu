import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * 深夜2時(JST)に実行されるCron。
 * - todayFlag=true かつ status != DONE のタスクを TaskMissedLog に記録
 * - 全タスクの todayFlag を false にリセット
 *
 * 認証: Authorization: Bearer ${CRON_SECRET}
 *   Vercel Cron は自動で Authorization: Bearer ${CRON_SECRET} を付けてくれる。
 */
export async function POST(req: NextRequest) {
  return runReset(req)
}

// Vercel Cron は GET で叩くので両対応
export async function GET(req: NextRequest) {
  return runReset(req)
}

async function runReset(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? ""
    const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`
    if (!process.env.CRON_SECRET || authHeader !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    // JSTで「今日の日付」を計算（Cronは02:00 JST に動くので、対象日は "その前日" ではなく "実行時点の昨日"）
    // 厳密には02:00 JST = UTC 17:00 前日 になる。ここでは「本日扱いの対象日 = 2時リセット時点の日付」を使う。
    // 例: 4/8 02:00 JST に実行 → 「4/7 にやる予定だったのに未完了」として記録
    const now = new Date()
    // JST時刻
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    // 前日の日付(0時)
    const yesterday = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() - 1))

    const targets = await prisma.businessTask.findMany({
      where: {
        todayFlag: true,
        status: { not: "DONE" },
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        status: true,
        assigneeId: true,
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    })

    // 事業直下タスク（projectIdなし）は TaskMissedLog に projectId NOT NULL 制約があるため記録スキップ
    const loggable = targets.filter((t): t is typeof t & { projectId: string } => t.projectId !== null)
    let missedCount = 0
    if (loggable.length > 0) {
      await prisma.taskMissedLog.createMany({
        data: loggable.map((t) => ({
          taskId: t.id,
          taskTitle: t.title,
          projectId: t.projectId,
          projectName: t.project?.name ?? "",
          assigneeId: t.assigneeId ?? null,
          assigneeName: t.assignee?.name ?? "",
          scheduledDate: yesterday,
          statusAtMissed: t.status,
        })),
      })
      missedCount = loggable.length
    }

    // すべての todayFlag をリセット
    const reset = await prisma.businessTask.updateMany({
      where: { todayFlag: true },
      data: { todayFlag: false, todayFlaggedAt: null },
    })

    return NextResponse.json({
      success: true,
      missedCount,
      resetCount: reset.count,
      scheduledDate: yesterday.toISOString().slice(0, 10),
    })
  } catch (e) {
    logger.error("cron-reset failed", e)
    return NextResponse.json({ error: "cron-reset failed" }, { status: 500 })
  }
}
