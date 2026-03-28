import { AuditLogRepository } from "@/repositories/audit-log.repository"

export class GetAuditLogs {
  static async execute(filters?: {
    entityType?: string
    userId?: string
    limit?: number
  }) {
    const logs = await AuditLogRepository.findMany(filters)
    return logs.map((log: any) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      changes: log.changes as Record<string, { old: unknown; new: unknown }>,
      userId: log.userId,
      userName: log.userName,
      createdAt: log.createdAt.toISOString(),
    }))
  }
}
