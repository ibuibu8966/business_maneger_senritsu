import { BusinessTaskRepository } from "@/server/repositories/business-task.repository"

export class ReorderBusinessTasks {
  static async execute(id: string, sortOrder: number) {
    return BusinessTaskRepository.update(id, { sortOrder })
  }
}
