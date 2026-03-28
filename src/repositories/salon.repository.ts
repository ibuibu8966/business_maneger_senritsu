import { prisma } from "@/lib/prisma"

export class SalonRepository {
  static async findMany() {
    return prisma.salon.findMany({
      where: { isActive: true },
      include: { courses: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    })
  }

  static async create(data: { name: string }) {
    return prisma.salon.create({ data, include: { courses: true } })
  }

  static async update(id: string, data: { name?: string; isActive?: boolean }) {
    return prisma.salon.update({ where: { id }, data, include: { courses: true } })
  }

  static async createCourse(data: { salonId: string; name: string; monthlyFee?: number; discordRoleName?: string }) {
    return prisma.salonCourse.create({
      data: { salonId: data.salonId, name: data.name, monthlyFee: data.monthlyFee ?? 0, discordRoleName: data.discordRoleName ?? "" },
      include: { salon: true },
    })
  }

  static async updateCourse(id: string, data: { name?: string; monthlyFee?: number; discordRoleName?: string; isActive?: boolean }) {
    return prisma.salonCourse.update({ where: { id }, data, include: { salon: true } })
  }
}
