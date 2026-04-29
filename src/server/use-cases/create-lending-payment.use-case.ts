import { prisma } from "@/lib/prisma"
import { AuditLogRepository } from "@/server/repositories/audit-log.repository"
import { recomputeBalanceAfter } from "@/lib/recompute-balance-after"
import type { LendingPaymentDTO } from "@/types/dto"
import type { AccountTransactionType } from "@/generated/prisma/client"

export class CreateLendingPayment {
  static async execute(data: {
    lendingId: string
    amount: number
    date: string
    memo?: string
  }): Promise<LendingPaymentDTO> {
    return await prisma.$transaction(async (tx) => {
      // 1. 返済を記録
      const p = await tx.lendingPayment.create({
        data: {
          lendingId: data.lendingId,
          amount: data.amount,
          date: new Date(data.date),
          memo: data.memo ?? "",
        },
      })

      // 2. 貸借の未返済額を減らす（完済なら自動ステータス変更）
      const lending = await tx.lending.findUnique({
        where: { id: data.lendingId },
      })
      if (lending) {
        const newOutstanding = lending.outstanding - data.amount
        await tx.lending.update({
          where: { id: data.lendingId },
          data: {
            outstanding: Math.max(0, newOutstanding),
            ...(newOutstanding <= 0 ? { status: "COMPLETED" as const } : {}),
          },
        })

        // 3. AccountTransaction 自動計上（返済 → 元がLENDなら返済受取、BORROWなら返済支払）+ 残高更新
        const repaymentType: AccountTransactionType =
          lending.type === "LEND" ? "REPAYMENT_RECEIVE" : "REPAYMENT_PAY"
        await tx.accountTransaction.create({
          data: {
            accountId: lending.accountId,
            type: repaymentType,
            amount: data.amount,
            date: new Date(data.date),
            counterparty: lending.counterparty,
            lendingPaymentId: p.id,
            memo: `返済自動計上: ${data.memo ?? ""}`.trim(),
            editedBy: "system",
          },
        })
        // REPAYMENT_RECEIVE = 返済受取 → 残高増加(+), REPAYMENT_PAY = 返済支払 → 残高減少(-)
        const mainDelta = repaymentType === "REPAYMENT_RECEIVE" ? data.amount : -data.amount
        await tx.account.update({
          where: { id: lending.accountId },
          data: { balance: { increment: mainDelta } },
        })

        // 4. リンク先ペアにも同じ返済を同期
        if (lending.linkedLendingId) {
          const pairLending = await tx.lending.findUnique({
            where: { id: lending.linkedLendingId },
          })

          const pairPayment = await tx.lendingPayment.create({
            data: {
              lendingId: lending.linkedLendingId,
              amount: data.amount,
              date: new Date(data.date),
              memo: data.memo ?? "",
            },
          })

          if (pairLending) {
            const pairNewOutstanding = pairLending.outstanding - data.amount
            await tx.lending.update({
              where: { id: lending.linkedLendingId },
              data: {
                outstanding: Math.max(0, pairNewOutstanding),
                ...(pairNewOutstanding <= 0 ? { status: "COMPLETED" as const } : {}),
              },
            })

            // 5. 相手口座にも AccountTransaction 自動計上（逆の返済種別）+ 残高更新
            const pairRepaymentType: AccountTransactionType =
              pairLending.type === "LEND" ? "REPAYMENT_RECEIVE" : "REPAYMENT_PAY"
            await tx.accountTransaction.create({
              data: {
                accountId: pairLending.accountId,
                type: pairRepaymentType,
                amount: data.amount,
                date: new Date(data.date),
                counterparty: pairLending.counterparty,
                lendingPaymentId: pairPayment.id,
                memo: `返済自動計上: ${data.memo ?? ""}`.trim(),
                editedBy: "system",
              },
            })
            const pairDelta = pairRepaymentType === "REPAYMENT_RECEIVE" ? data.amount : -data.amount
            await tx.account.update({
              where: { id: pairLending.accountId },
              data: { balance: { increment: pairDelta } },
            })
          }
        }

        // 影響を受けた口座の時点残高を再計算
        await recomputeBalanceAfter(tx, lending.accountId)
        if (lending.linkedLendingId) {
          const pair = await tx.lending.findUnique({
            where: { id: lending.linkedLendingId },
            select: { accountId: true },
          })
          if (pair) await recomputeBalanceAfter(tx, pair.accountId)
        }
      }

      const result: LendingPaymentDTO = {
        id: p.id,
        lendingId: p.lendingId,
        amount: p.amount,
        date: p.date.toISOString().split("T")[0],
        memo: p.memo,
        createdAt: p.createdAt.toISOString(),
      }

      try {
        await AuditLogRepository.create({
          action: "CREATE",
          entityType: "LendingPayment",
          entityId: p.id,
          entityName: `返済 ¥${p.amount}`,
          changes: {},
          userId: "system",
          userName: "system",
        })
      } catch { /* audit log failure should not break main operation */ }

      return result
    })
  }
}
