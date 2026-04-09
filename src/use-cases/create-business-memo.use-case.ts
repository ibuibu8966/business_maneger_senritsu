import { BusinessMemoRepository } from "@/repositories/business-memo.repository"

export class CreateBusinessMemo {
  static async execute(data: {
    businessId?: string
    projectId?: string
    date: string
    content: string
    author?: string
  }) {
    return BusinessMemoRepository.create({
      businessId: data.businessId,
      projectId: data.projectId,
      date: new Date(data.date),
      content: data.content,
      author: data.author ?? "",
    })
  }
}
