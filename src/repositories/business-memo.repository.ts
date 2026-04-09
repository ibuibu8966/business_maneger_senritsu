import { prisma } from "@/lib/prisma"

export class BusinessMemoRepository {
  static async findByBusinessId(businessId: string) {
    return prisma.businessMemo.findMany({
      where: { businessId },
      orderBy: { date: "desc" },
    })
  }

  static async findByProjectId(projectId: string) {
    return prisma.businessMemo.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
    })
  }

  static async create(data: {
    businessId?: string
    projectId?: string
    date: Date
    content: string
    author: string
  }) {
    return prisma.businessMemo.create({ data })
  }

  static async delete(id: string) {
    return prisma.businessMemo.delete({ where: { id } })
  }
}
