import { EmployeeRepository } from "@/repositories/employee.repository"
import { AuditLogRepository } from "@/repositories/audit-log.repository"
import type { EmployeeDTO } from "@/types/dto"
import type { EmployeeRole } from "@/generated/prisma/client"
import bcrypt from "bcryptjs"

export class CreateEmployee {
  static async execute(data: {
    name: string
    color: string
    email?: string
    password?: string
    role?: string
    lineUserId?: string
    googleCalId?: string
    coreTimeStart?: string
    coreTimeEnd?: string
  }): Promise<EmployeeDTO> {
    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : undefined
    const role = (data.role?.toUpperCase() ?? "EMPLOYEE") as EmployeeRole

    const row = await EmployeeRepository.create({
      name: data.name,
      color: data.color,
      email: data.email,
      passwordHash,
      role,
      lineUserId: data.lineUserId,
      googleCalId: data.googleCalId,
      coreTimeStart: data.coreTimeStart,
      coreTimeEnd: data.coreTimeEnd,
    })

    const result: EmployeeDTO = {
      id: row.id,
      name: row.name,
      color: row.color,
      email: row.email,
      role: row.role.toLowerCase() as EmployeeDTO["role"],
      lineUserId: row.lineUserId,
      googleCalId: row.googleCalId,
      coreTimeStart: row.coreTimeStart,
      coreTimeEnd: row.coreTimeEnd,
      isActive: row.isActive,
    }

    try {
      await AuditLogRepository.create({
        action: "CREATE",
        entityType: "Employee",
        entityId: row.id,
        entityName: row.name,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
