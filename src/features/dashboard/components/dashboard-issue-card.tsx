"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users } from "lucide-react"
import { useSession } from "next-auth/react"
import { useBusinessIssues } from "@/hooks/use-business"
import type { BusinessIssueDTO } from "@/types/dto"

const PRIORITY_LABEL: Record<string, string> = {
  highest: "最高",
  high: "高",
  medium: "中",
  low: "低",
}

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  highest: "destructive",
  high: "destructive",
  medium: "default",
  low: "outline",
}

function IssueList({ issues, isLoading, emptyMessage }: {
  issues: BusinessIssueDTO[]
  isLoading: boolean
  emptyMessage: string
}) {
  return isLoading ? (
    <p className="text-sm text-muted-foreground">読み込み中...</p>
  ) : issues.length === 0 ? (
    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  ) : (
    <ul className="space-y-2">
      {issues.slice(0, 6).map((issue) => (
        <li key={issue.id} className="flex items-start justify-between gap-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{issue.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {issue.assigneeName ? `${issue.assigneeName} · ` : ""}{issue.projectName}
            </p>
          </div>
          <Badge variant={PRIORITY_VARIANT[issue.priority] ?? "outline"} className="text-[10px] h-5 shrink-0">
            {PRIORITY_LABEL[issue.priority] ?? issue.priority}
          </Badge>
        </li>
      ))}
      {issues.length > 6 && (
        <li className="text-xs text-muted-foreground">
          他 {issues.length - 6} 件
        </li>
      )}
    </ul>
  )
}

export function DashboardMyIssueCard() {
  const { data: session } = useSession()
  const userId = (session?.user as { id?: string })?.id
  const { data: issues, isLoading } = useBusinessIssues()

  const myIssues = (issues ?? []).filter(
    (i: BusinessIssueDTO) => i.status !== "resolved" && i.assigneeId === userId
  )

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          自分の課題
          {myIssues.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">
              {myIssues.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <IssueList issues={myIssues} isLoading={isLoading} emptyMessage="自分の課題はありません" />
      </CardContent>
    </Card>
  )
}

export function DashboardAllIssueCard() {
  const { data: issues, isLoading } = useBusinessIssues()

  const unresolvedIssues = (issues ?? []).filter((i: BusinessIssueDTO) => i.status !== "resolved")

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-orange-600" />
          全員の課題
          {unresolvedIssues.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">
              {unresolvedIssues.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <IssueList issues={unresolvedIssues} isLoading={isLoading} emptyMessage="未解決の課題はありません" />
      </CardContent>
    </Card>
  )
}
