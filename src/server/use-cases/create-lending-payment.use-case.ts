import { prisma } from "@/lib/prisma"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { AccountRepository } from "@/server/repositories/account.repository"
import type { LendingPaymentDTO } from "@/types/dto"

/**
 * 返済登録（複式簿記版）
 *
 * LendingPaymentテーブルは廃止された。返済はAccountTransaction(type=REPAYMENT, lendingId)
 * として1レコード記録する。
 *
 * - LEND側Lending（自分が貸した）の返済: from=相手口座 → to=自分口座
 * - BORROW側Lending（自分が借りた）の返済: from=自分口座 → to=相手口座
 * - 社内貸借ペアの場合、Lending は2件あるが返済取引は1件のみ作成（重複廃止）
 */
export class CreateLendingPayment {
  static async execute(data: {
    lendingId: string
    amount: number
    date: string
    memo?: string
    editedBy?: string
  }): Promise<LendingPaymentDTO> {
    const externalId = await AccountRepository.findExternalAccountId()

    return await prisma.$transaction(async (tx) => {
      const lending = await tx.lending.findUniqueOrThrow({
        where: { id: data.lendingId },
      })

      // 相手口座（社内貸借なら counterpartyAccountId、社外なら 外部口座）
      const counterpartyAccount = lending.counterpartyAccountId ?? externalId

      const fromId = lending.type === "LEND" ? counterpartyAccount : lending.accountId
      const toId = lending.type === "LEND" ? lending.accountId : counterpartyAccount

      // 返済取引を1件作成（社内貸借ペアでも1件のみ）
      const created = await tx.accountTransaction.create({
        data: {
          type: "REPAYMENT",
          amount: data.amount,
          date: new Date(data.date),
          fromAccountId: fromId,
          toAccountId: toId,
          counterparty: lending.counterparty,
          lendingId: data.lendingId,
          memo: data.memo ?? "",
          editedBy: data.editedBy ?? "system",
        },
      })

      const result: LendingPaymentDTO = {
        id: created.id,
        lendingId: data.lendingId,
        amount: created.amount,
        date: created.date.toISOString().split("T")[0],
        memo: created.memo,
        createdAt: created.createdAt.toISOString(),
      }

      try {
        await AuditLogRepository.create({
          action: "CREATE",
          entityType: "AccountTransaction",
          entityId: created.id,
          entityName: `返済 ¥${created.amount}`,
          changes: {},
          userId: "system",
          userName: "system",
        })
      } catch { /* audit log failure should not break main operation */ }

      return result
    })
  }
}
