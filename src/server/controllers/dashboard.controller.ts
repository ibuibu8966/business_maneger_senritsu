import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { GetDashboardLayout } from "@/server/use-cases/get-dashboard-layout.use-case"
import { UpdateDashboardLayout } from "@/server/use-cases/update-dashboard-layout.use-case"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { handleApiError } from "@/server/lib/error-response"

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
      return handleApiError(e, { resource: "ダッシュボードレイアウト", action: "取得" })
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
      return handleApiError(e, { resource: "ダッシュボードレイアウト", action: "更新" })
    }
  }
}
