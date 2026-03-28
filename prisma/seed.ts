import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client.js"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // 事業
  const businesses = await Promise.all([
    prisma.business.create({ data: { id: "b1", name: "アビトラ" } }),
    prisma.business.create({ data: { id: "b2", name: "スーパーサロン" } }),
    prisma.business.create({ data: { id: "b3", name: "モバイル事業" } }),
    prisma.business.create({ data: { id: "b4", name: "せどり" } }),
    prisma.business.create({ data: { id: "b5", name: "コールセンター" } }),
    prisma.business.create({ data: { id: "b6", name: "受託運用" } }),
  ])
  console.log(`Created ${businesses.length} businesses`)

  // 口座（社内銀行口座のみ = 管理会計用）
  const accounts = await Promise.all([
    prisma.account.create({ data: { id: "a1", name: "SBI銀行", ownerType: "INTERNAL", accountType: "BANK", businessId: "b1" } }),
    prisma.account.create({ data: { id: "a2", name: "楽天銀行", ownerType: "INTERNAL", accountType: "BANK", businessId: "b2" } }),
    prisma.account.create({ data: { id: "a3", name: "住信SBI", ownerType: "INTERNAL", accountType: "BANK", businessId: "b3" } }),
    prisma.account.create({ data: { id: "a4", name: "三井住友銀行", ownerType: "INTERNAL", accountType: "BANK", businessId: "b4" } }),
    prisma.account.create({ data: { id: "a5", name: "PayPay銀行", ownerType: "INTERNAL", accountType: "BANK", businessId: "b5" } }),
    prisma.account.create({ data: { id: "a6", name: "GMOあおぞら", ownerType: "INTERNAL", accountType: "BANK", businessId: "b6" } }),
    // 証券口座（貸借・口座モジュール用）
    prisma.account.create({ data: { id: "a7", name: "SBI証券", ownerType: "INTERNAL", accountType: "SECURITIES", businessId: "b1" } }),
    prisma.account.create({ data: { id: "a8", name: "GMO証券", ownerType: "INTERNAL", accountType: "SECURITIES", businessId: "b1" } }),
    // 社外口座（銀行）
    prisma.account.create({ data: { id: "a9", name: "Cさん口座", ownerType: "EXTERNAL", accountType: "BANK", purpose: "Cさんとの精算用" } }),
    prisma.account.create({ data: { id: "a10", name: "高井さん口座", ownerType: "EXTERNAL", accountType: "BANK", purpose: "ポニーワン請求関連" } }),
    prisma.account.create({ data: { id: "a11", name: "白蛇さん口座", ownerType: "EXTERNAL", accountType: "BANK", purpose: "借入金管理" } }),
    // 社外口座（証券）
    prisma.account.create({ data: { id: "a12", name: "ピーチブルーム証券", ownerType: "EXTERNAL", accountType: "SECURITIES", purpose: "Cさん投資会社の運用口座" } }),
    prisma.account.create({ data: { id: "a13", name: "ナスノさん証券", ownerType: "EXTERNAL", accountType: "SECURITIES", purpose: "サヤ取り・バリュー投資用" } }),
  ])
  console.log(`Created ${accounts.length} accounts`)

  // カテゴリ
  const categories = await Promise.all([
    prisma.category.create({ data: { id: "c1", name: "サロン会費", type: "INCOME" } }),
    prisma.category.create({ data: { id: "c2", name: "運用利益", type: "INCOME" } }),
    prisma.category.create({ data: { id: "c3", name: "受託手数料", type: "INCOME" } }),
    prisma.category.create({ data: { id: "c4", name: "決済代行手数料", type: "INCOME" } }),
    prisma.category.create({ data: { id: "c5", name: "SIM販売", type: "INCOME" } }),
    prisma.category.create({ data: { id: "c6", name: "せどり売上", type: "INCOME" } }),
    prisma.category.create({ data: { id: "c7", name: "買取売上", type: "INCOME" } }),
    prisma.category.create({ data: { id: "c8", name: "その他収入", type: "INCOME" } }),
    prisma.category.create({ data: { id: "c10", name: "外注費", type: "EXPENSE" } }),
    prisma.category.create({ data: { id: "c11", name: "広告費", type: "EXPENSE" } }),
    prisma.category.create({ data: { id: "c12", name: "交通費", type: "EXPENSE" } }),
    prisma.category.create({ data: { id: "c13", name: "消耗品", type: "EXPENSE" } }),
    prisma.category.create({ data: { id: "c14", name: "家賃", type: "EXPENSE" } }),
    prisma.category.create({ data: { id: "c15", name: "サブスク", type: "EXPENSE" } }),
    prisma.category.create({ data: { id: "c16", name: "人件費", type: "EXPENSE" } }),
    prisma.category.create({ data: { id: "c17", name: "その他経費", type: "EXPENSE" } }),
  ])
  console.log(`Created ${categories.length} categories`)

  // 取引データ
  const txData = [
    { date: "2026-03-01", businessId: "b2", accountId: "a2", categoryId: "c1", type: "INCOME" as const, amount: 450000, comment: "3月分サロン会費", commentBy: "井上", createdBy: "井上" },
    { date: "2026-03-03", businessId: "b1", accountId: "a1", categoryId: "c2", type: "INCOME" as const, amount: 280000, comment: "サヤ取り 2月分確定利益", commentBy: "野田", createdBy: "野田" },
    { date: "2026-03-05", businessId: "b3", accountId: "a3", categoryId: "c5", type: "INCOME" as const, amount: 180000, comment: "", commentBy: "", createdBy: "野田" },
    { date: "2026-03-05", businessId: "b2", accountId: "a2", categoryId: "c10", type: "EXPENSE" as const, costType: "VARIABLE" as const, amount: 55000, comment: "あーさん アビトラ説明サポート", commentBy: "野田", createdBy: "野田" },
    { date: "2026-03-07", businessId: "b5", accountId: "a5", categoryId: "c16", type: "EXPENSE" as const, costType: "FIXED" as const, amount: 120000, comment: "コールセンター外注スタッフ3名分", commentBy: "井上", createdBy: "井上" },
    { date: "2026-03-10", businessId: "b4", accountId: "a4", categoryId: "c6", type: "INCOME" as const, amount: 620000, comment: "ポケカ抽選当選分 売却", commentBy: "野田", createdBy: "野田" },
    { date: "2026-03-10", businessId: "b4", accountId: "a4", categoryId: "c13", type: "EXPENSE" as const, costType: "VARIABLE" as const, amount: 310000, comment: "ポケカ仕入れ原価", commentBy: "野田", createdBy: "野田" },
    { date: "2026-03-12", businessId: "b1", accountId: "a1", categoryId: "c10", type: "EXPENSE" as const, costType: "VARIABLE" as const, amount: 80000, comment: "ナスノさん 業務委託費", commentBy: "野田", createdBy: "野田" },
    { date: "2026-03-14", businessId: "b2", accountId: "a2", categoryId: "c15", type: "EXPENSE" as const, costType: "FIXED" as const, amount: 35000, comment: "各種SaaSサブスク", commentBy: "井上", createdBy: "井上" },
    { date: "2026-03-15", businessId: "b6", accountId: "a6", categoryId: "c3", type: "INCOME" as const, amount: 150000, comment: "受託運用手数料 3月分", commentBy: "井上", createdBy: "井上" },
    { date: "2026-03-15", businessId: "b3", accountId: "a3", categoryId: "c4", type: "INCOME" as const, amount: 95000, comment: "決済代行 アバリス+エムダ分", commentBy: "井上", createdBy: "井上" },
    { date: "2026-03-16", businessId: "b2", accountId: "a2", categoryId: "c14", type: "EXPENSE" as const, costType: "FIXED" as const, amount: 150000, comment: "事務所家賃", commentBy: "野田", createdBy: "野田" },
    { date: "2026-03-17", businessId: "b3", accountId: "a3", categoryId: "c11", type: "EXPENSE" as const, costType: "VARIABLE" as const, amount: 45000, comment: "モバイル集客広告", commentBy: "野田", createdBy: "野田" },
    { date: "2026-03-18", businessId: "b1", accountId: "a1", categoryId: "c2", type: "INCOME" as const, amount: 350000, comment: "バリュー投資 利益確定", commentBy: "野田", createdBy: "野田" },
    { date: "2026-03-18", businessId: "b5", accountId: "a5", categoryId: "c12", type: "EXPENSE" as const, costType: "VARIABLE" as const, amount: 8500, comment: "藤川さん 交通費精算", commentBy: "野田", createdBy: "野田", isArchived: true },
  ]

  for (const tx of txData) {
    await prisma.transaction.create({
      data: {
        date: new Date(tx.date),
        businessId: tx.businessId,
        accountId: tx.accountId,
        categoryId: tx.categoryId,
        type: tx.type,
        costType: tx.costType ?? null,
        amount: tx.amount,
        comment: tx.comment,
        commentBy: tx.commentBy,
        createdBy: tx.createdBy,
        isArchived: tx.isArchived ?? false,
      },
    })
  }
  console.log(`Created ${txData.length} transactions`)

  // 固定費
  const fixedCostData = [
    { businessId: "b2", accountId: "a2", categoryId: "c14", amount: 150000, dayOfMonth: 25, memo: "事務所家賃" },
    { businessId: "b5", accountId: "a5", categoryId: "c16", amount: 120000, dayOfMonth: 10, memo: "コールセンター外注スタッフ" },
    { businessId: "b2", accountId: "a2", categoryId: "c15", amount: 35000, dayOfMonth: 1, memo: "各種SaaSサブスク" },
    { businessId: "b1", accountId: "a1", categoryId: "c10", amount: 80000, dayOfMonth: 15, memo: "ナスノさん業務委託費" },
    { businessId: "b2", accountId: "a2", categoryId: "c16", amount: 200000, dayOfMonth: 25, memo: "野田 給与" },
  ]

  for (const fc of fixedCostData) {
    await prisma.fixedCost.create({ data: fc })
  }
  console.log(`Created ${fixedCostData.length} fixed costs`)

  // 貸借サンプルデータ（双方向ペア）
  // 社内口座間: SBI銀行(a1) → 楽天銀行(a2) に50万貸出
  const lending1 = await prisma.lending.create({
    data: {
      id: "l1",
      accountId: "a1",
      counterparty: "楽天銀行",
      counterpartyAccountId: "a2",
      type: "LEND",
      principal: 500000,
      outstanding: 300000,
      memo: "運転資金の貸出",
    },
  })
  const lending2 = await prisma.lending.create({
    data: {
      id: "l2",
      accountId: "a2",
      counterparty: "SBI銀行",
      counterpartyAccountId: "a1",
      type: "BORROW",
      principal: 500000,
      outstanding: 300000,
      linkedLendingId: "l1",
      memo: "運転資金の借入",
    },
  })
  await prisma.lending.update({ where: { id: "l1" }, data: { linkedLendingId: "l2" } })

  // AccountTransaction自動計上（社内ペア: SBI→楽天 50万貸出）
  await prisma.accountTransaction.create({
    data: { accountId: "a1", type: "LEND", amount: 500000, date: new Date("2026-03-01"), counterparty: "楽天銀行", memo: "貸借自動計上", editedBy: "system" },
  })
  await prisma.account.update({ where: { id: "a1" }, data: { balance: { increment: -500000 } } })
  await prisma.accountTransaction.create({
    data: { accountId: "a2", type: "BORROW", amount: 500000, date: new Date("2026-03-01"), counterparty: "SBI銀行", memo: "貸借自動計上", editedBy: "system" },
  })
  await prisma.account.update({ where: { id: "a2" }, data: { balance: { increment: 500000 } } })

  // 社外相手: 白蛇さん口座(a11)から200万借入
  await prisma.lending.create({
    data: {
      id: "l3",
      accountId: "a6",
      counterparty: "白蛇さん",
      counterpartyAccountId: "a11",
      type: "BORROW",
      principal: 2000000,
      outstanding: 2000000,
      memo: "ノウハウ対価の借入",
    },
  })
  // AccountTransaction自動計上（GMOあおぞら: 200万借入 = 残高+200万）
  await prisma.accountTransaction.create({
    data: { accountId: "a6", type: "BORROW", amount: 2000000, date: new Date("2026-03-01"), counterparty: "白蛇さん", memo: "貸借自動計上", editedBy: "system" },
  })
  await prisma.account.update({ where: { id: "a6" }, data: { balance: { increment: 2000000 } } })
  // AccountTransaction自動計上（白蛇さん口座: 200万貸出 = 残高-200万）
  await prisma.accountTransaction.create({
    data: { accountId: "a11", type: "LEND", amount: 2000000, date: new Date("2026-03-01"), counterparty: "GMOあおぞら", memo: "貸借自動計上", editedBy: "system" },
  })
  await prisma.account.update({ where: { id: "a11" }, data: { balance: { increment: -2000000 } } })

  // 返済履歴（SBI↔楽天の第1回返済20万）
  await prisma.lendingPayment.create({
    data: { lendingId: "l1", amount: 200000, date: new Date("2026-03-10"), memo: "第1回返済" },
  })
  await prisma.lendingPayment.create({
    data: { lendingId: "l2", amount: 200000, date: new Date("2026-03-10"), memo: "第1回返済" },
  })
  // 返済のAccountTransaction自動計上
  await prisma.accountTransaction.create({
    data: { accountId: "a1", type: "REPAYMENT_RECEIVE", amount: 200000, date: new Date("2026-03-10"), counterparty: "楽天銀行", memo: "返済自動計上", editedBy: "system" },
  })
  await prisma.account.update({ where: { id: "a1" }, data: { balance: { increment: 200000 } } })
  await prisma.accountTransaction.create({
    data: { accountId: "a2", type: "REPAYMENT_PAY", amount: 200000, date: new Date("2026-03-10"), counterparty: "SBI銀行", memo: "返済自動計上", editedBy: "system" },
  })
  await prisma.account.update({ where: { id: "a2" }, data: { balance: { increment: -200000 } } })

  console.log("Created lending sample data with AccountTransactions")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
