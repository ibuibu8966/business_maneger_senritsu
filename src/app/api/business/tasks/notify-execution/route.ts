import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { pushLineMessage } from "@/lib/line-notify"
import { logger } from "@/lib/logger"

/**
 * 1分ごとに実行されるCron。
 * - 現在JST時刻 + 10分後 のタスク（10分前リマインド）
 * - 現在JST時刻 ちょうどのタスク（開始時刻リマインド）
 * を抽出してLINE送信。
 *
 * 重複防止: notifiedExecAt に "YYYY-MM-DD HH:MM kind" を保存（kind = "10min"|"now"）
 *
 * Vercel Cron schedule: "* * * * *"
 * 認証: Authorization: Bearer ${CRON_SECRET}
 */
export async function POST(req: NextRequest) {
  return run(req)
}
export async function GET(req: NextRequest) {
  return run(req)
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

async function run(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? ""
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    // JST現在時刻を計算（getUTC*でJST扱いするトリック）
    const now = new Date()
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const dateStr = `${jstNow.getUTCFullYear()}-${pad2(jstNow.getUTCMonth() + 1)}-${pad2(jstNow.getUTCDate())}`
    const nowHHMM = `${pad2(jstNow.getUTCHours())}:${pad2(jstNow.getUTCMinutes())}`

    // 10分後の HH:MM
    const plus10 = new Date(jstNow.getTime() + 10 * 60 * 1000)
    const plus10HHMM = `${pad2(plus10.getUTCHours())}:${pad2(plus10.getUTCMinutes())}`

    // 対象タスクを取得（executionTime が nowHHMM か plus10HHMM、status != DONE、active project、担当者あり）
    const tasks = await prisma.businessTask.findMany({
      where: {
        status: { not: "DONE" },
        executionTime: { in: [nowHHMM, plus10HHMM] },
        assigneeId: { not: null },
        project: { status: "ACTIVE" },
      },
      select: {
        id: true,
        title: true,
        executionTime: true,
        notifiedExecAt: true,
        project: { select: { name: true } },
        assignee: { select: { id: true, name: true, lineUserId: true, isActive: true } },
      },
    })

    let sent = 0
    let skipped = 0
    let failed = 0
    const details: Array<{ task: string; kind: string; ok?: boolean; reason?: string }> = []

    for (const t of tasks) {
      if (!t.assignee || !t.assignee.lineUserId || !t.assignee.isActive) {
        skipped++
        details.push({ task: t.title, kind: "-", reason: "no_line_user" })
        continue
      }

      const kind = t.executionTime === nowHHMM ? "now" : "10min"
      const tag = `${dateStr} ${t.executionTime} ${kind}`

      // 重複チェック
      if (t.notifiedExecAt === tag) {
        skipped++
        details.push({ task: t.title, kind, reason: "already_notified" })
        continue
      }

      const proj = t.project?.name ? `[${t.project.name}] ` : ""
      const message =
        kind === "10min"
          ? `⏰ あと10分で実行時刻です\n${proj}${t.title}\n実行時刻: ${t.executionTime}`
          : `🚨 実行時刻になりました\n${proj}${t.title}\n今、やってください`

      const r = await pushLineMessage(t.assignee.lineUserId, message)
      if (r.ok) {
        sent++
        details.push({ task: t.title, kind, ok: true })
        // 通知済み記録
        await prisma.businessTask.update({
          where: { id: t.id },
          data: { notifiedExecAt: tag },
        })
      } else {
        failed++
        details.push({ task: t.title, kind, ok: false, reason: r.error })
      }
    }

    return NextResponse.json({
      success: true,
      now: nowHHMM,
      plus10: plus10HHMM,
      candidates: tasks.length,
      sent,
      skipped,
      failed,
      details,
    })
  } catch (e) {
    logger.error("notify-execution failed", e)
    return NextResponse.json({ error: "notify-execution failed" }, { status: 500 })
  }
}
