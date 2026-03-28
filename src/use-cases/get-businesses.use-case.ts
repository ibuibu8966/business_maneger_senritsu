import { BusinessRepository } from "@/repositories/business.repository"
import type { BusinessDTO } from "@/types/dto"

export class GetBusinesses {
  static async execute(): Promise<BusinessDTO[]> {
    return BusinessRepository.findMany()
  }
}
