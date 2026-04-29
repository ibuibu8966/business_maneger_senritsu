/**
 * 全口座に初期残高（INITIAL）レコードを一括作成するスクリプト。
 *
 * 計算式：
 *   初期残高 = accounts.balance − アクティブ取引（INITIAL以外）の合計動き
 *
 * 注意：
 *   - 既にINITILがある口座はスキップ
 *   - accounts.balanceはそのまま（現在値が正解。INITIAL追加で再計算後もbalanceAfter最終値=accounts.balanceになる）
 *   - 差分が0の口座はINITIALレコードを作らない（無意味なため）
 *
 * 実行: npx tsx prisma/scripts/seed-initial-balances.ts
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
  console.log("=== 初期残高バックフィル開始 ===\n")

  const accounts = await prisma.account.findMany({
    select: { id: true, name: true, balance: true, createdAt: true },
  })
  console.log(`対象口座: ${accounts.length} 件\n`)

  let createdCount = 0
  let skippedExisting = 0
  let skippedZero = 0

  for (const acct of accounts) {
    // 既存INITIAL確認
    const existing = await prisma.accountTransaction.findFirst({
      where: { accountId: acct.id, type: "INITIAL" },
    })
    if (existing) {
      skippedExisting++
      console.log(`  [${acct.name}] 既にINITIALあり (¥${existing.amount}) → スキップ`)
      continue
    }

    // アクティブ取引(INITIAL以外)の合計動き
    const txs = await prisma.accountTransaction.findMany({
      where: { accountId: acct.id, isArchived: false, type: { not: "INITIAL" } },
      select: { type: true, amount: true, direction: true },
    })

    let activeNet = 0
    for (const t of txs) {
      if (t.type === "TRANSFER") {
        if (t.direction === "in") activeNet += t.amount
        else if (t.direction === "out") activeNet -= t.amount
      } else {
        activeNet += (BALANCE_DELTA[t.type] ?? 0) * t.amount
      }
    }

    const initialAmount = acct.balance - activeNet

    if (initialAmount === 0) {
      skippedZero++
      console.log(`  [${acct.name}] 差分0 → 作成不要`)
      continue
    }

    // INITIALレコード作成（accounts.balanceは触らない）
    // createdAtを1900-01-01に固定し、同じ日付の他取引より必ず先頭に来るようにする
    await prisma.accountTransaction.create({
      data: {
        accountId: acct.id,
        type: "INITIAL",
        amount: initialAmount,
        date: acct.createdAt,
        counterparty: "",
        memo: "口座開設時の初期残高（自動計算）",
        editedBy: "system",
        createdAt: new Date("1900-01-01T00:00:00Z"),
      },
    })

    // 全レコードのbalanceAfterを再計算
    const allRows = await prisma.accountTransaction.findMany({
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
    for (const r of allRows) {
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
      }
    }

    createdCount++
    const sign = initialAmount >= 0 ? "+" : ""
    console.log(`  [${acct.name}] 初期残高 ${sign}¥${initialAmount.toLocaleString()} 作成・balanceAfter再計算済`)
  }

  console.log(`\n=== バックフィル完了 ===`)
  console.log(`  作成: ${createdCount} 件`)
  console.log(`  既存スキップ: ${skippedExisting} 件`)
  console.log(`  差分0スキップ: ${skippedZero} 件`)
}

main()
  .catch((e) => {
    console.error("エラー:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
