import { DashboardLayoutRepository } from "@/server/repositories/dashboard-layout.repository"

const DEFAULT_LAYOUT = [
  { cardType: "task", id: "card-task", sortOrder: 0 },
  { cardType: "issue", id: "card-issue", sortOrder: 1 },
  { cardType: "schedule", id: "card-schedule", sortOrder: 2 },
  { cardType: "balance", id: "card-balance", sortOrder: 3 },
  { cardType: "audit", id: "card-audit", sortOrder: 4 },
]

export class GetDashboardLayout {
  static async execute(userId: string) {
    const record = await DashboardLayoutRepository.findByUserId(userId)
    if (!record) {
      return {
        id: "",
        userId,
        layout: DEFAULT_LAYOUT,
      }
    }
    return {
      id: record.id,
      userId: record.userId,
      layout: record.layout as unknown[],
    }
  }
}
