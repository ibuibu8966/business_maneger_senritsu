import { prisma } from "@/lib/prisma"

export class CategoryRepository {
  static async findMany() {
    return prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true, accountType: true },
      orderBy: { createdAt: "asc" },
    })
  }

  static async create(data: { name: string; type: "INCOME" | "EXPENSE"; accountType?: string | null }) {
    return prisma.category.create({
      data,
      select: { id: true, name: true, type: true, accountType: true },
    })
  }

  static async update(id: string, data: { name?: string; type?: "INCOME" | "EXPENSE"; accountType?: string | null }) {
    return prisma.category.update({
      where: { id },
      data,
      select: { id: true, name: true, type: true, accountType: true },
    })
  }

  static async delete(id: string) {
    return prisma.category.update({
      where: { id },
      data: { isActive: false },
    })
  }
}
