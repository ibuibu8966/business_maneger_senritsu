import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool as any)
const p = new PrismaClient({ adapter })

async function main() {
  const total = await p.contact.count({ where: { type: 'SALON_MEMBER' } })
  const archived = await p.contact.count({ where: { type: 'SALON_MEMBER', isArchived: true } })
  const active = total - archived
  console.log(`[サロン生 total] ${total} (active: ${active}, archived: ${archived})`)

  const samples = await p.contact.findMany({
    where: { type: 'SALON_MEMBER', isArchived: false },
    select: { id: true, name: true, memo: true, occupation: true, lineId: true, discordId: true },
    take: 15,
    orderBy: { createdAt: 'desc' }
  })
  console.log('\n--- 直近登録のサロン生15件 ---')
  samples.forEach(s => {
    const memoSnippet = (s.memo || '').replace(/\n/g, ' ').slice(0, 60)
    console.log(`  name="${s.name}" | line=${s.lineId ? 'Y' : '-'} discord=${s.discordId ? 'Y' : '-'} | memo="${memoSnippet}"`)
  })

  const withKeywords = await p.contact.count({
    where: {
      type: 'SALON_MEMBER',
      OR: [
        { memo: { contains: '本名' } },
        { memo: { contains: 'ニックネーム' } },
        { memo: { contains: 'HN' } },
      ]
    }
  })
  console.log(`\n[memoに本名/ニックネーム/HN含む] ${withKeywords}件`)

  const nameWithParens = await p.contact.findMany({
    where: {
      type: 'SALON_MEMBER',
      OR: [
        { name: { contains: '（' } },
        { name: { contains: '(' } },
        { name: { contains: '/' } },
      ]
    },
    select: { name: true },
    take: 30
  })
  console.log(`\n[nameに括弧/スラッシュ含む] ${nameWithParens.length}件`)
  nameWithParens.forEach(n => console.log(`  "${n.name}"`))
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
