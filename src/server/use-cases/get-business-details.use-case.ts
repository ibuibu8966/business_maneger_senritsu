import { BusinessRepository } from "@/server/repositories/business.repository"

const STATUS_MAP: Record<string, string> = { ACTIVE: "active", ON_HOLD: "on-hold", COMPLETED: "completed" }
const PRIORITY_MAP: Record<string, string> = { HIGHEST: "highest", HIGH: "high", MEDIUM: "medium", LOW: "low" }

function transformBusiness(b: any) {
  return {
    id: b.id,
    name: b.name,
    purpose: b.purpose,
    revenue: b.revenue,
    expense: b.expense,
    status: STATUS_MAP[b.status] ?? "active",
    priority: PRIORITY_MAP[b.priority] ?? "medium",
    assigneeIds: (b.assignees ?? []).map((a: any) => a.employeeId),
    assignees: (b.assignees ?? []).map((a: any) => ({ id: a.employee.id, name: a.employee.name })),
    accountNames: b.accounts.map((a: any) => a.name),
    partnerNames: b.partnerBusinesses.map((pb: any) => pb.partner.name),
    contractMemo: b.contractMemo,
    relatedPartners: b.partnerBusinesses.map((pb: any) => ({
      id: pb.partner.id,
      name: pb.partner.name,
    })),
    relatedContacts: [
      ...b.partnerBusinesses.flatMap((pb: any) =>
        pb.partner.partnerContacts.map((pc: any) => ({
          id: pc.contact.id,
          name: pc.contact.name,
          role: pc.role,
          source: "partner" as const,
        }))
      ),
      ...(b.contactBusinesses ?? []).map((cb: any) => ({
        id: cb.contact.id,
        name: cb.contact.name,
        role: cb.role,
        source: "direct" as const,
      })),
    ],
    attachments: (b.attachments as any[]) ?? [],
    isActive: b.isActive,
  }
}

export class GetBusinessDetails {
  static async execute() {
    const businesses = await BusinessRepository.findManyDetailed()
    return businesses.map(transformBusiness)
  }

  static async executeOne(id: string) {
    const b = await BusinessRepository.findById(id)
    if (!b) return null
    return transformBusiness(b)
  }
}
