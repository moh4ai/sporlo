// Call public.custom_access_token_hook directly via SQL to verify the function
// itself works — rules out an issue in the function before we re-check the
// dashboard config. Uses Supabase's Management API to run arbitrary SQL.

import { createServiceRoleClient } from "../src/client.ts";

const admin = createServiceRoleClient();

// Use an existing user_id from a fresh insertion.
const ts = Date.now();
const slug = `hookdiag-${ts}`;
const { data: orgs } = await admin
  .from("organizations")
  .insert([{ slug, name_ar: "اختبار", name_en: "Hook Diag" }])
  .select();
const orgId = orgs![0]!.id as string;

const { data: user } = await admin.auth.admin.createUser({
  email: `hook-${ts}@example.com`,
  password: "Sp0rl0!hook-correcthorse",
  email_confirm: true,
});
const userId = user.user!.id;

await admin
  .from("users")
  .insert({ id: userId, org_id: orgId, email: `hook-${ts}@example.com`, role: "club_admin" });

// Call the hook function via RPC. Since we don't have an RPC wrapper, use a
// trick: insert a row that triggers nothing and select the function result.
// supabase-js doesn't expose `select fn(...)` directly without an RPC. So we
// fake an RPC by creating a one-off function call via the REST `rpc` endpoint
// after first creating a wrapper RPC. Simpler: use the Postgres connection via
// `from('...').select` won't work for arbitrary SQL. So we use the supabase
// admin REST endpoint via fetch — but that needs a Management API token.
//
// Easiest: just have the user paste the SQL below into the Supabase SQL editor.
console.log(`
Run this in the Supabase SQL editor at:
https://supabase.com/dashboard/project/sveqkaemfnvlqfgkbryu/sql/new

  select public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '${userId}'::text,
      'claims', '{}'::jsonb
    )
  );

Expected result (a single row containing JSON):
  {
    "claims": {
      "org_id": "${orgId}",
      "role": "club_admin"
    }
  }

Paste the actual result back. After, run the cleanup at the bottom.

-- CLEANUP after the diag query above:
-- delete from public.users where id = '${userId}';
-- delete from public.organizations where id = '${orgId}';
-- delete from auth.users where id = '${userId}';
`);
