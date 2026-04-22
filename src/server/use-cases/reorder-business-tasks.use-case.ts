import { prisma } from "@/lib/prisma"

export class ReorderBusinessTasks {
  /**
   * 渡された taskIds の順序通りに sortOrder を連番で付け直す（トランザクション）
   */
  static async execute(taskIds: string[]) {
    if (taskIds.length === 0) return
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
