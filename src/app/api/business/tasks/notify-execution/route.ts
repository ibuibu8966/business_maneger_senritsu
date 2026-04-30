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
    const nowDateTime = `${dateStr} ${nowHHMM}` // 日時指定形式 "YYYY-MM-DD HH:MM"

    // N分後の HH:MM / 日時 マップ（N -> { hhmm, dateTime }）
    const plusMap = new Map<number, { hhmm: string; dateTime: string }>()
    for (const n of NOTIFY_MINUTES_OPTIONS) {
      const p = new Date(jstNow.getTime() + n * 60 * 1000)
      const pHHMM = `${pad2(p.getUTCHours())}:${pad2(p.getUTCMinutes())}`
      const pDateStr = `${p.getUTCFullYear()}-${pad2(p.getUTCMonth() + 1)}-${pad2(p.getUTCDate())}`
      plusMap.set(n, { hhmm: pHHMM, dateTime: `${pDateStr} ${pHHMM}` })
    }

    // 候補値（HH:MM形式 と YYYY-MM-DD HH:MM形式 の両方）
    const candidateHHMMs = Array.from(new Set<string>([nowHHMM, ...Array.from(plusMap.values()).map(v => v.hhmm)]))
    const candidateDateTimes = Array.from(new Set<string>([nowDateTime, ...Array.from(plusMap.values()).map(v => v.dateTime)]))
    // JST今日のDate（@db.Date 比較用、UTC midnight として扱う）
    const todayDateAtUTC = new Date(`${dateStr}T00:00:00.000Z`)
    const rawTasks = await prisma.businessTask.findMany({
      where: {
        status: { not: "DONE" },
        recurring: false, // 繰り返し設定本体（親）は通知対象外。子タスクのみ
        assignees: { some: {} },
        AND: [
          {
            OR: [
              // パターンA: HH:MM形式 + deadline=今日（既存・繰り返しタスク向け）
              {
                executionTime: { in: candidateHHMMs },
                deadline: todayDateAtUTC,
              },
              // パターンB: YYYY-MM-DD HH:MM形式（新・単発タスク向け、deadline不要）
              {
                executionTime: { in: candidateDateTimes },
              },
            ],
          },
          {
            OR: [
              { project: { status: "ACTIVE" } },
              { business: { status: "ACTIVE" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        executionTime: true,
        notifiedExecAt: true,
        notifyEnabled: true,
        notifyMinutesBefore: true,
        project: { select: { name: true } },
        business: { select: { name: true } },
        assignees: {
          include: {
            employee: { select: { id: true, name: true, lineUserId: true, isActive: true } },
          },
        },
      },
    })

    // 各タスクについて「今このminute送るべき kind」を決める
    // kind: "now" | "preNN"（NN=分数）
    // executionTime は HH:MM 形式 or YYYY-MM-DD HH:MM 形式
    type Decided = (typeof rawTasks)[number] & { kind: string; minutesBefore: number }
    const tasks: Decided[] = []
    for (const t of rawTasks) {
      const et = t.executionTime
      if (!et) continue
      // 開始時刻通知：HH:MM 形式 == 現在HH:MM、 または 日時形式 == 現在日時
      if (et === nowHHMM || et === nowDateTime) {
        tasks.push({ ...t, kind: "now", minutesBefore: 0 })
        continue
      }
      // 事前通知（notifyEnabled かつ notifyMinutesBefore==N に一致）
      if (t.notifyEnabled) {
        const n = t.notifyMinutesBefore
        if (NOTIFY_MINUTES_OPTIONS.includes(n as (typeof NOTIFY_MINUTES_OPTIONS)[number])) {
          const plus = plusMap.get(n)
          if (plus && (et === plus.hhmm || et === plus.dateTime)) {
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
      // executionTime が日時形式（YYYY-MM-DD HH:MM）なら dateStr 不要
      const isDateTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t.executionTime ?? "")
      const tag = isDateTime
        ? `${t.executionTime} ${kind}`
        : `${dateStr} ${t.executionTime} ${kind}`

      // 重複チェック（タスク単位）
      if (t.notifiedExecAt === tag) {
        skipped++
        details.push({ task: t.title, kind, reason: "already_notified" })
        continue
      }

      const projLabel = t.project?.name ?? t.business?.name
      const proj = projLabel ? `[${projLabel}] ` : ""
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
