import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { BusinessTaskController } from "@/controllers/business.controller"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }
  const role = session.user.role
  // employee ロールの場合、assigneeId を自分のIDに強制する
  if (role === "employee") {
    const url = new URL(req.url)
    url.searchParams.set("assigneeId", session.user.id)
    const restrictedReq = new NextRequest(url, { headers: req.headers, method: req.method })
    return BusinessTaskController.list(restrictedReq)
  }
  return BusinessTaskController.list(req)
}
export async function POST(req: NextRequest) { return BusinessTaskController.create(req) }
