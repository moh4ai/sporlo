"use server";

import {
  actionError,
  actionOkVoid,
  UuidSchema,
  type ActionResult,
} from "@sporlo/shared";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";

// Sprint 0: writes an audit_logs row but does NOT switch sessions. Real
// impersonation (mint a scoped token for the target org) lands in Phase 5.
export async function logImpersonation(
  orgId: string,
): Promise<ActionResult<void>> {
  const parsed = UuidSchema.safeParse(orgId);
  if (!parsed.success) return actionError("invalid-org-id");

  const ssr = await createSupabaseServerClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return actionError("no-session");

  const admin = createServiceRoleClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: "super_admin",
    org_id: parsed.data,
    action: "impersonate_club_admin_attempt",
    target_type: "organization",
    target_id: parsed.data,
    payload_jsonb: { source: "apps/admin", note: "Sprint 0 stub" },
  });

  if (error) return actionError(error.message);
  return actionOkVoid();
}
