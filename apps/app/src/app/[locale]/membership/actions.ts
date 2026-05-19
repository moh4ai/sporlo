"use server";

import { actionError, actionOk, type ActionResult } from "@sporlo/shared";

import { createServiceRoleClient, createSupabaseServerClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";

// Ensure a public.users + public.members row exists for the signed-in user
// tied to the current tenant cookie. Idempotent: re-running for the same user
// is a no-op once both rows exist.
//
// public.users is what the JWT auth hook reads to populate user_role/org_id
// claims. Without this row, the JWT never gets `user_role: "member"` and the
// /me layout would loop back to sign-in. The caller is expected to refresh
// the session after this returns so the new claims land in the access token.
export async function ensureMemberRow(): Promise<ActionResult<{ member_id: string }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("no-session");

  const tenant = await resolvePublicTenant();
  if (!tenant) return actionError("no-tenant");

  const admin = createServiceRoleClient();

  await admin
    .from("users")
    .upsert(
      { id: user.id, org_id: tenant.org_id, email: user.email ?? null, role: "member" },
      { onConflict: "id" },
    );

  const { data: existing } = await admin
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .eq("org_id", tenant.org_id)
    .maybeSingle();
  if (existing) return actionOk({ member_id: existing.id as string });

  const fallbackName = user.email ?? "New member";
  const { data: inserted, error: insertErr } = await admin
    .from("members")
    .insert({
      org_id: tenant.org_id,
      user_id: user.id,
      full_name_ar: fallbackName,
      full_name_en: fallbackName,
      email: user.email ?? null,
      status: "active",
    })
    .select("id")
    .single();
  if (insertErr || !inserted) return actionError("member-insert-failed");

  return actionOk({ member_id: inserted.id as string });
}

// Member-facing subscribe — mirrors the staff `startSubscription` but skips
// the dashboard permission check and resolves the tenant from the cookie set
// by middleware. Returns the payment id so the caller can either hand off to
// Moyasar or land back at /me for manual flows.
export async function startMemberSubscription(input: {
  plan_code: string;
  payment_method: "manual" | "moyasar";
}): Promise<
  ActionResult<{
    subscription_id: string;
    payment_id: string;
    method: "manual" | "moyasar";
  }>
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("no-session");

  const tenant = await resolvePublicTenant();
  if (!tenant) return actionError("no-tenant");

  const ensured = await ensureMemberRow();
  if (!ensured.ok) return actionError(ensured.error);

  const admin = createServiceRoleClient();

  const { data: plan } = await admin
    .from("plans")
    .select("id, price_sar, duration_months, active, public_visible")
    .eq("org_id", tenant.org_id)
    .eq("code", input.plan_code)
    .maybeSingle();
  if (!plan) return actionError("plan-not-found");
  if (!plan.active || !plan.public_visible) return actionError("plan-not-available");

  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .insert({
      org_id: tenant.org_id,
      member_id: ensured.data.member_id,
      plan_id: plan.id as string,
      status: "pending",
    })
    .select("id")
    .single();
  if (subErr || !sub) return actionError("subscription-insert-failed");

  const idempotency = `mem-sub-${sub.id}-${Date.now()}`;
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      org_id: tenant.org_id,
      subscription_id: sub.id as string,
      member_id: ensured.data.member_id,
      amount_sar: Number(plan.price_sar),
      currency: "SAR",
      status: "pending",
      provider: input.payment_method === "moyasar" ? "moyasar" : "manual",
      idempotency_key: idempotency,
    })
    .select("id")
    .single();
  if (payErr || !payment) return actionError("payment-insert-failed");

  return actionOk({
    subscription_id: sub.id as string,
    payment_id: payment.id as string,
    method: input.payment_method,
  });
}
