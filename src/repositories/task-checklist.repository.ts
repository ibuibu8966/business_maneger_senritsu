import { prisma } from "@/lib/prisma"

export class TaskChecklistRepository {
  static async create(data: { taskId: string; title: string; sortOrder?: number }) {
    return prisma.taskChecklistItem.create({ data })
  }

  static async update(id: string, data: { title?: string; checked?: boolean; sortOrder?: number }) {
    return prisma.taskChecklistItem.update({ where: { id }, data })
  }

  static async delete(id: string) {
    return prisma.taskChecklistItem.delete({ where: { id } })
  }
}
