import { AuditLogRepository } from "@/server/repositories/audit-log.repository"

export class CreateAuditLog {
  static async execute(data: {
    action: string
    entityType: string
    entityId: string
    entityName: string
    changes: Record<string, { old: unknown; new: unknown }>
    userId: string
    userName: string
  }) {
    const log = await AuditLogRepository.create(data)
    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      changes: log.changes as Record<string, { old: unknown; new: unknown }>,
      userId: log.userId,
      userName: log.userName,
      createdAt: log.createdAt.toISOString(),
    }
  }
}
