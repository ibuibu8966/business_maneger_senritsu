import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// --- レート制限（IP単位） ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1分
const RATE_LIMIT_MAX = 60 // 1分あたり最大60リクエスト

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

// 古いエントリを定期的にクリーンアップ（メモリリーク防止）
function cleanupRateLimitMap() {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}

let lastCleanup = Date.now()

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // API ルートへのレート制限 + 認証チェック（/api/auth は除外）
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

    // 5分ごとにクリーンアップ
    if (Date.now() - lastCleanup > 5 * 60 * 1000) {
      cleanupRateLimitMap()
      lastCleanup = Date.now()
    }

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくお待ちください。" },
        { status: 429 },
      )
    }

    // API ルートの認証チェック（cron エンドポイント等の例外は Authorization ヘッダーで判定）
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // CSRF 対策: 書き込み操作の Origin 検証
    const method = req.method
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const origin = req.headers.get("origin")
      const host = req.headers.get("host")
      if (origin) {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
        }
      }
    }

    return NextResponse.next()
  }

  // ログインページ・静的アセット・認証APIはスキップ
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // 未認証 → ログインページへ
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ロールベースアクセス制御
  const role = (token.role as string) === "user" ? "employee" : (token.role as string)
  const adminOnlyPaths = ["/users"]
  if (adminOnlyPaths.some((p) => pathname.startsWith(p))) {
    if (role !== "master_admin" && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
