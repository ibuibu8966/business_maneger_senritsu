import { Skeleton } from "@/components/ui/skeleton"

export function CalendarSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* ヘッダー: 月切り替え */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`dow-${i}`} className="h-5 w-full" />
        ))}
      </div>

      {/* カレンダーグリッド (5週分) */}
      {Array.from({ length: 5 }).map((_, weekIdx) => (
        <div key={`week-${weekIdx}`} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, dayIdx) => (
            <div
              key={`day-${weekIdx}-${dayIdx}`}
              className="flex flex-col gap-1 p-2 min-h-[80px] rounded-md border border-border/50"
            >
              <Skeleton className="h-4 w-6" />
              {/* ランダムにイベントっぽいスケルトンを表示 */}
              {(weekIdx + dayIdx) % 3 === 0 && (
                <Skeleton className="h-5 w-full rounded-sm" />
              )}
              {(weekIdx + dayIdx) % 4 === 0 && (
                <Skeleton className="h-5 w-3/4 rounded-sm" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
