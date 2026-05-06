import { BusinessTaskRepository } from "@/server/repositories/business-task.repository"
import { prisma } from "@/lib/prisma"

/**
 * 繰り返しタスク自動生成 Use-Case
 *
 * recurringPattern に基づき「今日生成すべきか」を判定し、
 * 該当するタスクのコピー（recurring=false, status=TODO）を作成する。
 */
export class GenerateRecurringTasks {
  static async execute() {
    // JST today（Vercelは UTC で動作するためJST換算）
    const now = new Date()
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const today = new Date(Date.UTC(
      jstNow.getUTCFullYear(),
      jstNow.getUTCMonth(),
      jstNow.getUTCDate()
    ))

    const todayDay = jstNow.getUTCDay() // 0=日〜6=土（JST）
    const todayDate = jstNow.getUTCDate() // 1-31（JST）

    // 第何週かを計算（1-5）
    const todayWeek = Math.ceil(todayDate / 7)

    const recurringTasks = await BusinessTaskRepository.findRecurringTasks()
    const generated: string[] = []

    for (const task of recurringTasks) {
      // 親タスクが完了状態（DONE）なら繰り返し停止扱いとして生成しない
      if (task.status === "DONE") continue

      // recurringEndDate が設定されていて過ぎていたらスキップ
      if (task.recurringEndDate) {
        const endDate = new Date(task.recurringEndDate)
        endDate.setHours(23, 59, 59, 999)
        if (today > endDate) continue
      }

      // lastGeneratedAt が今日ならスキップ（重複防止）
      if (task.lastGeneratedAt) {
        const lastGen = new Date(task.lastGeneratedAt)
        lastGen.setHours(0, 0, 0, 0)
        if (lastGen.getTime() === today.getTime()) continue
      }

      // パターンに基づき「今日生成すべきか」を判定
      let shouldGenerate = false

      switch (task.recurringPattern) {
        case "daily":
          shouldGenerate = true
          break

        case "weekly":
          // 複数曜日対応：recurringDays（配列）が空でなければそちらを優先、なければ recurringDay（単一）で判定
          if (task.recurringDays && task.recurringDays.length > 0) {
            shouldGenerate = task.recurringDays.includes(todayDay)
          } else {
            shouldGenerate = task.recurringDay === todayDay
          }
          break

        case "monthly_date": {
          // recurringDay(1-31) が今日の日と一致
          // 31日設定で当月に31日がない場合は月末日にクランプ（例：31日設定 × 4月→30日に生成）
          if (task.recurringDay == null) break
          const lastDayOfMonth = new Date(Date.UTC(
            jstNow.getUTCFullYear(),
            jstNow.getUTCMonth() + 1,
            0
          )).getUTCDate()
          const targetDate = Math.min(task.recurringDay, lastDayOfMonth)
          shouldGenerate = targetDate === todayDate
          break
        }

        case "monthly_weekday":
          // recurringWeek(1-5) と recurringDay(0-6) から「第N週のX曜日」が今日か判定
          shouldGenerate =
            task.recurringWeek === todayWeek && task.recurringDay === todayDay
          break

        default:
          continue
      }

      if (!shouldGenerate) continue

      // 元タスクの複数担当者を取得
      const assigneeRows = await prisma.taskAssignee.findMany({
        where: { taskId: task.id },
        select: { employeeId: true },
      })
      const assigneeIds = assigneeRows.map((r) => r.employeeId)

      // 新タスクを作成: status=TODO、元タスクの情報を引き継ぎ、recurringはfalse
      const created = await BusinessTaskRepository.create({
        projectId: task.projectId,
        businessId: task.businessId,
        title: task.title,
        detail: task.detail,
        assigneeId: task.assigneeId,
        deadline: today, // 子タスクは生成日（JST）を期限に。LINE通知の deadline=今日 フィルタで使用
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

      // 複数担当者を新タスクにもコピー
      if (assigneeIds.length > 0) {
        await prisma.taskAssignee.createMany({
          data: assigneeIds.map((employeeId) => ({ taskId: created.id, employeeId })),
          skipDuplicates: true,
        })
      }

      // 元タスクの lastGeneratedAt を更新
      await BusinessTaskRepository.updateLastGenerated(task.id, today)

      generated.push(task.title)
    }

    return {
      generatedCount: generated.length,
      generatedTasks: generated,
    }
  }
}
