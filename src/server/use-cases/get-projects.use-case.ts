import { ProjectRepository } from "@/server/repositories/project.repository"

const STATUS_MAP: Record<string, string> = { ACTIVE: "active", ON_HOLD: "on-hold", COMPLETED: "completed" }
const PRIORITY_MAP: Record<string, string> = { HIGHEST: "highest", HIGH: "high", MEDIUM: "medium", LOW: "low" }

function transformProject(p: any) {
  return {
    id: p.id,
    businessId: p.businessId,
    businessName: p.business?.name ?? null,
    parentId: p.parentId,
    name: p.name,
    purpose: p.purpose,
    deadline: p.deadline ? p.deadline.toISOString().split("T")[0] : null,
    revenue: p.revenue,
    expense: p.expense,
    status: STATUS_MAP[p.status] ?? "active",
    priority: PRIORITY_MAP[p.priority] ?? "medium",
    assigneeIds: (p.assignees ?? []).map((a: any) => a.employeeId),
    assignees: (p.assignees ?? []).map((a: any) => ({ id: a.employee.id, name: a.employee.name })),
    contractMemo: p.contractMemo,
    relatedPartners: (p.partnerProjects ?? []).map((pp: any) => ({
      id: pp.partner.id,
      name: pp.partner.name,
    })),
    relatedContacts: [
      ...(p.partnerProjects ?? []).flatMap((pp: any) =>
        pp.partner.partnerContacts.map((pc: any) => ({
          id: pc.contact.id,
          name: pc.contact.name,
          role: pc.role,
          source: "partner" as const,
        }))
      ),
      ...(p.contactProjects ?? []).map((cp: any) => ({
        id: cp.contact.id,
        name: cp.contact.name,
        role: cp.role,
        source: "direct" as const,
      })),
    ],
    attachments: (p.attachments as any[]) ?? [],
    accountNames: p.accountNames,
    partnerNames: p.partnerNames,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.toISOString(),
  }
}

export class GetProjects {
  static async execute(params?: { businessId?: string }) {
    const projects = await ProjectRepository.findMany(params)
    return projects.map(transformProject)
  }

  static async executeOne(id: string) {
    const p = await ProjectRepository.findById(id)
    if (!p) return null
    return transformProject(p)
  }
}
