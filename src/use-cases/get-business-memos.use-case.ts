import { BusinessMemoRepository } from "@/repositories/business-memo.repository"

export class GetBusinessMemos {
  static async execute(params: { businessId?: string; projectId?: string }) {
    if (params.businessId) {
      return BusinessMemoRepository.findByBusinessId(params.businessId)
    }
    if (params.projectId) {
      return BusinessMemoRepository.findByProjectId(params.projectId)
    }
    return []
  }
}
