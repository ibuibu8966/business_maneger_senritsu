import { BusinessTaskRepository } from "@/server/repositories/business-task.repository"
import { prisma } from "@/lib/prisma"

/**
 * 不定期繰り返しタスクの「次回予約」処理 Use-Case
 *
 * - finished=true: 親タスクを DONE にして繰り返し終了（nextScheduledAt をクリア）
 * - nextDate指定: 親タスクの nextScheduledAt を更新（即生成はしない、当日になったらバッチで自動生成）
 *
 * 受け取る taskId は親タスク（recurring=true, pattern=irregular）の ID
 */
export class CompleteIrregularTask {
  static async execute(taskId: string, params: { nextDate: string | null; finished: boolean }) {
    const task = await prisma.businessTask.findUnique({ where: { id: taskId } })
    if (!task) throw new Error("Task not found")
    if (!task.recurring || task.recurringPattern !== "irregular") {
      throw new Error("Task is not an irregular recurring task")
    }

    if (params.finished) {
      await BusinessTaskRepository.update(taskId, { status: "DONE", nextScheduledAt: null })
      return { finished: true, nextScheduledAt: null }
    }

    if (!params.nextDate) throw new Error("nextDate is required when not finished")

    const nextScheduledAt = new Date(`${params.nextDate}T00:00:00.000Z`)
    await BusinessTaskRepository.update(taskId, { nextScheduledAt })

    return { finished: false, nextScheduledAt: nextScheduledAt.toISOString() }
  }
}
