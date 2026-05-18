#!/usr/bin/env node
// Wipes the demo-club tenant and re-applies supabase/seed/demo.sql against
// the staging Postgres. Avoids the Supabase SQL editor (which mangles bidi
// text on paste) by going directly via pg over TCP.
//
// USAGE
//   1. In apps/app/.env.local, add (one-time):
//        SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:6543/postgres
//      You'll find the exact string in Supabase dashboard →
//      Project Settings → Database → Connection string → "Session pooler"
//      (NOT the "Direct connection" entry — IPv6 only on free tier).
//   2. node apps/app/scripts/reseed-demo.mjs
//
// SAFETY
// The script is hard-coded to operate only on the org with slug 'demo-club'.
// The cascade delete removes every demo-scoped row across all 10 modules.
// It will NOT touch any other tenant.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, "..");
const REPO_ROOT = join(APP_ROOT, "..", "..");

config({ path: join(APP_ROOT, ".env.local") });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "\n❌ SUPABASE_DB_URL not set in apps/app/.env.local\n\n" +
      "Add the Postgres connection string from Supabase dashboard:\n" +
      "  Project Settings → Database → Connection string → Session pooler\n",
  );
  process.exit(1);
}

const seedPath = join(REPO_ROOT, "supabase", "seed", "demo.sql");
let seedSql;
try {
  seedSql = readFileSync(seedPath, "utf-8");
} catch (err) {
  console.error(`❌ Couldn't read ${seedPath}: ${err.message}`);
  process.exit(1);
}

console.log(`📄 Loaded seed file (${seedSql.length} bytes)`);

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log("🔌 Connecting to Postgres...");
  await client.connect();

  console.log("🧹 Wiping existing demo-club data (cascade)...");
  const del = await client.query(
    "DELETE FROM public.organizations WHERE slug = 'demo-club' RETURNING id",
  );
  console.log(`   removed ${del.rowCount} org row(s)`);

  console.log("🌱 Applying seed file...");
  // pg's simple query protocol supports multi-statement + DO blocks. Pass
  // the whole file as one query — Postgres parses and runs each chunk.
  await client.query(seedSql);

  console.log("\n✅ Demo seed applied. Arabic text is now byte-correct.");
  console.log(
    "   View it: sign in to the dashboard as a demo-club admin, or impersonate via the Sporlo HQ admin app.",
  );
} catch (err) {
  console.error(`\n❌ Seed failed: ${err.message}`);
  if (err.position) console.error(`   at byte position ${err.position}`);
  process.exit(1);
} finally {
  await client.end();
}
