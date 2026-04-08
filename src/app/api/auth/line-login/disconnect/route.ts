import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * LINE連携解除
 * POST /api/auth/line-login/disconnect
 */
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await prisma.employee.update({
    where: { id: session.user.id as string },
    data: { lineUserId: null },
  })
  return NextResponse.json({ success: true })
}
