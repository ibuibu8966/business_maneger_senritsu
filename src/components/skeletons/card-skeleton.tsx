import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface CardSkeletonProps {
  count?: number
}

export function CardSkeleton({ count = 6 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
