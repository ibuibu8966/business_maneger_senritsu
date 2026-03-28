import { prisma } from "@/lib/prisma"

export class DashboardLayoutRepository {
  static async findByUserId(userId: string) {
    return prisma.dashboardLayout.findUnique({
      where: { userId },
    })
  }

  static async upsert(userId: string, layout: Record<string, unknown>[]) {
    return prisma.dashboardLayout.upsert({
      where: { userId },
      update: { layout: layout as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue },
      create: { userId, layout: layout as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue },
    })
  }
}
