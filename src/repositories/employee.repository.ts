import { prisma } from "@/lib/prisma"
import type { EmployeeRole } from "@/generated/prisma/client"

export class EmployeeRepository {
  static async findMany(params?: { isActive?: boolean }) {
    return prisma.employee.findMany({
      where: {
        ...(params?.isActive !== undefined && { isActive: params.isActive }),
      },
      orderBy: { name: "asc" },
    })
  }

  static async findById(id: string) {
    return prisma.employee.findUnique({ where: { id } })
  }

  static async findByEmail(email: string) {
    return prisma.employee.findUnique({ where: { email } })
  }

  static async create(data: {
    name: string
    color: string
    email?: string
    passwordHash?: string
    role?: EmployeeRole
    lineUserId?: string
    googleCalId?: string
    coreTimeStart?: string
    coreTimeEnd?: string
  }) {
    return prisma.employee.create({ data })
  }

  static async update(
    id: string,
    data: {
      name?: string
      color?: string
      email?: string | null
      passwordHash?: string
      role?: EmployeeRole
      lineUserId?: string | null
      googleCalId?: string | null
      coreTimeStart?: string | null
      coreTimeEnd?: string | null
      isActive?: boolean
    }
  ) {
    return prisma.employee.update({ where: { id }, data })
  }

  static async delete(id: string) {
    return prisma.employee.delete({ where: { id } })
  }
}
