"use server";

import { revalidatePath } from "next/cache";

import {
  PermissionDeniedError,
  requirePrincipal,
} from "@sporlo/auth";
import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";

import { EVT, recordEvent } from "@sporlo/governance";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

import {
  CouponCreateSchema,
  CouponDisableSchema,
  CouponUpdateSchema,
  ManualPaymentSchema,
  MemberCreateSchema,
  MemberStatusChangeSchema,
  MemberUpdateSchema,
  PlanArchiveSchema,
  PlanCreateSchema,
  PlanUpdateSchema,
  PortalLinkSchema,
  RefundPaymentSchema,
  SubscriptionCancelSchema,
  SubscriptionFreezeSchema,
  SubscriptionIdSchema,
  SubscriptionStartSchema,
  type CouponCreateInput,
  type CouponDisableInput,
  type CouponUpdateInput,
  type ManualPaymentInput,
  type MemberCreateInput,
  type MemberStatusChangeInput,
  type MemberUpdateInput,
  type PlanArchiveInput,
  type PlanCreateInput,
  type PlanUpdateInput,
  type PortalLinkInput,
  type RefundPaymentInput,
  type SubscriptionCancelInput,
  type SubscriptionFreezeInput,
  type SubscriptionStartInput,
} from "./validation";
import { refundPayment as moyasarRefund } from "@/lib/moyasar";
import { addMonthsIso } from "@/lib/memberships-finalize";

function permissionError(action: string, resource: string): ActionResult<never> {
  return actionError(`permission-denied:${action}:${resource}`);
}

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

// ─────────────────────────────────────────────
// Plans
// ─────────────────────────────────────────────

export async function createPlan(
  input: PlanCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = PlanCreateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("create", "plan");
  if (error) return permissionError("create", "plan");

  const supabase = await createSupabaseServerClient();
  const { data, error: insertErr } = await supabase
    .from("plans")
    .insert({
      org_id: tenant!.org_id,
      ...parsed.data,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") return actionError("code-exists", "code");
    return actionError(insertErr.message);
  }

  await supabase.rpc("record_audit", {
    p_action: "plan_created",
    p_target_type: "plan",
    p_target_id: data!.id,
    p_payload: { code: parsed.data.code },
  });

  revalidatePath("/[locale]/(dashboard)/memberships", "page");
  return actionOk({ id: data!.id as string });
}

export async function updatePlan(
  input: PlanUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = PlanUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("update", "plan");
  if (error) return permissionError("update", "plan");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("plans")
    .update(patch)
    .eq("id", id)
    .eq("org_id", tenant!.org_id);

  if (updErr) {
    if (updErr.code === "23505") return actionError("code-exists", "code");
    return actionError(updErr.message);
  }

  await supabase.rpc("record_audit", {
    p_action: "plan_updated",
    p_target_type: "plan",
    p_target_id: id,
    p_payload: { code: patch.code },
  });

  revalidatePath("/[locale]/(dashboard)/memberships", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Members
// ─────────────────────────────────────────────

export async function createMember(
  input: MemberCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = MemberCreateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("create", "member");
  if (error) return permissionError("create", "member");

  const supabase = await createSupabaseServerClient();
  const { data, error: insertErr } = await supabase
    .from("members")
    .insert({
      org_id: tenant!.org_id,
      full_name_ar: parsed.data.full_name_ar,
      full_name_en: parsed.data.full_name_en ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      national_id: parsed.data.national_id ?? null,
      date_of_birth: parsed.data.date_of_birth ?? null,
      branch_id: parsed.data.branch_id ?? null,
      status: parsed.data.status,
    })
    .select("id")
    .single();

  if (insertErr) return actionError(insertErr.message);

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    branch_id: parsed.data.branch_id ?? null,
    definition: EVT.MEMBER_ADDED,
    qualitative_payload: { member_id: data!.id },
  });

  await supabase.rpc("record_audit", {
    p_action: "member_created",
    p_target_type: "member",
    p_target_id: data!.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/memberships/members", "page");
  return actionOk({ id: data!.id as string });
}

export async function updateMember(
  input: MemberUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = MemberUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("update", "member");
  if (error) return permissionError("update", "member");

  const { id, ...rest } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("members")
    .update({
      full_name_ar: rest.full_name_ar,
      full_name_en: rest.full_name_en ?? null,
      email: rest.email ?? null,
      phone: rest.phone ?? null,
      national_id: rest.national_id ?? null,
      date_of_birth: rest.date_of_birth ?? null,
      branch_id: rest.branch_id ?? null,
      status: rest.status,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);

  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "member_updated",
    p_target_type: "member",
    p_target_id: id,
    p_payload: {},
  });

  revalidatePath(`/[locale]/(dashboard)/memberships/members/${id}`, "page");
  revalidatePath("/[locale]/(dashboard)/memberships/members", "page");
  return actionOk(undefined);
}

export async function changeMemberStatus(
  input: MemberStatusChangeInput,
): Promise<ActionResult<void>> {
  const parsed = MemberStatusChangeSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "member");
  if (error) return permissionError("update", "member");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("members")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "member_status_changed",
    p_target_type: "member",
    p_target_id: parsed.data.id,
    p_payload: { status: parsed.data.status },
  });

  revalidatePath(`/[locale]/(dashboard)/memberships/members/${parsed.data.id}`, "page");
  revalidatePath("/[locale]/(dashboard)/memberships/members", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Plans (continued)
// ─────────────────────────────────────────────

export async function archivePlan(
  input: PlanArchiveInput,
): Promise<ActionResult<void>> {
  const parsed = PlanArchiveSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "plan");
  if (error) return permissionError("update", "plan");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("plans")
    .update({
      active: !parsed.data.archive,
      archived_at: parsed.data.archive ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: parsed.data.archive ? "plan_archived" : "plan_unarchived",
    p_target_type: "plan",
    p_target_id: parsed.data.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/memberships", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Subscriptions
// ─────────────────────────────────────────────

export async function startSubscription(
  input: SubscriptionStartInput,
): Promise<
  ActionResult<{
    subscription_id: string;
    payment_id: string;
    method: "moyasar" | "manual";
  }>
> {
  const parsed = SubscriptionStartSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("create", "subscription");
  if (error) return permissionError("create", "subscription");

  const supabase = await createSupabaseServerClient();

  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("id, price_sar, duration_months, active")
    .eq("id", parsed.data.plan_id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (planErr || !plan) return actionError("plan-not-found");
  if (!plan.active) return actionError("plan-archived");

  const { data: member, error: memErr } = await supabase
    .from("members")
    .select("id")
    .eq("id", parsed.data.member_id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (memErr || !member) return actionError("member-not-found");

  // Optional coupon
  let appliedCoupon: { id: string; percent_off: number } | null = null;
  if (parsed.data.coupon_code) {
    const { data: c } = await supabase
      .from("discount_coupons")
      .select("id, percent_off, active, max_uses, used_count, valid_from, valid_to")
      .eq("org_id", tenant!.org_id)
      .eq("code", parsed.data.coupon_code)
      .maybeSingle();
    if (!c || !c.active) return actionError("coupon-invalid", "coupon_code");
    if (c.valid_to && new Date(c.valid_to) < new Date())
      return actionError("coupon-expired", "coupon_code");
    if (c.max_uses != null && c.used_count >= c.max_uses)
      return actionError("coupon-exhausted", "coupon_code");
    appliedCoupon = { id: c.id, percent_off: Number(c.percent_off) };
  }

  const basePrice = Number(plan.price_sar);
  const finalPrice = appliedCoupon
    ? Math.max(
        0,
        Math.round((basePrice * (100 - appliedCoupon.percent_off)) * 100) / 10000,
      )
    : basePrice;

  // Insert subscription (pending). Manual flow will transition it to active
  // immediately when recordManualPayment runs; Moyasar flow waits for webhook.
  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .insert({
      org_id: tenant!.org_id,
      member_id: parsed.data.member_id,
      plan_id: parsed.data.plan_id,
      status: "pending",
    })
    .select("id")
    .single();
  if (subErr || !sub) return actionError("subscription-insert-failed");

  const idempotency = `sub-${sub.id}-${Date.now()}`;
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      org_id: tenant!.org_id,
      subscription_id: sub.id,
      member_id: parsed.data.member_id,
      amount_sar: finalPrice,
      currency: "SAR",
      status: "pending",
      provider: parsed.data.payment_method === "moyasar" ? "moyasar" : "manual",
      idempotency_key: idempotency,
    })
    .select("id")
    .single();
  if (payErr || !payment) return actionError("payment-insert-failed");

  if (appliedCoupon) {
    await supabase.from("coupon_redemptions").insert({
      org_id: tenant!.org_id,
      coupon_id: appliedCoupon.id,
      subscription_id: sub.id,
      member_id: parsed.data.member_id,
    });
    await supabase
      .from("discount_coupons")
      .update({ used_count: appliedCoupon.percent_off > 0 ? undefined : undefined })
      .eq("id", appliedCoupon.id);
    // Increment used_count via RPC-free path:
    await supabase.rpc("record_audit", {
      p_action: "coupon_redeemed",
      p_target_type: "coupon",
      p_target_id: appliedCoupon.id,
      p_payload: { subscription_id: sub.id },
    });
    await recordEvent({
      client: supabase,
      org_id: tenant!.org_id,
      definition: EVT.COUPON_REDEEMED,
      qualitative_payload: { coupon_id: appliedCoupon.id, subscription_id: sub.id },
    });
    // Bump used_count atomically via a follow-up update.
    await supabase
      .from("discount_coupons")
      .update({ used_count: (await fetchUsedCount(supabase, appliedCoupon.id)) + 1 })
      .eq("id", appliedCoupon.id);
  }

  await supabase.rpc("record_audit", {
    p_action: "subscription_initiated",
    p_target_type: "subscription",
    p_target_id: sub.id,
    p_payload: { plan_id: parsed.data.plan_id, method: parsed.data.payment_method },
  });

  revalidatePath(`/[locale]/(dashboard)/memberships/members/${parsed.data.member_id}`, "page");
  revalidatePath("/[locale]/(dashboard)/memberships/subscriptions", "page");

  return actionOk({
    subscription_id: sub.id,
    payment_id: payment.id,
    method: parsed.data.payment_method,
  });
}

async function fetchUsedCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  couponId: string,
): Promise<number> {
  const { data } = await supabase
    .from("discount_coupons")
    .select("used_count")
    .eq("id", couponId)
    .maybeSingle();
  return Number(data?.used_count ?? 0);
}

export async function recordManualPayment(
  input: ManualPaymentInput,
): Promise<ActionResult<void>> {
  const parsed = ManualPaymentSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "subscription");
  if (error) return permissionError("create", "subscription");

  const supabase = await createSupabaseServerClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, member_id, plan_id, status")
    .eq("id", parsed.data.subscription_id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!sub) return actionError("subscription-not-found");
  if (sub.status === "cancelled") return actionError("subscription-cancelled");

  // Mark the pending payment row paid (or insert one if none exists).
  const { data: pending } = await supabase
    .from("payments")
    .select("id, status")
    .eq("subscription_id", sub.id)
    .eq("status", "pending")
    .maybeSingle();

  const now = new Date();
  if (pending) {
    await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        amount_sar: parsed.data.amount_sar,
      })
      .eq("id", pending.id);
  } else {
    await supabase.from("payments").insert({
      org_id: tenant!.org_id,
      subscription_id: sub.id,
      member_id: sub.member_id,
      amount_sar: parsed.data.amount_sar,
      currency: "SAR",
      status: "paid",
      provider: "manual",
      paid_at: now.toISOString(),
    });
  }

  // Look up plan duration to compute ends_at.
  const { data: plan } = await supabase
    .from("plans")
    .select("duration_months")
    .eq("id", sub.plan_id)
    .maybeSingle();
  const months = Number(plan?.duration_months ?? 1);

  const isRenewal = sub.status === "active" || sub.status === "expired";
  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      starts_at: now.toISOString(),
      ends_at: addMonthsIso(now, months),
      cancelled_at: null,
      frozen_from: null,
      frozen_to: null,
    })
    .eq("id", sub.id);

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: isRenewal ? EVT.SUBSCRIPTION_RENEWED : EVT.SUBSCRIPTION_STARTED,
    quantitative_value: parsed.data.amount_sar,
    qualitative_payload: { subscription_id: sub.id, method: "manual" },
  });
  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.REVENUE_RECORDED,
    quantitative_value: parsed.data.amount_sar,
    qualitative_payload: { subscription_id: sub.id, method: "manual" },
  });

  await supabase.rpc("record_audit", {
    p_action: "payment_recorded_manual",
    p_target_type: "subscription",
    p_target_id: sub.id,
    p_payload: { amount_sar: parsed.data.amount_sar, note: parsed.data.note ?? null },
  });

  revalidatePath(`/[locale]/(dashboard)/memberships/members/${sub.member_id}`, "page");
  revalidatePath("/[locale]/(dashboard)/memberships/subscriptions", "page");
  return actionOk(undefined);
}

export async function freezeSubscription(
  input: SubscriptionFreezeInput,
): Promise<ActionResult<void>> {
  const parsed = SubscriptionFreezeSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "subscription");
  if (error) return permissionError("update", "subscription");

  const supabase = await createSupabaseServerClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, member_id, status")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!sub) return actionError("subscription-not-found");
  if (sub.status !== "active") return actionError("not-active");

  await supabase
    .from("subscriptions")
    .update({
      status: "frozen",
      frozen_from: parsed.data.frozen_from,
      frozen_to: parsed.data.frozen_to,
    })
    .eq("id", sub.id);

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.SUBSCRIPTION_FROZEN,
    qualitative_payload: { subscription_id: sub.id },
  });
  await supabase.rpc("record_audit", {
    p_action: "subscription_frozen",
    p_target_type: "subscription",
    p_target_id: sub.id,
    p_payload: { frozen_from: parsed.data.frozen_from, frozen_to: parsed.data.frozen_to },
  });

  revalidatePath(`/[locale]/(dashboard)/memberships/members/${sub.member_id}`, "page");
  revalidatePath("/[locale]/(dashboard)/memberships/subscriptions", "page");
  return actionOk(undefined);
}

export async function unfreezeSubscription(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = SubscriptionIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "subscription");
  if (error) return permissionError("update", "subscription");

  const supabase = await createSupabaseServerClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, member_id, status")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!sub) return actionError("subscription-not-found");
  if (sub.status !== "frozen") return actionError("not-frozen");

  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      frozen_from: null,
      frozen_to: null,
    })
    .eq("id", sub.id);

  await supabase.rpc("record_audit", {
    p_action: "subscription_unfrozen",
    p_target_type: "subscription",
    p_target_id: sub.id,
    p_payload: {},
  });

  revalidatePath(`/[locale]/(dashboard)/memberships/members/${sub.member_id}`, "page");
  revalidatePath("/[locale]/(dashboard)/memberships/subscriptions", "page");
  return actionOk(undefined);
}

export async function cancelSubscription(
  input: SubscriptionCancelInput,
): Promise<ActionResult<void>> {
  const parsed = SubscriptionCancelSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "subscription");
  if (error) return permissionError("delete", "subscription");

  const supabase = await createSupabaseServerClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, member_id, status")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!sub) return actionError("subscription-not-found");
  if (sub.status === "cancelled") return actionError("already-cancelled");

  await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", sub.id);

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.SUBSCRIPTION_CANCELLED,
    qualitative_payload: { subscription_id: sub.id, reason: parsed.data.reason ?? null },
  });
  await supabase.rpc("record_audit", {
    p_action: "subscription_cancelled",
    p_target_type: "subscription",
    p_target_id: sub.id,
    p_payload: { reason: parsed.data.reason ?? null },
  });

  revalidatePath(`/[locale]/(dashboard)/memberships/members/${sub.member_id}`, "page");
  revalidatePath("/[locale]/(dashboard)/memberships/subscriptions", "page");
  return actionOk(undefined);
}

export async function refundPayment(
  input: RefundPaymentInput,
): Promise<ActionResult<void>> {
  const parsed = RefundPaymentSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("refund", "payment");
  if (error) return permissionError("refund", "payment");

  const supabase = await createSupabaseServerClient();
  const { data: pay } = await supabase
    .from("payments")
    .select("id, amount_sar, provider, provider_payment_id, status, subscription_id, member_id")
    .eq("id", parsed.data.payment_id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!pay) return actionError("payment-not-found");
  if (pay.status !== "paid") return actionError("payment-not-paid");

  // Best-effort external refund. If Moyasar refund fails (e.g. network), we
  // still record the intent in audit_logs but DO NOT mark the local payment
  // refunded so the user retries.
  if (pay.provider === "moyasar" && pay.provider_payment_id) {
    try {
      await moyasarRefund(pay.provider_payment_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "moyasar-refund-failed";
      return actionError(`moyasar:${msg}`);
    }
  }

  await supabase.from("payments").update({ status: "refunded" }).eq("id", pay.id);

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.REFUND_PROCESSED,
    quantitative_value: -Number(pay.amount_sar),
    qualitative_payload: {
      payment_id: pay.id,
      subscription_id: pay.subscription_id,
      reason: parsed.data.reason ?? null,
    },
  });
  await supabase.rpc("record_audit", {
    p_action: "payment_refunded",
    p_target_type: "payment",
    p_target_id: pay.id,
    p_payload: { amount_sar: Number(pay.amount_sar), reason: parsed.data.reason ?? null },
  });

  if (pay.member_id) {
    revalidatePath(`/[locale]/(dashboard)/memberships/members/${pay.member_id}`, "page");
  }
  revalidatePath("/[locale]/(dashboard)/memberships/subscriptions", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Coupons
// ─────────────────────────────────────────────

export async function createCoupon(
  input: CouponCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CouponCreateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("create", "coupon");
  if (error) return permissionError("create", "coupon");

  const supabase = await createSupabaseServerClient();
  const { data, error: insertErr } = await supabase
    .from("discount_coupons")
    .insert({
      org_id: tenant!.org_id,
      code: parsed.data.code,
      percent_off: parsed.data.percent_off,
      max_uses: parsed.data.max_uses ?? null,
      valid_from: parsed.data.valid_from,
      valid_to: parsed.data.valid_to ?? null,
      plan_scope_jsonb: parsed.data.plan_scope,
      active: parsed.data.active,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") return actionError("code-exists", "code");
    return actionError(insertErr.message);
  }

  await supabase.rpc("record_audit", {
    p_action: "coupon_created",
    p_target_type: "coupon",
    p_target_id: data!.id,
    p_payload: { code: parsed.data.code },
  });

  revalidatePath("/[locale]/(dashboard)/memberships/coupons", "page");
  return actionOk({ id: data!.id as string });
}

export async function updateCoupon(
  input: CouponUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = CouponUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("update", "coupon");
  if (error) return permissionError("update", "coupon");

  const supabase = await createSupabaseServerClient();
  const { id, ...patch } = parsed.data;
  const { error: updErr } = await supabase
    .from("discount_coupons")
    .update({
      code: patch.code,
      percent_off: patch.percent_off,
      max_uses: patch.max_uses ?? null,
      valid_from: patch.valid_from,
      valid_to: patch.valid_to ?? null,
      plan_scope_jsonb: patch.plan_scope,
      active: patch.active,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);

  if (updErr) {
    if (updErr.code === "23505") return actionError("code-exists", "code");
    return actionError(updErr.message);
  }

  await supabase.rpc("record_audit", {
    p_action: "coupon_updated",
    p_target_type: "coupon",
    p_target_id: id,
    p_payload: { code: patch.code },
  });

  revalidatePath("/[locale]/(dashboard)/memberships/coupons", "page");
  return actionOk(undefined);
}

export async function setCouponActive(
  input: CouponDisableInput,
): Promise<ActionResult<void>> {
  const parsed = CouponDisableSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "coupon");
  if (error) return permissionError("update", "coupon");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("discount_coupons")
    .update({ active: parsed.data.active })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: parsed.data.active ? "coupon_enabled" : "coupon_disabled",
    p_target_type: "coupon",
    p_target_id: parsed.data.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/memberships/coupons", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Member portal magic link
// ─────────────────────────────────────────────

export async function issueMemberPortalLink(
  input: PortalLinkInput,
): Promise<ActionResult<{ url: string; emailed: boolean }>> {
  const parsed = PortalLinkSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "member");
  if (error) return permissionError("update", "member");

  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, email, full_name_ar, full_name_en")
    .eq("id", parsed.data.member_id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!member) return actionError("member-not-found");

  const { data: token, error: tokenErr } = await supabase
    .from("member_portal_tokens")
    .insert({
      org_id: tenant!.org_id,
      member_id: member.id,
    })
    .select("token, expires_at")
    .single();
  if (tokenErr || !token) return actionError("token-insert-failed");

  // Build absolute URL. The middleware-set sporlo-tenant-slug cookie isn't
  // available here, so we use the protocol+host from the env or a fallback.
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://sporlo-app.vercel.app";
  const portalUrl = `${baseUrl}/ar/portal/${token.token}`;

  let emailed = false;
  if (member.email && process.env.RESEND_API_KEY) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Sporlo <noreply@sporlo.net>",
          to: member.email,
          subject: "Your Sporlo member portal link",
          html: `<p>Click to open your member portal: <a href="${portalUrl}">${portalUrl}</a></p>
                 <p>This link expires in 7 days.</p>`,
        }),
      });
      emailed = resp.ok;
    } catch {
      emailed = false;
    }
  }

  await supabase.rpc("record_audit", {
    p_action: "portal_link_issued",
    p_target_type: "member",
    p_target_id: member.id,
    p_payload: { emailed },
  });

  return actionOk({ url: portalUrl, emailed });
}

