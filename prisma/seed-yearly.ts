// @ts-nocheck
import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client.js"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
// @ts-expect-error — @types/pg version mismatch between root and @prisma/adapter-pg
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// 金額にランダムな揺れを加える（±20%）
function jitter(base: number, range = 0.2): number {
  const factor = 1 + (Math.random() * range * 2 - range)
  return Math.round(base * factor / 1000) * 1000
}

// ランダムな日を返す（1〜28）
function randDay(): number {
  return Math.floor(Math.random() * 28) + 1
}

// 月ごとの取引テンプレート（事業×カテゴリ別）
const monthlyTemplates = [
  // ===== 収入 =====
  // アビトラ: サヤ取り利益 + バリュー投資利益
  { businessId: "b1", accountId: "a1", categoryId: "c2", type: "INCOME" as const, baseAmount: 280000, comment: "サヤ取り確定利益", createdBy: "野田" },
  { businessId: "b1", accountId: "a1", categoryId: "c2", type: "INCOME" as const, baseAmount: 350000, comment: "バリュー投資 利益確定", createdBy: "野田" },
  // スーパーサロン: 会費
  { businessId: "b2", accountId: "a2", categoryId: "c1", type: "INCOME" as const, baseAmount: 450000, comment: "サロン会費", createdBy: "井上", fixedDay: 1 },
  // モバイル事業: SIM販売 + 決済代行
  { businessId: "b3", accountId: "a3", categoryId: "c5", type: "INCOME" as const, baseAmount: 180000, comment: "SIM販売", createdBy: "野田" },
  { businessId: "b3", accountId: "a3", categoryId: "c4", type: "INCOME" as const, baseAmount: 95000, comment: "決済代行手数料 アバリス+エムダ", createdBy: "井上", fixedDay: 15 },
  // せどり: ポケカ売上 + 楽天せどり
  { businessId: "b4", accountId: "a4", categoryId: "c6", type: "INCOME" as const, baseAmount: 620000, comment: "ポケカ抽選当選分 売却", createdBy: "野田" },
  { businessId: "b4", accountId: "a4", categoryId: "c7", type: "INCOME" as const, baseAmount: 230000, comment: "楽天せどり買取売上", createdBy: "野田" },
  // コールセンター: その他収入（たまに）
  { businessId: "b5", accountId: "a5", categoryId: "c8", type: "INCOME" as const, baseAmount: 50000, comment: "コールセンター追加受注", createdBy: "井上", probability: 0.4 },
  // 受託運用: 手数料
  { businessId: "b6", accountId: "a6", categoryId: "c3", type: "INCOME" as const, baseAmount: 150000, comment: "受託運用手数料", createdBy: "井上", fixedDay: 15 },

  // ===== 支出 =====
  // アビトラ: ナスノさん業務委託
  { businessId: "b1", accountId: "a1", categoryId: "c10", type: "EXPENSE" as const, costType: "VARIABLE" as const, baseAmount: 80000, comment: "ナスノさん 業務委託費", createdBy: "野田", fixedDay: 15 },
  // スーパーサロン: 家賃 + サブスク + 外注（あーさん）
  { businessId: "b2", accountId: "a2", categoryId: "c14", type: "EXPENSE" as const, costType: "FIXED" as const, baseAmount: 150000, comment: "事務所家賃", createdBy: "野田", fixedDay: 25 },
  { businessId: "b2", accountId: "a2", categoryId: "c15", type: "EXPENSE" as const, costType: "FIXED" as const, baseAmount: 35000, comment: "各種SaaSサブスク", createdBy: "井上", fixedDay: 1 },
  { businessId: "b2", accountId: "a2", categoryId: "c10", type: "EXPENSE" as const, costType: "VARIABLE" as const, baseAmount: 55000, comment: "あーさん アビトラ説明サポート", createdBy: "野田" },
  { businessId: "b2", accountId: "a2", categoryId: "c16", type: "EXPENSE" as const, costType: "FIXED" as const, baseAmount: 200000, comment: "野田 給与", createdBy: "井上", fixedDay: 25 },
  // モバイル事業: 広告
  { businessId: "b3", accountId: "a3", categoryId: "c11", type: "EXPENSE" as const, costType: "VARIABLE" as const, baseAmount: 45000, comment: "モバイル集客広告", createdBy: "野田" },
  // せどり: 仕入れ原価
  { businessId: "b4", accountId: "a4", categoryId: "c13", type: "EXPENSE" as const, costType: "VARIABLE" as const, baseAmount: 310000, comment: "ポケカ仕入れ原価", createdBy: "野田" },
  { businessId: "b4", accountId: "a4", categoryId: "c13", type: "EXPENSE" as const, costType: "VARIABLE" as const, baseAmount: 120000, comment: "楽天せどり仕入れ", createdBy: "野田" },
  // コールセンター: 人件費 + 交通費
  { businessId: "b5", accountId: "a5", categoryId: "c16", type: "EXPENSE" as const, costType: "FIXED" as const, baseAmount: 120000, comment: "コールセンター外注スタッフ3名分", createdBy: "井上", fixedDay: 10 },
  { businessId: "b5", accountId: "a5", categoryId: "c12", type: "EXPENSE" as const, costType: "VARIABLE" as const, baseAmount: 8500, comment: "藤川さん 交通費精算", createdBy: "野田", probability: 0.6 },
  // 受託運用: 外注
  { businessId: "b6", accountId: "a6", categoryId: "c10", type: "EXPENSE" as const, costType: "VARIABLE" as const, baseAmount: 30000, comment: "運用レポート作成外注", createdBy: "井上", probability: 0.5 },
  // 全事業共通: その他経費（たまに）
  { businessId: "b2", accountId: "a2", categoryId: "c17", type: "EXPENSE" as const, costType: "VARIABLE" as const, baseAmount: 25000, comment: "備品・消耗品", createdBy: "野田", probability: 0.5 },
]

async function main() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-based

  // 直近12ヶ月分を生成（当月含む）
  const months: { year: number; month: number }[] = []
  for (let i = 11; i >= 0; i--) {
    let m = currentMonth - i
    let y = currentYear
    if (m <= 0) { m += 12; y -= 1 }
    months.push({ year: y, month: m })
  }

  let totalCreated = 0

  for (const { year, month } of months) {
    const txsForMonth: Array<Record<string, unknown>> = []

    for (const tmpl of monthlyTemplates) {
      // probability チェック（省略時は100%）
      if ((tmpl as { probability?: number }).probability && Math.random() > (tmpl as { probability?: number }).probability!) {
        continue
      }

      const day = (tmpl as { fixedDay?: number }).fixedDay ?? randDay()
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

      // 当月の未来日付はスキップ
      const txDate = new Date(dateStr)
      if (txDate > now) continue

      txsForMonth.push({
        date: txDate,
        businessId: tmpl.businessId,
        accountId: tmpl.accountId,
        categoryId: tmpl.categoryId,
        type: tmpl.type,
        costType: (tmpl as { costType?: string }).costType ?? null,
        amount: (tmpl as { fixedDay?: number }).fixedDay ? tmpl.baseAmount : jitter(tmpl.baseAmount),
        comment: `${tmpl.comment}（${month}月分）`,
        commentBy: tmpl.createdBy,
        createdBy: tmpl.createdBy,
        status: "approved",
      })
    }

    // バルク挿入
    for (const tx of txsForMonth) {
      await prisma.transaction.create({ data: tx as Parameters<typeof prisma.transaction.create>[0]["data"] })
    }

    totalCreated += txsForMonth.length
    console.log(`${year}/${String(month).padStart(2, "0")}: ${txsForMonth.length}件`)
  }

  console.log(`\n合計 ${totalCreated}件 の取引データを投入しました`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
