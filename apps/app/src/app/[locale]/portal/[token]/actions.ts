"use server";

import {
  EmailSchema,
  actionError,
  actionOk,
  z,
  type ActionResult,
} from "@sporlo/shared";

import { createServiceRoleClient } from "@/lib/supabase-server";

// Lets a portal-token-holding member exchange that 7-day magic link for a
// permanent email/password account. Verifies the token, creates an
// auth.users row, links public.members.user_id, and (re)materialises the
// public.users row so the auth-hook can mint a `role=member` JWT.

const ClaimSchema = z.object({
  token: z.string().uuid(),
  email: EmailSchema,
  password: z.string().min(8).max(72),
});

export async function claimPortalAccount(
  input: z.infer<typeof ClaimSchema>,
): Promise<ActionResult<void>> {
  const parsed = ClaimSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionError(issue?.message ?? "invalid", issue?.path?.[0]?.toString());
  }

  const admin = createServiceRoleClient();

  // 1. Token must exist, not be expired, and the member row must exist.
  const { data: tokenRow } = await admin
    .from("member_portal_tokens")
    .select("id, member_id, org_id, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle();
  if (!tokenRow) return actionError("invalid-token");
  if (new Date(tokenRow.expires_at as string) < new Date()) {
    return actionError("expired-token");
  }

  const { data: member } = await admin
    .from("members")
    .select("id, user_id")
    .eq("id", tokenRow.member_id)
    .maybeSingle();
  if (!member) return actionError("member-not-found");
  if (member.user_id) return actionError("already-claimed");

  // 2. Create the auth.users row. If the email is already taken, fall back
  // to looking it up (the user may have signed up via the staff flow and
  // is now claiming their member account too).
  let authUserId: string | null = null;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createErr) {
    // Common case: "email already exists". Retrieve the existing user.
    const { data: lookup } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    const existing = (lookup?.users ?? []).find(
      (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
    );
    if (!existing) return actionError(createErr.message);
    authUserId = existing.id;
  } else {
    authUserId = created?.user?.id ?? null;
  }
  if (!authUserId) return actionError("auth-user-not-created");

  // 3. Materialise public.users so the auth-hook can read role + org_id
  // on the next sign-in. Use upsert in case the row exists from a prior
  // staff invite or test claim.
  const { error: usersErr } = await admin.from("users").upsert(
    {
      id: authUserId,
      org_id: tokenRow.org_id,
      email: parsed.data.email,
      role: "member",
      active: true,
    },
    { onConflict: "id" },
  );
  if (usersErr) return actionError(usersErr.message);

  // 4. Link members.user_id to the new auth user.
  const { error: linkErr } = await admin
    .from("members")
    .update({ user_id: authUserId })
    .eq("id", tokenRow.member_id);
  if (linkErr) return actionError(linkErr.message);

  // 5. Burn the portal token so the link can't be re-used.
  await admin
    .from("member_portal_tokens")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return actionOk(undefined);
}
