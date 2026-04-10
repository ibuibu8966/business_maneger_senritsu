"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif", color: "var(--foreground, #333)" }}>
          <h2>エラーが発生しました</h2>
          <p style={{ color: "var(--muted-foreground, #666)", margin: "16px 0" }}>
            問題が発生しました。もう一度お試しください。
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 24px",
              borderRadius: "6px",
              border: "1px solid var(--border, #ccc)",
              cursor: "pointer",
              fontSize: "14px",
              backgroundColor: "var(--background, #fff)",
              color: "var(--foreground, #333)",
            }}
          >
            もう一度試す
          </button>
        </div>
      </body>
    </html>
  )
}
