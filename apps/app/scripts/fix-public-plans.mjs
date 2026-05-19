// One-shot: flip public_visible=true on demo-club plans so /membership renders.
// Safe to re-run.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const res = await client.query(
  `update public.plans set public_visible = true
     where org_id = (select id from public.organizations where slug = 'demo-club')
     returning code, public_visible`,
);
console.log(`✓ updated ${res.rowCount} plan(s):`);
for (const r of res.rows) console.log(`  · ${r.code} → public_visible=${r.public_visible}`);
await client.end();
