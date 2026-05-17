"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

import {
  InvitationIdSchema,
  InviteUserSchema,
  UpdateUserSchema,
  UserIdSchema,
  type InviteUserInput,
  type UpdateUserInput,
} from "./validation";

async function withPrincipal(
  action: Parameters<typeof requirePrincipal>[1],
  resource: Parameters<typeof requirePrincipal>[2],
) {
  const tenant = await getActiveTenant();
  try {
    requirePrincipal(
      { role: tenant.user_role, department: tenant.department },
      action,
      resource,
    );
  } catch (err) {
    if (err instanceof PermissionDeniedError) return { tenant: null, error: err };
    throw err;
  }
  return { tenant, error: null };
}

function permissionError(action: string, resource: string): ActionResult<never> {
  return actionError(`permission-denied:${action}:${resource}`);
}

function inviteUrl(token: string, locale: "ar" | "en" = "ar") {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://sporlo-app.vercel.app";
  return `${baseUrl}/${locale}/accept-invite/${token}`;
}

// ─────────────────────────────────────────────
// Invitations
// ─────────────────────────────────────────────

export async function inviteUser(
  input: InviteUserInput,
): Promise<ActionResult<{ id: string; url: string; emailed: boolean }>> {
  const parsed = InviteUserSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionError(issue?.message ?? "invalid", issue?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("create", "invitation");
  if (error) return permissionError("create", "invitation");

  const email = parsed.data.email.toLowerCase().trim();
  const supabase = await createSupabaseServerClient();

  // Reject if an active teammate already exists with this email.
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .ilike("email", email)
    .eq("active", true)
    .maybeSingle();
  if (existingUser) return actionError("already-member", "email");

  // Reject if a pending invite already exists for this email in this org.
  const { data: pending } = await supabase
    .from("user_invitations")
    .select("id")
    .ilike("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (pending) return actionError("already-invited", "email");

  const { data: inv, error: insErr } = await supabase
    .from("user_invitations")
    .insert({
      org_id: tenant!.org_id,
      email,
      role: parsed.data.role,
      department: parsed.data.department ?? null,
      invited_by: tenant!.user_id,
    })
    .select("id, token")
    .single();
  if (insErr || !inv) return actionError(insErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "user_invited",
    p_target_type: "invitation",
    p_target_id: inv.id,
    p_payload: { email, role: parsed.data.role, department: parsed.data.department ?? null },
  });

  const url = inviteUrl(inv.token);

  // Best-effort Resend delivery. Mirrors the member-portal magic-link
  // pattern — no SDK, no hard dependency, graceful fallback when the env
  // var is absent.
  let emailed = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Sporlo <noreply@sporlo.net>",
          to: email,
          subject: "You've been invited to Sporlo",
          html: `<p>Hi,</p>
                 <p>You've been invited to join a Sporlo club as <strong>${parsed.data.role}</strong>.</p>
                 <p><a href="${url}">Accept the invitation</a></p>
                 <p>This link expires in 7 days.</p>`,
        }),
      });
      emailed = resp.ok;
    } catch {
      emailed = false;
    }
  }

  revalidatePath("/[locale]/(dashboard)/users", "page");
  return actionOk({ id: inv.id as string, url, emailed });
}

export async function revokeInvitation(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = InvitationIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "invitation");
  if (error) return permissionError("delete", "invitation");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("user_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "invitation_revoked",
    p_target_type: "invitation",
    p_target_id: parsed.data.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/users", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Existing users (public.users rows)
// ─────────────────────────────────────────────

export async function updateUser(
  input: UpdateUserInput,
): Promise<ActionResult<void>> {
  const parsed = UpdateUserSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionError(issue?.message ?? "invalid", issue?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("update", "user");
  if (error) return permissionError("update", "user");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("users")
    .update({
      role: parsed.data.role,
      department: parsed.data.department ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "user_updated",
    p_target_type: "user",
    p_target_id: parsed.data.id,
    p_payload: { role: parsed.data.role, department: parsed.data.department ?? null },
  });

  revalidatePath("/[locale]/(dashboard)/users", "page");
  return actionOk(undefined);
}

export async function archiveUser(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = UserIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "user");
  if (error) return permissionError("delete", "user");

  // Block self-archive to avoid a club_admin accidentally locking themselves
  // out of their own org.
  if (parsed.data.id === tenant!.user_id) return actionError("self-archive", "id");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("users")
    .update({ active: false })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "user_archived",
    p_target_type: "user",
    p_target_id: parsed.data.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/users", "page");
  return actionOk(undefined);
}

export async function restoreUser(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = UserIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "user");
  if (error) return permissionError("update", "user");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("users")
    .update({ active: true })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "user_restored",
    p_target_type: "user",
    p_target_id: parsed.data.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/users", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Invitation acceptance (called from /accept-invite/[token]/page.tsx)
// ─────────────────────────────────────────────

export async function acceptInvitation(
  input: { token: string },
): Promise<ActionResult<{ org_slug: string }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return actionError("no-session");

  // Service-role: the invitee's JWT has no org_id yet, so the tenant RLS
  // policy blocks reading the invitations table from the user context.
  const admin = createServiceRoleClient();

  const { data: inv } = await admin
    .from("user_invitations")
    .select("id, org_id, email, role, department, expires_at, accepted_at, revoked_at")
    .eq("token", input.token)
    .maybeSingle();
  if (!inv) return actionError("invalid-token");
  if (inv.revoked_at) return actionError("invalid-token");
  if (inv.accepted_at) return actionError("accepted");
  if (new Date(inv.expires_at).getTime() < Date.now()) return actionError("expired");
  if (inv.email.toLowerCase() !== user.email.toLowerCase()) {
    return actionError("wrong-account");
  }

  // Insert or update the public.users row. The user might already exist if
  // they were previously archived — we re-activate them with the new role.
  const { error: upsertErr } = await admin.from("users").upsert(
    {
      id: user.id,
      org_id: inv.org_id,
      email: user.email,
      role: inv.role,
      department: inv.department,
      active: true,
    },
    { onConflict: "id" },
  );
  if (upsertErr) return actionError(upsertErr.message);

  await admin
    .from("user_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  // Resolve the org slug so the caller can redirect into the right tenant.
  const { data: org } = await admin
    .from("organizations")
    .select("slug")
    .eq("id", inv.org_id)
    .single();

  // Audit via service-role so the row's org_id resolves correctly even
  // though the JWT doesn't carry it yet. Bypasses the helper RPC which
  // reads org_id from the JWT.
  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: inv.role,
    org_id: inv.org_id,
    action: "invitation_accepted",
    target_type: "invitation",
    target_id: inv.id,
    payload_jsonb: { email: user.email },
  });

  return actionOk({ org_slug: org?.slug ?? "" });
}
