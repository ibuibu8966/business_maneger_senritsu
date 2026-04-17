import { prisma } from "@/lib/prisma"

export class ProjectRepository {
  static async findMany(params?: { businessId?: string }) {
    return prisma.project.findMany({
      where: {
        ...(params?.businessId && { businessId: params.businessId }),
      },
      include: {
        assignees: { include: { employee: { select: { id: true, name: true } } } },
        business: { select: { id: true, name: true } },
        partnerProjects: {
          include: {
            partner: {
              include: {
                partnerContacts: {
                  include: { contact: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
        contactProjects: {
          include: { contact: { select: { id: true, name: true } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    })
  }

  static async findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        assignees: { include: { employee: { select: { id: true, name: true } } } },
        business: { select: { id: true, name: true } },
      },
    })
  }

  static async create(data: any) {
    return prisma.project.create({ data })
  }

  static async update(id: string, data: any) {
    return prisma.project.update({ where: { id }, data })
  }

  static async delete(id: string) {
    return prisma.project.delete({ where: { id } })
  }

  static async updateManyByBusinessId(businessId: string, data: Record<string, unknown>) {
    return prisma.project.updateMany({ where: { businessId }, data })
  }

  static async updateManyByIds(ids: string[], data: Record<string, unknown>) {
    return prisma.project.updateMany({ where: { id: { in: ids } }, data })
  }

  static async findDescendantIds(parentId: string): Promise<string[]> {
    const result = await prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id FROM projects WHERE "parentId" = ${parentId}
        UNION ALL
        SELECT p.id FROM projects p INNER JOIN descendants d ON p."parentId" = d.id
      )
      SELECT id FROM descendants
    `
    return result.map((r) => r.id)
  }
}
