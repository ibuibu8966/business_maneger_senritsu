import { NextResponse } from "next/server"
import { GetBusinesses } from "@/use-cases/get-businesses.use-case"

export async function GET() {
  try {
    const data = await GetBusinesses.execute()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "事業一覧の取得に失敗しました" }, { status: 500 })
  }
}
