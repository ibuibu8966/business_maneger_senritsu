/**
 * バックフィルスクリプト：全AccountTransactionのbalanceAfterを再計算
 *
 * 実行: npx tsx prisma/scripts/backfill-balance-after.ts
 */

import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../src/generated/prisma/client"
import { BALANCE_DELTA } from "../../src/lib/balance-delta"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=== balanceAfter バックフィル開始 ===\n")

  const accounts = await prisma.account.findMany({ select: { id: true, name: true } })
  console.log(`対象口座: ${accounts.length} 件\n`)

  let totalUpdated = 0

  for (const acct of accounts) {
    const rows = await prisma.accountTransaction.findMany({
      where: { accountId: acct.id },
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
    let updated = 0
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
        await prisma.accountTransaction.update({
          where: { id: r.id },
          data: { balanceAfter: running },
        })
        updated++
      }
    }

    totalUpdated += updated
    console.log(`  [${acct.name}] ${rows.length}件 / 更新${updated}件`)
  }

  console.log(`\n=== バックフィル完了：合計 ${totalUpdated} 件更新 ===`)
}

main()
  .catch((e) => {
    console.error("エラー:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
