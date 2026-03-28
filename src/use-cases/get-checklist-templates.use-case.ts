import { ChecklistTemplateRepository } from "@/repositories/checklist-template.repository"

export class GetChecklistTemplates {
  static async execute(businessId?: string) {
    const templates = await ChecklistTemplateRepository.findMany(businessId)
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      businessId: t.businessId,
      items: t.items.map((i) => ({ id: i.id, title: i.title, sortOrder: i.sortOrder })),
      createdAt: t.createdAt.toISOString(),
    }))
  }
}
