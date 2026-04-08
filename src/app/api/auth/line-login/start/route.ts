import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import crypto from "crypto"

/**
 * LINE Login OAuth開始エンドポイント
 * GET /api/auth/line-login/start
 *
 * 1. ログイン中のEmployee.idをCookieのstateに紐付けて保存
 * 2. LINE認可URLへリダイレクト
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID
  const callbackUrl = process.env.LINE_LOGIN_CALLBACK_URL
  if (!channelId || !callbackUrl) {
    return NextResponse.json({ error: "LINE Login is not configured" }, { status: 500 })
  }

  // CSRF対策 + Employee紐付け用のstate
  const stateRaw = crypto.randomBytes(16).toString("hex")
  // state には employeeId と nonce を埋め込む（JSON → base64url）
  const statePayload = Buffer.from(
    JSON.stringify({ eid: session.user.id as string, n: stateRaw })
  ).toString("base64url")

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: callbackUrl,
    state: statePayload,
    scope: "openid profile",
  })
  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`

  // Cookieにもstateを保存して照合する
  const res = NextResponse.redirect(authUrl)
  res.cookies.set("line_login_state", stateRaw, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10分
    path: "/",
  })
  return res
}
