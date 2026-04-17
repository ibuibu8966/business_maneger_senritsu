import { BusinessMemoRepository } from "@/server/repositories/business-memo.repository"

export class DeleteBusinessMemo {
  static async execute(id: string) {
    return BusinessMemoRepository.delete(id)
  }
}
