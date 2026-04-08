import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * LINE Login コールバック
 * GET /api/auth/line-login/callback?code=xxx&state=xxx
 *
 * 1. state の検証（Cookie照合）
 * 2. code → access_token / id_token を取得
 * 3. id_token から userId を取り出す
 * 4. Employee.lineUserId に保存
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL(`/profile?line_error=${error}`, req.url))
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/profile?line_error=missing_code", req.url))
  }

  // state検証
  let employeeId: string
  let nonce: string
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString())
    employeeId = decoded.eid
    nonce = decoded.n
  } catch {
    return NextResponse.redirect(new URL("/profile?line_error=invalid_state", req.url))
  }

  const cookieState = req.cookies.get("line_login_state")?.value
  if (!cookieState || cookieState !== nonce) {
    return NextResponse.redirect(new URL("/profile?line_error=state_mismatch", req.url))
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET
  const callbackUrl = process.env.LINE_LOGIN_CALLBACK_URL
  if (!channelId || !channelSecret || !callbackUrl) {
    return NextResponse.redirect(new URL("/profile?line_error=not_configured", req.url))
  }

  try {
    // トークン取得
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    })
    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      logger.error("LINE token exchange failed", errText)
      return NextResponse.redirect(new URL("/profile?line_error=token_failed", req.url))
    }
    const tokenJson: { id_token?: string; access_token?: string } = await tokenRes.json()

    // id_token から userId を取得（JWTのpayloadをデコード）
    let lineUserId: string | undefined
    if (tokenJson.id_token) {
      const parts = tokenJson.id_token.split(".")
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString())
        lineUserId = payload.sub
      }
    }

    // フォールバック: profile API を叩く
    if (!lineUserId && tokenJson.access_token) {
      const profRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      })
      if (profRes.ok) {
        const prof: { userId?: string } = await profRes.json()
        lineUserId = prof.userId
      }
    }

    if (!lineUserId) {
      return NextResponse.redirect(new URL("/profile?line_error=no_userid", req.url))
    }

    // Employeeに保存
    await prisma.employee.update({
      where: { id: employeeId },
      data: { lineUserId },
    })

    const res = NextResponse.redirect(new URL("/profile?line_connected=1", req.url))
    res.cookies.delete("line_login_state")
    return res
  } catch (e) {
    logger.error("LINE login callback failed", e)
    return NextResponse.redirect(new URL("/profile?line_error=server", req.url))
  }
}
