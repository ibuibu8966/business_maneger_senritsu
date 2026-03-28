import { EmployeeRepository } from "@/repositories/employee.repository"
import type { EmployeeDTO } from "@/types/dto"

export class GetEmployees {
  static async execute(params?: { isActive?: boolean }): Promise<EmployeeDTO[]> {
    const rows = await EmployeeRepository.findMany(params)

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      email: r.email,
      role: r.role.toLowerCase() as EmployeeDTO["role"],
      lineUserId: r.lineUserId,
      googleCalId: r.googleCalId,
      coreTimeStart: r.coreTimeStart,
      coreTimeEnd: r.coreTimeEnd,
      isActive: r.isActive,
    }))
  }
}
