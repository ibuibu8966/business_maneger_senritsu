import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import * as dotenv from "dotenv"
dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  const r1 = await prisma.lendingPayment.deleteMany({})
  console.log("LendingPayment deleted:", r1.count)
  const r2 = await prisma.lending.deleteMany({})
  console.log("Lending deleted:", r2.count)
  const r3 = await prisma.accountTransaction.deleteMany({})
  console.log("AccountTransaction deleted:", r3.count)
  const r4 = await prisma.account.updateMany({ data: { balance: 0 } })
  console.log("Account balance reset:", r4.count)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
