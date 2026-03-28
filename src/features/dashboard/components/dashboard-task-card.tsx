"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckSquare, Users } from "lucide-react"
import { useSession } from "next-auth/react"
import { useBusinessTasks } from "@/hooks/use-business"
import type { BusinessTaskDTO } from "@/types/dto"

const STATUS_LABEL: Record<string, string> = {
  todo: "未着手",
  "in-progress": "進行中",
  waiting: "待ち",
  done: "完了",
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  todo: "outline",
  "in-progress": "default",
  waiting: "secondary",
  done: "secondary",
}

function TaskList({ tasks, isLoading, emptyMessage }: {
  tasks: BusinessTaskDTO[]
  isLoading: boolean
  emptyMessage: string
}) {
  return isLoading ? (
    <p className="text-sm text-muted-foreground">読み込み中...</p>
  ) : tasks.length === 0 ? (
    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  ) : (
    <ul className="space-y-2">
      {tasks.slice(0, 8).map((task) => (
        <li key={task.id} className="flex items-start justify-between gap-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{task.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {task.assigneeName ? `${task.assigneeName} · ` : ""}{task.projectName}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[task.status] ?? "outline"} className="text-[10px] h-5 shrink-0">
            {STATUS_LABEL[task.status] ?? task.status}
          </Badge>
        </li>
      ))}
      {tasks.length > 8 && (
        <li className="text-xs text-muted-foreground">
          他 {tasks.length - 8} 件
        </li>
      )}
    </ul>
  )
}

export function DashboardMyTaskCard() {
  const { data: session } = useSession()
  const userId = (session?.user as { id?: string })?.id
  const { data: tasks, isLoading } = useBusinessTasks()

  const myTasks = (tasks ?? []).filter(
    (t: BusinessTaskDTO) => t.status !== "done" && t.assigneeId === userId
  )

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckSquare className="w-4 h-4 text-blue-600" />
          自分のタスク
          {myTasks.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {myTasks.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TaskList tasks={myTasks} isLoading={isLoading} emptyMessage="自分のタスクはありません" />
      </CardContent>
    </Card>
  )
}

export function DashboardAllTaskCard() {
  const { data: tasks, isLoading } = useBusinessTasks()

  const activeTasks = (tasks ?? []).filter((t: BusinessTaskDTO) => t.status !== "done")

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-indigo-600" />
          全員のタスク
          {activeTasks.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {activeTasks.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TaskList tasks={activeTasks} isLoading={isLoading} emptyMessage="未完了のタスクはありません" />
      </CardContent>
    </Card>
  )
}
