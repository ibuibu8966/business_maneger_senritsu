import { NextRequest, NextResponse } from "next/server"
import { GenerateRecurringTasks } from "@/use-cases/generate-recurring-tasks.use-case"

/**
 * 繰り返しタスク自動生成 CRON API
 *
 * GET/POST /api/cron/generate-tasks
 * Header: Authorization: Bearer CRON_SECRET
 */
async function handleGenerateTasks(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await GenerateRecurringTasks.execute()
    return NextResponse.json(result)
  } catch (e) {
    console.error("繰り返しタスク生成に失敗しました", e)
    return NextResponse.json(
      { error: "繰り返しタスク生成に失敗しました" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return handleGenerateTasks(req)
}

export async function POST(req: NextRequest) {
  return handleGenerateTasks(req)
}
