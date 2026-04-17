import { NextResponse } from "next/server"
import { GetBusinesses } from "@/server/use-cases/get-businesses.use-case"
import { GetAccounts } from "@/server/use-cases/get-accounts.use-case"

export class MasterController {
  static async businesses() {
    try {
      const data = await GetBusinesses.execute()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: "事業一覧の取得に失敗しました" }, { status: 500 })
    }
  }

  static async accounts() {
    try {
      const data = await GetAccounts.execute()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: "口座一覧の取得に失敗しました" }, { status: 500 })
    }
  }
}
