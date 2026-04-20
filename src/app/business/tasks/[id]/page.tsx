"use client"

import { use } from "react"
import { TaskDetailPage } from "@/features/business/components/task-detail-page"

export default function TaskDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <TaskDetailPage taskId={id} />
}
