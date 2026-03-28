"use client"

export default function CrmError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-destructive">エラーが発生しました: {error.message}</p>
      <button onClick={reset} className="text-sm underline">再試行</button>
    </div>
  )
}
