import type { Prisma } from "@/generated/prisma/client"
import { BALANCE_DELTA } from "@/lib/balance-delta"

type Tx = Prisma.TransactionClient

export async function recomputeBalanceAfter(tx: Tx, accountId: string): Promise<void> {
  const rows = await tx.accountTransaction.findMany({
    where: { accountId },
    select: {
      id: true,
      type: true,
      amount: true,
      direction: true,
      isArchived: true,
      balanceAfter: true,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  })

  let running = 0
  for (const r of rows) {
    if (!r.isArchived) {
      let delta = 0
      if (r.type === "TRANSFER") {
        if (r.direction === "in") delta = r.amount
        else if (r.direction === "out") delta = -r.amount
      } else {
        delta = (BALANCE_DELTA[r.type] ?? 0) * r.amount
      }
      running += delta
    }
    if (r.balanceAfter !== running) {
      await tx.accountTransaction.update({
        where: { id: r.id },
        data: { balanceAfter: running },
      })
    }
  }
}
