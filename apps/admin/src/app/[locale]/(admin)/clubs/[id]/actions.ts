"use server";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";

export interface ImpersonateResult {
  ok: boolean;
  error?: string;
}

// Sprint 0: this writes an audit_logs row but does NOT switch sessions. Real
// impersonation (mint a scoped token for the target org, log out current
// session, log in as a service principal) lands in Phase 5.
export async function logImpersonation(
  orgId: string,
): Promise<ImpersonateResult> {
  const ssr = await createSupabaseServerClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return { ok: false, error: "no-session" };

  const admin = createServiceRoleClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: "super_admin",
    org_id: orgId,
    action: "impersonate_club_admin_attempt",
    target_type: "organization",
    target_id: orgId,
    payload_jsonb: { source: "apps/admin", note: "Sprint 0 stub" },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
