/**
 * project-tree 用ヘルパー関数
 */
import type { BusinessDetailDTO, ProjectDTO } from "@/types/dto"
import type { Business, ProjectNode } from "../mock-data"

/** 数値を万単位でコンパクト表示 */
export function formatCompact(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(0) + "万"
  return n.toLocaleString()
}

/** BusinessDetailDTO → Business */
export function toBusiness(dto: BusinessDetailDTO): Business {
  return {
    id: dto.id,
    name: dto.name,
    purpose: dto.purpose,
    revenue: dto.revenue,
    expense: dto.expense,
    status: dto.status,
    priority: dto.priority,
    assigneeIds: dto.assigneeIds,
    assignees: dto.assignees,
    accountNames: dto.accountNames,
    partnerNames: dto.partnerNames,
    contractMemo: dto.contractMemo,
    relatedPartners: dto.relatedPartners ?? [],
    relatedContacts: dto.relatedContacts,
    attachments: dto.attachments.map((a) => ({
      ...a,
      type: a.type as "file" | "url",
    })),
  }
}

/** ProjectDTO → ProjectNode */
export function toProjectNode(dto: ProjectDTO): ProjectNode {
  return {
    id: dto.id,
    businessId: dto.businessId,
    parentId: dto.parentId,
    name: dto.name,
    purpose: dto.purpose,
    deadline: dto.deadline,
    revenue: dto.revenue,
    expense: dto.expense,
    status: dto.status,
    priority: dto.priority,
    assigneeIds: dto.assigneeIds,
    assignees: dto.assignees,
    accountNames: dto.accountNames,
    partnerNames: dto.partnerNames,
    contractMemo: dto.contractMemo,
    relatedPartners: dto.relatedPartners ?? [],
    relatedContacts: dto.relatedContacts,
    attachments: dto.attachments.map((a) => ({
      ...a,
      type: a.type as "file" | "url",
    })),
  }
}
