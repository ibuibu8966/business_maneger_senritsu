import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { NextResponse } from "next/server"

type Role = "master_admin" | "admin" | "employee"

export async function requireRole(...allowed: Role[]) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null }
  }
  const role = session.user.role as Role
  if (!allowed.includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null }
  }
  return { error: null, session }
}
