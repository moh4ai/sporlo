// Diagnostic: create a user + public.users row, sign in, decode the JWT,
// print the claims so we can see whether the auth hook is injecting org_id.

import { createServiceRoleClient, createUserClient } from "../src/client.ts";

const admin = createServiceRoleClient();

const ts = Date.now();
const slug = `diag-${ts}`;
const email = `diag-${ts}@example.com`;
const password = "Sp0rl0!diag-correcthorse";

const { data: orgs, error: orgErr } = await admin
  .from("organizations")
  .insert([{ slug, name_ar: "تشخيص", name_en: "Diagnostic Club" }])
  .select();
if (orgErr) throw orgErr;
const orgId = orgs![0]!.id as string;
console.log("org_id =", orgId);

const { data: user, error: uErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (uErr) throw uErr;
const userId = user.user!.id;
console.log("user_id =", userId);

const { error: upErr } = await admin
  .from("users")
  .insert({ id: userId, org_id: orgId, email, role: "club_admin" });
if (upErr) throw upErr;

// Verify the row landed.
const { data: rows } = await admin
  .from("users")
  .select("*")
  .eq("id", userId);
console.log("public.users row:", rows);

const { data: signIn, error: siErr } = await admin.auth.signInWithPassword({
  email,
  password,
});
if (siErr) throw siErr;

const token = signIn.session!.access_token;
const claims = JSON.parse(
  Buffer.from(token.split(".")[1]!, "base64").toString("utf-8"),
);
console.log("\nJWT claims:");
console.log(JSON.stringify(claims, null, 2));

// Try a SELECT as that user.
const userClient = createUserClient(token);
const { data: members, error: mErr } = await userClient
  .from("members")
  .select("*");
console.log("\nuser SELECT members:", { count: members?.length, mErr });

// Cleanup.
await admin.from("users").delete().eq("id", userId);
await admin.from("organizations").delete().eq("id", orgId);
await admin.auth.admin.deleteUser(userId);
console.log("\ncleaned up");
