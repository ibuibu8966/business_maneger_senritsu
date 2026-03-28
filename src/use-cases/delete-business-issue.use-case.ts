import { BusinessIssueRepository } from "@/repositories/business-issue.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

export class DeleteBusinessIssue {
  static async execute(id: string) {
    const result = await BusinessIssueRepository.delete(id)

    try {
      await AuditLogRepository.create({
        action: "DELETE",
        entityType: "BusinessIssue",
        entityId: id,
        entityName: (result as { title?: string })?.title ?? id,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
