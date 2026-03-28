"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Schedule error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <svg
            className="h-6 w-6 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          スケジュールの読み込みに失敗しました
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          カレンダーデータの取得中にエラーが発生しました。再試行するか、しばらく経ってからもう一度お試しください。
        </p>
        {error.message && (
          <p className="text-xs text-muted-foreground/70 font-mono mt-1 max-w-md truncate">
            {error.message}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>
          再試行
        </Button>
        <Button onClick={() => window.location.reload()}>
          ページを再読み込み
        </Button>
      </div>
    </div>
  )
}
