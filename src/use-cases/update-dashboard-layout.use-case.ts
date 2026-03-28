import { DashboardLayoutRepository } from "@/repositories/dashboard-layout.repository"

export class UpdateDashboardLayout {
  static async execute(userId: string, layout: Record<string, unknown>[]) {
    const record = await DashboardLayoutRepository.upsert(userId, layout)
    return {
      id: record.id,
      userId: record.userId,
      layout: record.layout as unknown[],
    }
  }
}
