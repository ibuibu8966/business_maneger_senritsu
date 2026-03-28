/**
 * データ移行スクリプト
 * 既存の TRANSFER / 貸借系取引に linkedTransferId / lendingId を設定する
 *
 * 実行: npx tsx prisma/scripts/migrate-transfer-ids.ts
 */

import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../src/generated/prisma/client"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=== データ移行スクリプト開始 ===\n")

  // ── 1. TRANSFER: linkedTransferId + direction を設定 ──
  console.log("--- 1. TRANSFER 振替ペアの移行 ---")

  const transfers = await prisma.accountTransaction.findMany({
    where: {
      type: "TRANSFER",
      linkedTransactionId: { not: null },
      linkedTransferId: null, // まだ移行されていないもの
    },
  })

  console.log(`  対象: ${transfers.length} 件`)

  for (const tx of transfers) {
    // linkedTransactionId が設定されている = 振替先レコード（入金側）
    // → direction: "in", linkedTransferId: linkedTransactionId（振替元のID）
    await prisma.accountTransaction.update({
      where: { id: tx.id },
      data: {
        linkedTransferId: tx.linkedTransactionId,
        direction: "in",
      },
    })

    // 振替元レコードにも linkedTransferId を設定
    // 振替元 = linkedTransactionId で参照されている側
    if (tx.linkedTransactionId) {
      await prisma.accountTransaction.update({
        where: { id: tx.linkedTransactionId },
        data: {
          linkedTransferId: tx.id,
          direction: "out",
        },
      })
    }
  }

  // linkedTransactionId が null の TRANSFER（振替元で相手側にだけ linkedTransactionId がある）
  // 上記ループで振替元も更新されるため、追加処理は不要

  console.log(`  完了: ${transfers.length} ペア更新\n`)

  // ── 2. 貸借系取引: lendingId を逆引き設定 ──
  console.log("--- 2. 貸借系取引の lendingId 移行 ---")

  const lendingTxTypes = ["LEND", "BORROW"] as const
  const lendingTxs = await prisma.accountTransaction.findMany({
    where: {
      type: { in: [...lendingTxTypes] },
      lendingId: null, // まだ移行されていないもの
      linkedTransactionId: { not: null }, // Lending ID が linkedTransactionId に入っている
    },
  })

  console.log(`  LEND/BORROW 対象: ${lendingTxs.length} 件`)

  let lendingUpdated = 0
  for (const tx of lendingTxs) {
    // linkedTransactionId が Lending の ID として使われている場合
    // Lending テーブルに該当 ID が存在するか確認
    if (tx.linkedTransactionId) {
      const lending = await prisma.lending.findUnique({
        where: { id: tx.linkedTransactionId },
      })
      if (lending) {
        await prisma.accountTransaction.update({
          where: { id: tx.id },
          data: { lendingId: tx.linkedTransactionId },
        })
        lendingUpdated++
      }
    }
  }
  console.log(`  完了: ${lendingUpdated} 件更新\n`)

  // ── 3. 返済系取引: lendingPaymentId を逆引き設定 ──
  console.log("--- 3. 返済系取引の lendingPaymentId 移行 ---")

  const repaymentTypes = ["REPAYMENT_RECEIVE", "REPAYMENT_PAY"] as const
  const repaymentTxs = await prisma.accountTransaction.findMany({
    where: {
      type: { in: [...repaymentTypes] },
      lendingPaymentId: null,
      editedBy: "system", // 自動計上されたもの
    },
    orderBy: { date: "asc" },
  })

  console.log(`  REPAYMENT 対象: ${repaymentTxs.length} 件`)

  let repaymentUpdated = 0
  for (const tx of repaymentTxs) {
    // 同じ口座・同じ日付・同じ金額の LendingPayment を探す
    // まず口座に紐づく Lending を取得
    const lendings = await prisma.lending.findMany({
      where: {
        accountId: tx.accountId,
        counterparty: tx.counterparty,
      },
      include: {
        payments: {
          where: {
            amount: tx.amount,
            date: tx.date,
          },
        },
      },
    })

    for (const lending of lendings) {
      if (lending.payments.length > 0) {
        // 最初にマッチした payment を使う
        await prisma.accountTransaction.update({
          where: { id: tx.id },
          data: { lendingPaymentId: lending.payments[0].id },
        })
        repaymentUpdated++
        break
      }
    }
  }
  console.log(`  完了: ${repaymentUpdated} 件更新\n`)

  console.log("=== データ移行スクリプト完了 ===")
}

main()
  .catch((e) => {
    console.error("エラー:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
