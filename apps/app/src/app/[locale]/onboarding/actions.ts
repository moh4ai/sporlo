"use server";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";

export interface OnboardingPayload {
  slug: string;
  name_ar: string;
  name_en: string;
  primary_color: string | null;
  departments: string[];
}

export interface OnboardingResult {
  ok: boolean;
  error?: string;
}

export async function completeOnboarding(
  payload: OnboardingPayload,
): Promise<OnboardingResult> {
  const ssr = await createSupabaseServerClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return { ok: false, error: "no-session" };

  if (!/^[a-z0-9-]{3,40}$/.test(payload.slug)) {
    return { ok: false, error: "invalid-slug" };
  }
  if (!payload.name_ar.trim() || !payload.name_en.trim()) {
    return { ok: false, error: "missing-name" };
  }

  // Service role bypasses RLS — required because the new user has no org_id
  // claim yet, so the tenant_isolation policy would block their first inserts.
  const admin = createServiceRoleClient();

  // Block duplicate slugs early to give a clean error message.
  const { data: clash } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", payload.slug)
    .maybeSingle();
  if (clash) return { ok: false, error: "slug-taken" };

  const branding =
    payload.primary_color && payload.primary_color !== ""
      ? { primary_color: payload.primary_color }
      : {};

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      slug: payload.slug,
      name_ar: payload.name_ar.trim(),
      name_en: payload.name_en.trim(),
      subdomain: payload.slug,
      branding_overrides_jsonb: branding,
    })
    .select("id")
    .single();
  if (orgErr || !org) return { ok: false, error: "org-insert-failed" };

  const { error: branchErr } = await admin.from("branches").insert({
    org_id: org.id,
    name_ar: payload.name_ar.trim(),
    name_en: payload.name_en.trim(),
  });
  if (branchErr) return { ok: false, error: "branch-insert-failed" };

  const { error: userErr } = await admin.from("users").insert({
    id: user.id,
    org_id: org.id,
    email: user.email ?? null,
    role: "club_admin",
  });
  if (userErr) return { ok: false, error: "user-insert-failed" };

  // Force the access token to refresh on the next sign-in so the auth hook
  // picks up the new org_id/role. The simplest way is to ask the client to
  // call supabase.auth.refreshSession() — the wizard does this before redirect.
  return { ok: true };
}
