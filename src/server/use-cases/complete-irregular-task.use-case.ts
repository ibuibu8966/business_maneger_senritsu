import { BusinessTaskRepository } from "@/server/repositories/business-task.repository"
import { prisma } from "@/lib/prisma"

/**
 * 不定期繰り返しタスクの完了処理 Use-Case
 *
 * - finished=true: 親タスクを DONE にして繰り返し終了
 * - nextDate指定: 指定日を deadline に持つ子タスクを生成し、親は TODO のまま継続
 */
export class CompleteIrregularTask {
  static async execute(taskId: string, params: { nextDate: string | null; finished: boolean }) {
    const task = await prisma.businessTask.findUnique({ where: { id: taskId } })
    if (!task) throw new Error("Task not found")
    if (!task.recurring || task.recurringPattern !== "irregular") {
      throw new Error("Task is not an irregular recurring task")
    }

    if (params.finished) {
      await BusinessTaskRepository.update(taskId, { status: "DONE" })
      return { generated: false, finished: true }
    }

    if (!params.nextDate) throw new Error("nextDate is required when not finished")

    const deadline = new Date(`${params.nextDate}T00:00:00.000Z`)

    const assigneeRows = await prisma.taskAssignee.findMany({
      where: { taskId: task.id },
      select: { employeeId: true },
    })
    const assigneeIds = assigneeRows.map((r) => r.employeeId)

    const created = await BusinessTaskRepository.create({
      projectId: task.projectId,
      businessId: task.businessId,
      title: task.title,
      detail: task.detail,
      assigneeId: task.assigneeId,
      deadline,
      status: "TODO",
      memo: task.memo,
      recurring: false,
      sortOrder: 0,
      contactId: task.contactId,
      partnerId: task.partnerId,
      tool: task.tool,
      priority: task.priority,
      executionTime: task.executionTime,
      notifyEnabled: task.notifyEnabled,
      notifyMinutesBefore: task.notifyMinutesBefore,
      issueId: task.issueId,
      createdBy: task.createdBy,
    })

    if (assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({
        data: assigneeIds.map((employeeId) => ({ taskId: created.id, employeeId })),
        skipDuplicates: true,
      })
    }

    await BusinessTaskRepository.updateLastGenerated(task.id, new Date())

    return { generated: true, finished: false, childTaskId: created.id }
  }
}
