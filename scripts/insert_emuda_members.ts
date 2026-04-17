import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import { readFileSync } from "fs"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool as any)
const p = new PrismaClient({ adapter })

type Row = { name: string; email: string; robotpay: string }

async function main() {
  const raw = readFileSync("/Users/ibuki/Desktop/ジャービス/scripts/emuda_march_completed.json", "utf8")
  const rows: Row[] = JSON.parse(raw)

  // Step A: Check duplicates by email
  const emails = rows.map(r => r.email).filter(Boolean)
  const dup = await p.contact.findMany({
    where: { email: { in: emails } },
    select: { id: true, name: true, email: true, type: true, tags: true }
  })
  if (dup.length > 0) {
    console.log("⚠️ 既存DBにemail一致の連絡先があります:")
    dup.forEach(d => console.log(`  - ${d.name} (${d.email}) type=${d.type} tags=${JSON.stringify(d.tags)}`))
    console.log("")
  } else {
    console.log("✓ 重複なし（email一致なし）\n")
  }

  // Step B: Ensure EMUDA tag exists
  const existingTag = await p.crmTag.findUnique({ where: { name: "EMUDA" } })
  if (existingTag) {
    console.log(`✓ CRMタグ「EMUDA」は既存: id=${existingTag.id}`)
  } else {
    const t = await p.crmTag.create({ data: { name: "EMUDA", color: "blue" } })
    console.log(`✓ CRMタグ「EMUDA」を新規作成: id=${t.id}`)
  }

  // Step C: Insert contacts
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
        robotpayId: r.robotpay || "",
        tags: ["EMUDA"],
      }
    })
    console.log(`  [OK]   ${r.name} → id=${created.id}`)
    inserted++
  }

  console.log(`\n投入: ${inserted}件 / スキップ: ${skipped}件`)

  // Step D: Verification
  const emuda = await p.contact.findMany({
    where: { tags: { has: "EMUDA" } },
    select: { name: true, email: true, robotpayId: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  console.log(`\n=== EMUDAタグ付き連絡先（${emuda.length}件） ===`)
  emuda.forEach(e => console.log(`  ${e.name.padEnd(30)} | ${e.email.padEnd(35)} | robotpay=${e.robotpayId}`))
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
