import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { pushLineMessage } from "@/lib/line-notify"
import { logger } from "@/lib/logger"

/**
 * 朝8:30に実行されるCron。
 * lineUserId を持つ全Employeeに対して、自分の status != DONE のタスクを
 * 実行時刻順に並べてLINEで送信する。
 *
 * Vercel Cron schedule: "30 23 * * *" (UTC = JST 08:30)
 * 認証: Authorization: Bearer ${CRON_SECRET}
 */
export async function POST(req: NextRequest) {
  return run(req)
}
export async function GET(req: NextRequest) {
  return run(req)
}

async function run(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? ""
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const employees = await prisma.employee.findMany({
      where: { lineUserId: { not: null }, isActive: true },
      select: { id: true, name: true, lineUserId: true },
    })

    let sent = 0
    let failed = 0
    const details: Array<{ employee: string; taskCount: number; ok: boolean }> = []

    for (const emp of employees) {
      const tasks = await prisma.businessTask.findMany({
        where: {
          assignees: { some: { employeeId: emp.id } },
          status: { not: "DONE" },
          recurring: false,
          OR: [
            { project: { status: "ACTIVE" } },
            { business: { status: "ACTIVE" } },
          ],
        },
        select: {
          title: true,
          executionTime: true,
          deadline: true,
          status: true,
          priority: true,
          project: { select: { name: true } },
          business: { select: { name: true } },
        },
      })

      // 実行時刻順 → null は最後
      tasks.sort((a, b) => {
        if (a.executionTime && b.executionTime) return a.executionTime.localeCompare(b.executionTime)
        if (a.executionTime) return -1
        if (b.executionTime) return 1
        return 0
      })

      const today = new Date()
      const jstNow = new Date(today.getTime() + 9 * 60 * 60 * 1000)
      const dateStr = `${jstNow.getUTCMonth() + 1}/${jstNow.getUTCDate()}`

      let body: string
      if (tasks.length === 0) {
        body = `おはようございます🌞\n${dateStr}（${emp.name}さん）\n\n今日のタスクはありません。`
      } else {
        const lines = tasks.map((t) => {
          const time = t.executionTime ? `🕐${t.executionTime} ` : ""
          const label = t.project?.name ?? t.business?.name
          const proj = label ? `[${label}] ` : ""
          return `・${time}${proj}${t.title}`
        })
        body =
          `おはようございます🌞\n${dateStr}（${emp.name}さん）\n` +
          `今日のタスク：${tasks.length}件\n\n` +
          lines.join("\n")
      }

      const r = await pushLineMessage(emp.lineUserId!, body)
      if (r.ok) sent++
      else failed++
      details.push({ employee: emp.name, taskCount: tasks.length, ok: r.ok })
    }

    return NextResponse.json({
      success: true,
      employees: employees.length,
      sent,
      failed,
      details,
    })
  } catch (e) {
    logger.error("notify-morning failed", e)
    return NextResponse.json({ error: "notify-morning failed" }, { status: 500 })
  }
}
