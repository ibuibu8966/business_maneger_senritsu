import { ProjectRepository } from "@/server/repositories/project.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"

export class DeleteProject {
  static async execute(id: string) {
    const result = await ProjectRepository.delete(id)

    try {
      await AuditLogRepository.create({
        action: "DELETE",
        entityType: "Project",
        entityId: id,
        entityName: (result as { name?: string })?.name ?? id,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
