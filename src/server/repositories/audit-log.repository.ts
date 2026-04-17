import { prisma } from "@/lib/prisma"

export class AuditLogRepository {
  static async create(data: {
    action: string
    entityType: string
    entityId: string
    entityName: string
    changes: Record<string, { old: unknown; new: unknown }>
    userId: string
    userName: string
  }) {
    return prisma.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        changes: data.changes as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
        userId: data.userId,
        userName: data.userName,
      },
    })
  }

  static async findMany(filters?: {
    entityType?: string
    userId?: string
    limit?: number
  }) {
    return prisma.auditLog.findMany({
      where: {
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.userId && { userId: filters.userId }),
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 50,
    })
  }
}
