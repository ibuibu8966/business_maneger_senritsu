import pg from "pg"
import { readFileSync } from "fs"
import { createHash } from "crypto"
import { randomUUID } from "crypto"

const MIGRATION_NAME = "20260417100000_add_realname_nicknames_to_contact"
const MIGRATION_SQL_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`

async function main() {
  const sql = readFileSync(MIGRATION_SQL_PATH, "utf8")
  const checksum = createHash("sha256").update(sql).digest("hex")

  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL })
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    console.log("Before: contacts columns")
    const before = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='contacts' AND column_name IN ('realName','nicknames','name')`
    )
    console.table(before.rows)

    console.log(`\nExecuting migration SQL...\n${sql}`)
    await client.query(sql)

    console.log("\nInserting into _prisma_migrations...")
    await client.query(
      `INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
      [randomUUID(), checksum, MIGRATION_NAME]
    )

    await client.query("COMMIT")

    console.log("\nAfter: contacts columns")
    const after = await client.query(
      `SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name='contacts' AND column_name IN ('realName','nicknames','name') ORDER BY ordinal_position`
    )
    console.table(after.rows)

    console.log("\n_prisma_migrations recent 3:")
    const migs = await client.query(
      `SELECT migration_name, applied_steps_count, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 3`
    )
    console.table(migs.rows)

    console.log("\nSUCCESS")
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("FAILED:", e)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
