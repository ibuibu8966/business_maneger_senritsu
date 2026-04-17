import { NextResponse } from "next/server"
import { GetBusinesses } from "@/server/use-cases/get-businesses.use-case"
import { GetAccounts } from "@/server/use-cases/get-accounts.use-case"
import { handleApiError } from "@/server/lib/error-response"

export class MasterController {
  static async businesses() {
    try {
      const data = await GetBusinesses.execute()
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "事業一覧", action: "取得" })
    }
  }

  static async accounts() {
    try {
      const data = await GetAccounts.execute()
      return NextResponse.json(data)
    } catch (e) {
      return handleApiError(e, { resource: "口座一覧", action: "取得" })
    }
  }
}
