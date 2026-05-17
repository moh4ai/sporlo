// Cross-tenant isolation test. Run against a *test* Supabase project — it
// creates and deletes orgs/members. Don't point this at production.
//
// Usage:
//   set NEXT_PUBLIC_SUPABASE_URL=...
//   set NEXT_PUBLIC_SUPABASE_ANON_KEY=...
//   set SUPABASE_SERVICE_ROLE_KEY=...
//   corepack pnpm --filter @sporlo/db test:tenant-isolation
//
// The test skips when env vars are missing so CI on PRs without secrets passes.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createServiceRoleClient, createUserClient } from "../src/client.ts";

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test("cross-tenant SELECT returns zero rows", { skip: !hasEnv }, async () => {
  const admin = createServiceRoleClient();

  // Two orgs.
  const slugA = `test-a-${Date.now()}`;
  const slugB = `test-b-${Date.now()}`;
  const { data: orgs, error: orgErr } = await admin
    .from("organizations")
    .insert([
      { slug: slugA, name_ar: "نادي أ", name_en: "Club A" },
      { slug: slugB, name_ar: "نادي ب", name_en: "Club B" },
    ])
    .select();
  assert.equal(orgErr, null);
  assert.equal(orgs?.length, 2);
  const orgA = orgs![0]!.id as string;
  const orgB = orgs![1]!.id as string;

  // One member in each org.
  const { error: memberErr } = await admin.from("members").insert([
    { org_id: orgA, full_name_ar: "عضو أ" },
    { org_id: orgB, full_name_ar: "عضو ب" },
  ]);
  assert.equal(memberErr, null);

  // Two test auth users. We fabricate a session JWT by minting a user and
  // using Supabase's GoTrue admin API to issue a sign-in link, then exchange
  // it for a session. For the Day 2 smoke we instead set the JWT claims
  // directly using `auth.admin.generateLink` + `setSession`.
  //
  // Simpler approach: create a user, then set its app_metadata.org_id, and
  // sign them in via `signInWithPassword`. We use a generated email + password.
  const emailA = `tester-a-${Date.now()}@example.com`;
  const emailB = `tester-b-${Date.now()}@example.com`;
  const password = "Sp0rl0!test-correcthorse";

  const { data: userA, error: uaErr } = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    app_metadata: { org_id: orgA, role: "club_admin" },
  });
  assert.equal(uaErr, null);
  const { data: userB, error: ubErr } = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    app_metadata: { org_id: orgB, role: "club_admin" },
  });
  assert.equal(ubErr, null);

  // Mirror into public.users so RLS-scoped queries find them.
  await admin.from("users").insert([
    { id: userA!.user!.id, org_id: orgA, email: emailA, role: "club_admin" },
    { id: userB!.user!.id, org_id: orgB, email: emailB, role: "club_admin" },
  ]);

  // Sign in as A; SELECT members; expect 1 row (Club A's member only).
  const signInA = await admin.auth.signInWithPassword({ email: emailA, password });
  assert.equal(signInA.error, null);
  const clientA = createUserClient(signInA.data.session!.access_token);
  const aMembers = await clientA.from("members").select("id, org_id");
  assert.equal(aMembers.error, null);
  assert.equal(aMembers.data?.length, 1, "user A should see only Club A members");
  assert.equal(aMembers.data?.[0]?.org_id, orgA);

  // Sign in as B; SELECT members; expect 1 row (Club B's member only).
  const signInB = await admin.auth.signInWithPassword({ email: emailB, password });
  assert.equal(signInB.error, null);
  const clientB = createUserClient(signInB.data.session!.access_token);
  const bMembers = await clientB.from("members").select("id, org_id");
  assert.equal(bMembers.error, null);
  assert.equal(bMembers.data?.length, 1, "user B should see only Club B members");
  assert.equal(bMembers.data?.[0]?.org_id, orgB);

  // Cleanup.
  await admin.from("members").delete().in("org_id", [orgA, orgB]);
  await admin.from("users").delete().in("org_id", [orgA, orgB]);
  await admin.from("organizations").delete().in("id", [orgA, orgB]);
  await admin.auth.admin.deleteUser(userA!.user!.id);
  await admin.auth.admin.deleteUser(userB!.user!.id);
});
