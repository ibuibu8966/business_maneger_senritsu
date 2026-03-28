import { prisma } from "@/lib/prisma"

const detailedInclude = {
  assignees: { include: { employee: { select: { id: true, name: true } } } },
  accounts: { select: { id: true, name: true } },
  partnerBusinesses: {
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
  contactBusinesses: {
    include: { contact: { select: { id: true, name: true } } },
  },
}

export class BusinessRepository {
  static async findMany() {
    return prisma.business.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    })
  }

  static async findManyDetailed() {
    return prisma.business.findMany({
      where: { isActive: true },
      include: detailedInclude,
      orderBy: { createdAt: "asc" },
    })
  }

  static async findById(id: string) {
    return prisma.business.findUnique({
      where: { id },
      include: detailedInclude,
    })
  }

  static async create(data: any) {
    return prisma.business.create({ data })
  }

  static async update(id: string, data: any) {
    return prisma.business.update({ where: { id }, data })
  }
}
