import { prisma } from "@/lib/prisma"
import { calcBalance } from "@/server/use-cases/get-account-details.use-case"

/**
 * AccountBalanceSnapshot 日次バッチ（複式簿記版）
 *
 * 役割:
 *  1. 全アクティブ口座について、前日末の残高を AccountBalanceSnapshot に upsert
 *  2. Account.recalcRequiredFromDate がセットされている口座は、その日付以降の
 *     スナップショットを再生成 → フラグクリア
 *
 * 残高計算は get-account-details.use-case.ts の calcBalance(accountId, dayEnd) に統一。
 * バッチ生成時は dayEnd 指定で「その日終了時点」の残高を取得する。
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** 指定日のスナップショットを upsert */
async function upsertSnapshot(accountId: string, date: Date): Promise<void> {
  const balance = await calcBalance(accountId, date)
  await prisma.accountBalanceSnapshot.upsert({
    where: { accountId_date: { accountId, date } },
    update: { balance },
    create: { accountId, date, balance },
  })
}

/** 指定日付（含む）以降のスナップショットを再生成。終端は前日 */
async function regenerateSnapshotsFrom(accountId: string, fromDate: Date, toDate: Date): Promise<number> {
  let count = 0
  const cursor = new Date(fromDate)
  cursor.setUTCHours(0, 0, 0, 0)
  const end = new Date(toDate)
  end.setUTCHours(0, 0, 0, 0)
  while (cursor <= end) {
    await upsertSnapshot(accountId, new Date(cursor))
    cursor.setTime(cursor.getTime() + ONE_DAY_MS)
    count++
  }
  return count
}

export class GenerateBalanceSnapshots {
  static async execute(): Promise<{
    yesterday: string
    accountsProcessed: number
    snapshotsCreated: number
    accountsRecalculated: number
    snapshotsRegenerated: number
  }> {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const yesterday = new Date(today.getTime() - ONE_DAY_MS)

    // (1) 全アクティブ口座について、前日末のスナップショットを upsert
    const accounts = await prisma.account.findMany({
      where: { isArchived: false, isActive: true },
      select: { id: true, recalcRequiredFromDate: true },
    })

    let snapshotsCreated = 0
    for (const a of accounts) {
      await upsertSnapshot(a.id, yesterday)
      snapshotsCreated++
    }

    // (2) recalcRequiredFromDate がセットされている口座は、その日付以降のスナップを再生成
    const flagged = accounts.filter((a) => a.recalcRequiredFromDate !== null)
    let snapshotsRegenerated = 0
    for (const a of flagged) {
      if (!a.recalcRequiredFromDate) continue
      snapshotsRegenerated += await regenerateSnapshotsFrom(a.id, a.recalcRequiredFromDate, yesterday)
      await prisma.account.update({
        where: { id: a.id },
        data: { recalcRequiredFromDate: null },
      })
    }

    return {
      yesterday: yesterday.toISOString().split("T")[0],
      accountsProcessed: accounts.length,
      snapshotsCreated,
      accountsRecalculated: flagged.length,
      snapshotsRegenerated,
    }
  }
}
