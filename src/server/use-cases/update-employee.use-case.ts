import { EmployeeRepository } from "@/server/repositories/employee.repository"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import type { EmployeeDTO } from "@/types/dto"
import type { EmployeeRole } from "@/generated/prisma/client"
import bcrypt from "bcryptjs"

export class UpdateEmployee {
  static async execute(
    id: string,
    data: {
      name?: string
      color?: string
      email?: string | null
      password?: string
      role?: string
      lineUserId?: string | null
      googleCalId?: string | null
      coreTimeStart?: string | null
      coreTimeEnd?: string | null
      isActive?: boolean
    }
  ): Promise<EmployeeDTO> {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.color !== undefined) updateData.color = data.color
    if (data.email !== undefined) updateData.email = data.email
    if (data.role !== undefined) updateData.role = data.role.toUpperCase() as EmployeeRole
    if (data.lineUserId !== undefined) updateData.lineUserId = data.lineUserId
    if (data.googleCalId !== undefined) updateData.googleCalId = data.googleCalId
    if (data.coreTimeStart !== undefined) updateData.coreTimeStart = data.coreTimeStart
    if (data.coreTimeEnd !== undefined) updateData.coreTimeEnd = data.coreTimeEnd
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12)

    const row = await EmployeeRepository.update(id, updateData as Parameters<typeof EmployeeRepository.update>[1])

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
        action: "UPDATE",
        entityType: "Employee",
        entityId: id,
        entityName: row.name,
        changes: {},
        userId: "system",
        userName: "system",
      })
    } catch { /* audit log failure should not break main operation */ }

    return result
  }
}
