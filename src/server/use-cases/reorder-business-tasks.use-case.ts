import { prisma } from "@/lib/prisma"

export class ReorderBusinessTasks {
  /**
   * 渡された taskIds の順序通りに sortOrder を連番で付け直す（トランザクション）
   * employeeId が指定されたら、その担当者専用の並び順（task_user_sort_orders）を更新する。
   * 指定がなければ全タスク共通の sortOrder を更新する。
   */
  static async execute(taskIds: string[], employeeId?: string) {
    if (taskIds.length === 0) return
    if (employeeId) {
      // 担当者ごとの並び順を upsert
      await prisma.$transaction(
        taskIds.map((taskId, index) =>
          prisma.taskUserSortOrder.upsert({
            where: { taskId_employeeId: { taskId, employeeId } },
            create: { taskId, employeeId, sortOrder: index },
            update: { sortOrder: index },
          })
        )
      )
      return
    }
    // 全体共通の並び順を更新
    await prisma.$transaction(
      taskIds.map((id, index) =>
        prisma.businessTask.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )
  }
}
