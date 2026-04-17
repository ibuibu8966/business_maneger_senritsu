import { BusinessTaskRepository } from "@/server/repositories/business-task.repository"

/**
 * 繰り返しタスク自動生成 Use-Case
 *
 * recurringPattern に基づき「今日生成すべきか」を判定し、
 * 該当するタスクのコピー（recurring=false, status=TODO）を作成する。
 */
export class GenerateRecurringTasks {
  static async execute() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayDay = today.getDay() // 0=日〜6=土
    const todayDate = today.getDate() // 1-31

    // 第何週かを計算（1-5）
    const todayWeek = Math.ceil(todayDate / 7)

    const recurringTasks = await BusinessTaskRepository.findRecurringTasks()
    const generated: string[] = []

    for (const task of recurringTasks) {
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
          // recurringDay(0=日〜6=土) が今日の曜日と一致
          shouldGenerate = task.recurringDay === todayDay
          break

        case "monthly_date":
          // recurringDay(1-31) が今日の日と一致
          shouldGenerate = task.recurringDay === todayDate
          break

        case "monthly_weekday":
          // recurringWeek(1-5) と recurringDay(0-6) から「第N週のX曜日」が今日か判定
          shouldGenerate =
            task.recurringWeek === todayWeek && task.recurringDay === todayDay
          break

        default:
          continue
      }

      if (!shouldGenerate) continue

      // 新タスクを作成: status=TODO、元タスクの情報を引き継ぎ、recurringはfalse
      await BusinessTaskRepository.create({
        projectId: task.projectId,
        title: task.title,
        detail: task.detail,
        assigneeId: task.assigneeId,
        deadline: null,
        status: "TODO",
        memo: task.memo,
        recurring: false,
        sortOrder: 0,
        contactId: task.contactId,
        partnerId: task.partnerId,
        tool: task.tool,
        priority: task.priority,
      })

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
