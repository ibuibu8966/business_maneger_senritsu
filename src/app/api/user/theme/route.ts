import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ALLOWED_THEMES = ["light", "dark", "system"] as const
type Theme = (typeof ALLOWED_THEMES)[number]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.user.id },
    select: { themePreference: true },
  })

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ theme: employee.themePreference as Theme })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const theme = body?.theme
  if (!theme || !ALLOWED_THEMES.includes(theme)) {
    return NextResponse.json(
      { error: "Invalid theme. Must be one of: light, dark, system" },
      { status: 400 }
    )
  }

  const updated = await prisma.employee.update({
    where: { id: session.user.id },
    data: { themePreference: theme },
    select: { themePreference: true },
  })

  return NextResponse.json({ theme: updated.themePreference as Theme })
}
