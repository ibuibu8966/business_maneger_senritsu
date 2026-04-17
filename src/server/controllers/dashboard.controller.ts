import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { GetDashboardLayout } from "@/server/use-cases/get-dashboard-layout.use-case"
import { UpdateDashboardLayout } from "@/server/use-cases/update-dashboard-layout.use-case"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const updateLayoutSchema = z.object({
  layout: z.array(
    z.object({
      cardType: z.enum(["my-task", "all-task", "my-issue", "all-issue", "schedule", "salon-meeting", "balance", "audit"]),
      id: z.string(),
      sortOrder: z.number().int(),
      colSpan: z.union([z.literal(1), z.literal(2)]).optional(),
    })
  ),
})

export class DashboardController {
  static async getLayout(req: NextRequest) {
    try {
      const session = await getServerSession(authOptions)
      const userId = session?.user?.id ?? "default"
      const data = await GetDashboardLayout.execute(userId)
      return NextResponse.json(data)
    } catch (e) {
      logger.error("ダッシュボードレイアウトの取得に失敗しました", e)
      return NextResponse.json({ error: "ダッシュボードレイアウトの取得に失敗しました" }, { status: 500 })
    }
  }

  static async updateLayout(req: NextRequest) {
    try {
      const session = await getServerSession(authOptions)
      const userId = session?.user?.id ?? "default"
      const body = await req.json()
      const data = updateLayoutSchema.parse(body)
      const r = await UpdateDashboardLayout.execute(userId, data.layout)
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      logger.error("ダッシュボードレイアウトの更新に失敗しました", e)
      return NextResponse.json({ error: "ダッシュボードレイアウトの更新に失敗しました" }, { status: 500 })
    }
  }
}
