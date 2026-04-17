import { AccountRepository } from "@/server/repositories/account.repository"
import type { AccountDTO } from "@/types/dto"

export class GetAccounts {
  static async execute(): Promise<AccountDTO[]> {
    return AccountRepository.findForAccounting()
  }
}
