import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * 現在ログイン中のEmployee情報を返す
 * GET /api/employees/me
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const me = await prisma.employee.findUnique({
    where: { id: session.user.id as string },
    select: { id: true, name: true, email: true, lineUserId: true },
  })
  if (!me) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(me)
}
