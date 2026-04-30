import { NextRequest, NextResponse } from "next/server"
import { GenerateBalanceSnapshots } from "@/server/use-cases/generate-balance-snapshots.use-case"

/**
 * 残高スナップショット日次バッチ CRON API
 *
 * GET/POST /api/cron/snapshot
 * Header: Authorization: Bearer CRON_SECRET
 *
 * 毎日 UTC 15:00 (JST 00:00) に Vercel Cron で実行される。
 * - 全アクティブ口座の前日末残高を AccountBalanceSnapshot に upsert
 * - recalcRequiredFromDate がセットされている口座は遡って再生成 → フラグクリア
 */
async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await GenerateBalanceSnapshots.execute()
    return NextResponse.json(result)
  } catch (e) {
    console.error("残高スナップショット生成に失敗しました", e)
    return NextResponse.json(
      { error: "残高スナップショット生成に失敗しました" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
