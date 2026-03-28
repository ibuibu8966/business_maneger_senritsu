import { prisma } from "@/lib/prisma"

export class ChecklistTemplateRepository {
  static async findMany(businessId?: string) {
    return prisma.checklistTemplate.findMany({
      where: businessId ? { businessId } : undefined,
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    })
  }

  static async findById(id: string) {
    return prisma.checklistTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })
  }

  static async create(data: { name: string; businessId?: string; items: { title: string; sortOrder: number }[] }) {
    return prisma.checklistTemplate.create({
      data: {
        name: data.name,
        businessId: data.businessId ?? null,
        items: { create: data.items },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })
  }

  static async update(id: string, data: { name: string; businessId?: string; items: { title: string; sortOrder: number }[] }) {
    return prisma.$transaction(async (tx) => {
      await tx.checklistTemplateItem.deleteMany({ where: { templateId: id } })
      return tx.checklistTemplate.update({
        where: { id },
        data: {
          name: data.name,
          businessId: data.businessId ?? null,
          items: { create: data.items },
        },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      })
    })
  }

  static async delete(id: string) {
    return prisma.checklistTemplate.delete({ where: { id } })
  }
}
