import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 8, columns = 8 }: TableSkeletonProps) {
  return (
    <div className="w-full">
      {/* テーブルヘッダー */}
      <div className="flex gap-2 px-2 py-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`head-${i}`}
            className="h-4"
            style={{ width: i === 0 ? "96px" : i === columns - 1 ? "160px" : "100px" }}
          />
        ))}
      </div>
      {/* テーブル行 */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className="flex gap-2 px-2 py-3 border-b last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`cell-${rowIdx}-${colIdx}`}
              className="h-4"
              style={{ width: colIdx === 0 ? "96px" : colIdx === columns - 1 ? "160px" : "100px" }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
