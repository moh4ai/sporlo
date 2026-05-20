// One-shot helper to apply a SQL migration file against $SUPABASE_DB_URL.
// Usage:  node scripts/apply-migration.mjs <path/to/file.sql>
// Intended for ad-hoc cloud-DB migrations when psql isn't on PATH.

import { readFile } from "node:fs/promises";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env.local", import.meta.url) });

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs <file.sql>");
  process.exit(1);
}
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL in env.");
  process.exit(1);
}

const sql = await readFile(file, "utf8");
const pg = new Client({ connectionString: dbUrl });
await pg.connect();
try {
  await pg.query(sql);
  console.log(`Applied: ${file}`);
} catch (e) {
  console.error(`Failed: ${e.message}`);
  process.exit(1);
} finally {
  await pg.end();
}
