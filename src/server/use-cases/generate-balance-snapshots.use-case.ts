import { prisma } from "@/lib/prisma"
import { calcBalance } from "@/server/use-cases/get-account-details.use-case"

/**
 * AccountBalanceSnapshot 日次バッチ（複式簿記版・全件累積方式）
 *
 * 役割:
 *  全アクティブ口座について、過去 RECALC_DAYS 日分のスナップショットを毎日
 *  全active取引から累積で再計算する。
 *
 * 設計方針:
 *  recalcRequiredFromDate という脆弱なフラグに依存しない。
 *  過去日付の取引追加・修正・削除があっても、翌日のバッチで自動的に
 *  正しい値に再計算される（最大 RECALC_DAYS 日後ろの日付なら反映される）。
 *
 *  scaling: 取引数が数万件超えたら、口座 × 日数のループを groupBy で
 *  まとめる最適化を検討する。
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const RECALC_DAYS = 30 // 毎日 過去30日分のスナップショットを再生成

/** 指定日のスナップショットを upsert（全件累積で計算） */
async function upsertSnapshot(accountId: string, date: Date): Promise<void> {
  const balance = await calcBalance(accountId, date)
  await prisma.accountBalanceSnapshot.upsert({
    where: { accountId_date: { accountId, date } },
    update: { balance },
    create: { accountId, date, balance },
  })
}

export class GenerateBalanceSnapshots {
  static async execute(): Promise<{
    yesterday: string
    accountsProcessed: number
    snapshotsCreated: number
    daysRecalculated: number
  }> {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const yesterday = new Date(today.getTime() - ONE_DAY_MS)

    // 全アクティブ口座を取得
    const accounts = await prisma.account.findMany({
      where: { isArchived: false, isActive: true },
      select: { id: true },
    })

    // 各口座について、過去 RECALC_DAYS 日分のスナップショットを再生成
    let snapshotsCreated = 0
    for (const a of accounts) {
      for (let i = 0; i < RECALC_DAYS; i++) {
        const targetDate = new Date(yesterday.getTime() - i * ONE_DAY_MS)
        await upsertSnapshot(a.id, targetDate)
        snapshotsCreated++
      }
    }

    return {
      yesterday: yesterday.toISOString().split("T")[0],
      accountsProcessed: accounts.length,
      snapshotsCreated,
      daysRecalculated: RECALC_DAYS,
    }
  }
}
