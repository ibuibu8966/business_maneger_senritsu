"use client"

import { useSession } from "next-auth/react"
import { useBusinessTasks, useBusinessIssues } from "./use-business"

export function useMyBadgeCounts() {
  const { data: session } = useSession()
  const myId = session?.user?.id as string | undefined
  const { data: tasks = [] } = useBusinessTasks()
  const { data: issues = [] } = useBusinessIssues()

  const myTasks = myId
    ? tasks.filter((t) => t.assigneeId === myId && t.status !== "done").length
    : 0

  const myIssues = myId
    ? issues.filter((i) => i.assigneeId === myId && i.status !== "resolved").length
    : 0

  return { myTasks, myIssues, total: myTasks + myIssues }
}
