import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * CRMアラートAPI（CRON用）
 *
 * 1. チケット放置アラート: 未対応チケット（open/in_progress）が3日以上更新されていない場合
 * 2. Discordロール未付与アラート: アクティブなサブスクでdiscordRoleAssigned=falseの場合
 *
 * GET /api/cron/crm-alerts?key=CRON_SECRET
 * → アラートメッセージを生成して返す（外部からLINE送信する用）
 */
export async function GET(req: NextRequest) {
  // 簡易認証（CRON_SECRETで保護）
  const key = req.nextUrl.searchParams.get("key")
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const alerts: string[] = []
  const now = new Date()

  // --- 1. チケット放置アラート ---
  const staleThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3日前
  const staleTickets = await prisma.ticket.findMany({
    where: {
      status: { in: ["OPEN", "WAITING", "IN_PROGRESS"] },
      isArchived: false,
      updatedAt: { lt: staleThreshold },
    },
    include: {
      contact: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { updatedAt: "asc" },
  })

  if (staleTickets.length > 0) {
    const lines = staleTickets.map((t) => {
      const days = Math.floor((now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      const priority = t.priority === "HIGH" ? "🔴高" : t.priority === "MEDIUM" ? "🟡中" : "⚪低"
      return `・${t.title}（${t.contact?.name ?? "未設定"}）${priority} - ${days}日放置 - 担当: ${t.assignee.name}`
    })
    alerts.push(`【チケット放置アラート】${staleTickets.length}件\n${lines.join("\n")}`)
  }

  // --- 2. Discordロール未付与アラート ---
  const unassignedRoles = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      discordRoleAssigned: false,
    },
    include: {
      contact: { select: { name: true } },
      course: { select: { name: true, discordRoleName: true } },
    },
  })

  if (unassignedRoles.length > 0) {
    const lines = unassignedRoles.map((s) => {
      return `・${s.contact.name} - ${s.course.name}（ロール: ${s.course.discordRoleName || "未設定"}）`
    })
    alerts.push(`【Discordロール未付与】${unassignedRoles.length}件\n${lines.join("\n")}`)
  }

  // --- 3. 未決済アラート（当月分） ---
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const unconfirmed = await prisma.paymentCheck.count({
    where: { year, month, isConfirmed: false },
  })

  if (unconfirmed > 0) {
    alerts.push(`【未決済確認】${year}年${month}月分: ${unconfirmed}件が未確認`)
  }

  if (alerts.length === 0) {
    return NextResponse.json({ message: "アラートなし", alerts: [] })
  }

  const fullMessage = `📋 CRMアラート\n\n${alerts.join("\n\n")}`

  return NextResponse.json({
    message: fullMessage,
    alertCount: alerts.length,
    details: {
      staleTickets: staleTickets.length,
      unassignedRoles: unassignedRoles.length,
      unconfirmedPayments: unconfirmed,
    },
  })
}
