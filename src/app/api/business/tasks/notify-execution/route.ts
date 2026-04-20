import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { pushLineMessage } from "@/lib/line-notify"
import { logger } from "@/lib/logger"

/**
 * 1分ごとに実行されるCron。
 * - 各タスクの notifyMinutesBefore (5/10/15/30/60) 分前に事前リマインド（notifyEnabled=true のみ）
 * - 現在JST時刻 ちょうどのタスク（開始時刻リマインド、常時）
 * を抽出してLINE送信。
 *
 * 重複防止: notifiedExecAt に "YYYY-MM-DD HH:MM kind" を保存（kind = "preNN"|"now"）
 *
 * Vercel Cron schedule: "* * * * *"
 * 認証: Authorization: Bearer ${CRON_SECRET}
 */

const NOTIFY_MINUTES_OPTIONS = [5, 10, 15, 30, 60] as const
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

    // N分後の HH:MM マップ（N -> "HH:MM"）
    const plusMap = new Map<number, string>()
    for (const n of NOTIFY_MINUTES_OPTIONS) {
      const p = new Date(jstNow.getTime() + n * 60 * 1000)
      plusMap.set(n, `${pad2(p.getUTCHours())}:${pad2(p.getUTCMinutes())}`)
    }

    // 対象タスクを取得：現在時刻と一致（開始時刻通知）、または N分後と一致かつ notifyMinutesBefore===N かつ notifyEnabled
    const candidateHHMMs = Array.from(new Set<string>([nowHHMM, ...plusMap.values()]))
    const rawTasks = await prisma.businessTask.findMany({
      where: {
        status: { not: "DONE" },
        executionTime: { in: candidateHHMMs },
        assignees: { some: {} },
        project: { status: "ACTIVE" },
      },
      select: {
        id: true,
        title: true,
        executionTime: true,
        notifiedExecAt: true,
        notifyEnabled: true,
        notifyMinutesBefore: true,
        project: { select: { name: true } },
        assignees: {
          include: {
            employee: { select: { id: true, name: true, lineUserId: true, isActive: true } },
          },
        },
      },
    })

    // 各タスクについて「今このminute送るべき kind」を決める
    // kind: "now" | "preNN"（NN=分数）
    type Decided = (typeof rawTasks)[number] & { kind: string; minutesBefore: number }
    const tasks: Decided[] = []
    for (const t of rawTasks) {
      if (t.executionTime === nowHHMM) {
        tasks.push({ ...t, kind: "now", minutesBefore: 0 })
        continue
      }
      if (t.notifyEnabled) {
        const n = t.notifyMinutesBefore
        if (NOTIFY_MINUTES_OPTIONS.includes(n as (typeof NOTIFY_MINUTES_OPTIONS)[number])) {
          if (t.executionTime === plusMap.get(n)) {
            tasks.push({ ...t, kind: `pre${n}`, minutesBefore: n })
          }
        }
      }
    }

    let sent = 0
    let skipped = 0
    let failed = 0
    const details: Array<{ task: string; kind: string; ok?: boolean; reason?: string }> = []

    for (const t of tasks) {
      const validAssignees = (t.assignees ?? [])
        .map((a) => a.employee)
        .filter((e): e is NonNullable<typeof e> => !!e && !!e.lineUserId && e.isActive)

      if (validAssignees.length === 0) {
        skipped++
        details.push({ task: t.title, kind: "-", reason: "no_line_user" })
        continue
      }

      const kind = t.kind
      const tag = `${dateStr} ${t.executionTime} ${kind}`

      // 重複チェック（タスク単位）
      if (t.notifiedExecAt === tag) {
        skipped++
        details.push({ task: t.title, kind, reason: "already_notified" })
        continue
      }

      const proj = t.project?.name ? `[${t.project.name}] ` : ""
      const message =
        kind === "now"
          ? `🚨 実行時刻になりました\n${proj}${t.title}\n今、やってください`
          : `⏰ あと${t.minutesBefore}分で実行時刻です\n${proj}${t.title}\n実行時刻: ${t.executionTime}`

      // 担当者全員に送信
      let anySent = false
      for (const assignee of validAssignees) {
        const r = await pushLineMessage(assignee.lineUserId!, message)
        if (r.ok) {
          sent++
          anySent = true
          details.push({ task: `${t.title}→${assignee.name}`, kind, ok: true })
        } else {
          failed++
          details.push({ task: `${t.title}→${assignee.name}`, kind, ok: false, reason: r.error })
        }
      }

      // 誰か1人でも送信成功したら通知済み記録
      if (anySent) {
        await prisma.businessTask.update({
          where: { id: t.id },
          data: { notifiedExecAt: tag },
        })
      }
    }

    return NextResponse.json({
      success: true,
      now: nowHHMM,
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
