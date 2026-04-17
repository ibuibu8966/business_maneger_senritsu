import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import { readFileSync } from "fs"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool as any)
const p = new PrismaClient({ adapter })

type Row = { name: string; email: string; robotpay: string; discord: string; phone: string }
const TAG = "Avaris"

async function main() {
  const rows: Row[] = JSON.parse(readFileSync("/Users/ibuki/Desktop/ジャービス/scripts/avaris_march_completed.json", "utf8"))

  // Duplicate check by email
  const emails = rows.map(r => r.email).filter(Boolean)
  const dup = await p.contact.findMany({
    where: { email: { in: emails } },
    select: { id: true, name: true, email: true, tags: true }
  })
  if (dup.length > 0) {
    console.log("⚠️ 既存DBにemail一致の連絡先あり:")
    dup.forEach(d => console.log(`  - ${d.name} (${d.email}) tags=${JSON.stringify(d.tags)}`))
  } else {
    console.log("✓ email重複なし")
  }

  // Ensure Avaris tag
  const tag = await p.crmTag.findUnique({ where: { name: TAG } })
  if (tag) {
    console.log(`✓ CRMタグ「${TAG}」は既存: ${tag.id}`)
  } else {
    const t = await p.crmTag.create({ data: { name: TAG, color: "green" } })
    console.log(`✓ CRMタグ「${TAG}」新規作成: ${t.id}`)
  }

  console.log("\n--- 投入開始 ---")
  let inserted = 0
  let skipped = 0
  for (const r of rows) {
    const already = dup.find(d => d.email === r.email)
    if (already) {
      console.log(`  [SKIP] ${r.name} (email重複: 既存=${already.name})`)
      skipped++
      continue
    }
    const created = await p.contact.create({
      data: {
        name: r.name,
        realName: "",
        nicknames: [],
        type: "SALON_MEMBER",
        email: r.email || "",
        phone: r.phone || "",
        discordId: r.discord || "",
        robotpayId: r.robotpay || "",
        tags: [TAG],
      }
    })
    console.log(`  [OK]   ${r.name} → id=${created.id}`)
    inserted++
  }
  console.log(`\n投入: ${inserted}件 / スキップ: ${skipped}件`)

  // Verify
  const avaris = await p.contact.findMany({
    where: { tags: { has: TAG } },
    select: { name: true, email: true, phone: true, discordId: true, robotpayId: true },
    orderBy: { createdAt: "desc" }
  })
  console.log(`\n=== Avarisタグ付き連絡先（${avaris.length}件） ===`)
  avaris.forEach(a => console.log(`  ${a.name.padEnd(32)} | ${a.email.padEnd(32)} | phone=${a.phone.padEnd(13)} | discord=${a.discordId.padEnd(15)} | robotpay=${a.robotpayId}`))
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
