import pg from "pg"
import { readFileSync } from "fs"
import { createHash, randomUUID } from "crypto"

const MIGRATION_NAME = "20260417120000_add_nicknames_index"
const SQL_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`

async function main() {
  const sql = readFileSync(SQL_PATH, "utf8")
  const checksum = createHash("sha256").update(sql).digest("hex")
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL })
  const client = await pool.connect()
  try {
    console.log("Applying migration:", MIGRATION_NAME)
    await client.query(sql)
    await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
      [randomUUID(), checksum, MIGRATION_NAME],
    )
    const idx = await client.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename='contacts' AND (indexname LIKE '%nicknames%' OR indexname LIKE '%realName%')`
    )
    console.table(idx.rows)
    console.log("SUCCESS")
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}
main()
