import { ChecklistTemplateRepository } from "@/repositories/checklist-template.repository"
import { TaskChecklistRepository } from "@/repositories/task-checklist.repository"

export class ApplyChecklistTemplate {
  static async execute(taskId: string, templateId: string) {
    const template = await ChecklistTemplateRepository.findById(templateId)
    if (!template) throw new Error("テンプレートが見つかりません")

    const results = []
    for (const item of template.items) {
      const created = await TaskChecklistRepository.create({
        taskId,
        title: item.title,
        sortOrder: item.sortOrder,
      })
      results.push(created)
    }
    return results
  }
}
