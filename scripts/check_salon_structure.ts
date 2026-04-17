import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool as any)
const p = new PrismaClient({ adapter })

async function main() {
  const salons = await p.salon.findMany({
    include: {
      courses: {
        include: { _count: { select: { subscriptions: true } } }
      }
    }
  })
  console.log("=== Salons ===")
  salons.forEach(s => {
    console.log(`[${s.name}] active=${s.isActive}`)
    s.courses.forEach(c => {
      console.log(`   - ${c.name} (月額${c.monthlyFee}円) subs=${c._count.subscriptions}`)
    })
  })

  console.log("\n=== サロン生の現状 ===")
  const members = await p.contact.count({ where: { type: 'SALON_MEMBER' } })
  const withSub = await p.contact.count({
    where: { type: 'SALON_MEMBER', subscriptions: { some: {} } }
  })
  console.log(`サロン生 total=${members}, サブスク有り=${withSub}, サブスク無し=${members - withSub}`)
}
main().finally(() => p.$disconnect())
