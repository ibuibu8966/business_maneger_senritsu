import { TaskChecklistRepository } from "@/repositories/task-checklist.repository"

export class AddTaskChecklistItem {
  static async execute(data: { taskId: string; title: string; sortOrder?: number }) {
    return TaskChecklistRepository.create(data)
  }
}
