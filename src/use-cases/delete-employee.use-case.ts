import { EmployeeRepository } from "@/repositories/employee.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"

export class DeleteEmployee {
  static async execute(id: string): Promise<void> {
    await EmployeeRepository.delete(id)

    try {
      await AuditLogRepository.create({
        action: "DELETE",
        entityType: "Employee",
        entityId: id,
        entityName: id,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }
  }
}
