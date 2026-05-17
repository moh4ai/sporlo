"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";
import { EVT, recordEvent } from "@sporlo/governance";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import { refundPayment as moyasarRefund } from "@/lib/moyasar";

import {
  DisclosureSubmitSchema,
  PaymentMethodCreateSchema,
  PaymentMethodToggleSchema,
  PaymentMethodUpdateSchema,
  RefundDecisionSchema,
  RefundRejectSchema,
  RefundRequestSchema,
  type DisclosureSubmitInput,
  type PaymentMethodCreateInput,
  type PaymentMethodToggleInput,
  type PaymentMethodUpdateInput,
  type RefundDecisionInput,
  type RefundRejectInput,
  type RefundRequestInput,
} from "./validation";

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
// Payment methods
// ─────────────────────────────────────────────

export async function createPaymentMethod(
  input: PaymentMethodCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = PaymentMethodCreateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("create", "finance");
  if (error) return permissionError("create", "finance");

  const supabase = await createSupabaseServerClient();
  const { data, error: insertErr } = await supabase
    .from("payment_methods")
    .insert({
      org_id: tenant!.org_id,
      label: parsed.data.label,
      type: parsed.data.type,
      details_jsonb: parsed.data.details ? { note: parsed.data.details } : {},
      active: parsed.data.active,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") return actionError("label-exists", "label");
    return actionError(insertErr.message);
  }

  await supabase.rpc("record_audit", {
    p_action: "payment_method_created",
    p_target_type: "payment_method",
    p_target_id: data!.id,
    p_payload: { label: parsed.data.label, type: parsed.data.type },
  });

  revalidatePath("/[locale]/(dashboard)/finance/methods", "page");
  return actionOk({ id: data!.id as string });
}

export async function updatePaymentMethod(
  input: PaymentMethodUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = PaymentMethodUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "finance");
  if (error) return permissionError("update", "finance");

  const supabase = await createSupabaseServerClient();
  const { id, ...patch } = parsed.data;
  const { error: updErr } = await supabase
    .from("payment_methods")
    .update({
      label: patch.label,
      type: patch.type,
      details_jsonb: patch.details ? { note: patch.details } : {},
      active: patch.active,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);

  if (updErr) {
    if (updErr.code === "23505") return actionError("label-exists", "label");
    return actionError(updErr.message);
  }

  await supabase.rpc("record_audit", {
    p_action: "payment_method_updated",
    p_target_type: "payment_method",
    p_target_id: id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/finance/methods", "page");
  return actionOk(undefined);
}

export async function setPaymentMethodActive(
  input: PaymentMethodToggleInput,
): Promise<ActionResult<void>> {
  const parsed = PaymentMethodToggleSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "finance");
  if (error) return permissionError("update", "finance");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("payment_methods")
    .update({ active: parsed.data.active })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: parsed.data.active ? "payment_method_enabled" : "payment_method_disabled",
    p_target_type: "payment_method",
    p_target_id: parsed.data.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/finance/methods", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Refunds — request / approve / reject workflow
// ─────────────────────────────────────────────

export async function requestRefund(
  input: RefundRequestInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = RefundRequestSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("refund", "payment");
  if (error) return permissionError("refund", "payment");

  const supabase = await createSupabaseServerClient();
  const { data: pay } = await supabase
    .from("payments")
    .select("id, amount_sar, status, provider")
    .eq("id", parsed.data.payment_id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!pay) return actionError("payment-not-found");
  if (pay.status !== "paid") return actionError("payment-not-paid");
  if (Number(parsed.data.amount_sar) > Number(pay.amount_sar)) {
    return actionError("amount-exceeds-payment", "amount_sar");
  }

  const { data, error: insertErr } = await supabase
    .from("refunds")
    .insert({
      org_id: tenant!.org_id,
      payment_id: parsed.data.payment_id,
      amount_sar: parsed.data.amount_sar,
      reason: parsed.data.reason ?? null,
      status: "requested",
      requested_by: tenant!.user_id,
    })
    .select("id")
    .single();
  if (insertErr || !data) return actionError(insertErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "refund_requested",
    p_target_type: "refund",
    p_target_id: data.id,
    p_payload: { payment_id: parsed.data.payment_id, amount_sar: parsed.data.amount_sar },
  });

  revalidatePath("/[locale]/(dashboard)/finance/refunds", "page");
  return actionOk({ id: data.id as string });
}

export async function approveRefund(
  input: RefundDecisionInput,
): Promise<ActionResult<void>> {
  const parsed = RefundDecisionSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("approve", "refund");
  if (error) return permissionError("approve", "refund");

  const supabase = await createSupabaseServerClient();
  const { data: ref } = await supabase
    .from("refunds")
    .select("id, payment_id, amount_sar, status")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!ref) return actionError("refund-not-found");
  if (ref.status !== "requested") return actionError("refund-not-pending");

  const { data: pay } = await supabase
    .from("payments")
    .select("id, member_id, subscription_id, provider, provider_payment_id, status")
    .eq("id", ref.payment_id)
    .maybeSingle();
  if (!pay) return actionError("payment-not-found");

  // Mark refund approved upfront (audit trail).
  const admin = createServiceRoleClient();
  await admin
    .from("refunds")
    .update({ status: "approved", approved_by: tenant!.user_id })
    .eq("id", ref.id);

  // Execute external refund if Moyasar.
  if (pay.provider === "moyasar" && pay.provider_payment_id) {
    try {
      await moyasarRefund(pay.provider_payment_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "moyasar-refund-failed";
      await admin
        .from("refunds")
        .update({ status: "failed", failure_reason: msg })
        .eq("id", ref.id);
      return actionError(`moyasar:${msg}`);
    }
  }

  // Mark payment refunded + refund completed.
  await admin.from("payments").update({ status: "refunded" }).eq("id", pay.id);
  await admin
    .from("refunds")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("id", ref.id);

  await recordEvent({
    client: admin,
    org_id: tenant!.org_id,
    definition: EVT.REFUND_PROCESSED,
    quantitative_value: -Number(ref.amount_sar),
    qualitative_payload: { refund_id: ref.id, payment_id: pay.id },
  });
  await admin.from("audit_logs").insert({
    actor_user_id: tenant!.user_id,
    actor_role: tenant!.user_role,
    org_id: tenant!.org_id,
    action: "refund_approved",
    target_type: "refund",
    target_id: ref.id,
    payload_jsonb: { payment_id: pay.id, amount_sar: Number(ref.amount_sar) },
  });

  if (pay.member_id) {
    revalidatePath(`/[locale]/(dashboard)/memberships/members/${pay.member_id}`, "page");
  }
  revalidatePath("/[locale]/(dashboard)/finance/refunds", "page");
  revalidatePath("/[locale]/(dashboard)/memberships/subscriptions", "page");
  return actionOk(undefined);
}

export async function rejectRefund(
  input: RefundRejectInput,
): Promise<ActionResult<void>> {
  const parsed = RefundRejectSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("approve", "refund");
  if (error) return permissionError("approve", "refund");

  const supabase = await createSupabaseServerClient();
  const { data: ref } = await supabase
    .from("refunds")
    .select("id, status")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!ref) return actionError("refund-not-found");
  if (ref.status !== "requested") return actionError("refund-not-pending");

  await supabase
    .from("refunds")
    .update({
      status: "rejected",
      approved_by: tenant!.user_id,
      failure_reason: parsed.data.reason ?? null,
    })
    .eq("id", ref.id);

  await supabase.rpc("record_audit", {
    p_action: "refund_rejected",
    p_target_type: "refund",
    p_target_id: ref.id,
    p_payload: { reason: parsed.data.reason ?? null },
  });

  revalidatePath("/[locale]/(dashboard)/finance/refunds", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Quarterly disclosures
// ─────────────────────────────────────────────

export async function submitQuarterlyDisclosure(
  input: DisclosureSubmitInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = DisclosureSubmitSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid", first?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("create", "governance_document");
  if (error) return permissionError("create", "governance_document");

  const supabase = await createSupabaseServerClient();

  // Upsert the governance_documents row first (links to the storage path).
  const { data: doc, error: docErr } = await supabase
    .from("governance_documents")
    .insert({
      org_id: tenant!.org_id,
      quarter: parsed.data.quarter,
      document_type: "quarterly_disclosure",
      title_ar: `إفصاح ${parsed.data.quarter}`,
      storage_path: parsed.data.storage_path ?? null,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (docErr || !doc) return actionError(docErr?.message ?? "doc-insert-failed");

  // Quarterly disclosure row links to it.
  let totalsParsed: Record<string, unknown> = {};
  if (parsed.data.totals) {
    try {
      const obj = JSON.parse(parsed.data.totals);
      if (obj && typeof obj === "object") totalsParsed = obj;
    } catch {
      // Keep empty; the raw text is preserved in notes if user wants.
    }
  }

  const { data: disclosure, error: disErr } = await supabase
    .from("quarterly_disclosures")
    .upsert(
      {
        org_id: tenant!.org_id,
        quarter: parsed.data.quarter,
        totals_jsonb: totalsParsed,
        document_id: doc.id,
        submitted_at: new Date().toISOString(),
        submitted_by: tenant!.user_id,
        notes: parsed.data.notes ?? null,
      },
      { onConflict: "org_id,quarter" },
    )
    .select("id")
    .single();
  if (disErr || !disclosure) return actionError(disErr?.message ?? "disclosure-failed");

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.DISCLOSURE_SUBMITTED,
    qualitative_payload: {
      disclosure_id: disclosure.id,
      quarter: parsed.data.quarter,
    },
  });

  await supabase.rpc("record_audit", {
    p_action: "disclosure_submitted",
    p_target_type: "quarterly_disclosure",
    p_target_id: disclosure.id,
    p_payload: { quarter: parsed.data.quarter, document_id: doc.id },
  });

  revalidatePath("/[locale]/(dashboard)/finance/disclosures", "page");
  return actionOk({ id: disclosure.id as string });
}

// ─────────────────────────────────────────────
// Storage signed-URL minter for the governance-documents bucket
// ─────────────────────────────────────────────

export async function createDisclosureUploadUrl(input: {
  filename: string;
}): Promise<ActionResult<{ path: string; signed_url: string; token: string }>> {
  const filename = (input?.filename ?? "").trim();
  if (!filename) return actionError("filename-required");
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
  const { tenant, error } = await withPrincipal("create", "governance_document");
  if (error) return permissionError("create", "governance_document");

  const path = `${tenant!.org_id}/disclosures/${Date.now()}-${safe}`;
  const admin = createServiceRoleClient();
  const { data, error: signErr } = await admin.storage
    .from("governance-documents")
    .createSignedUploadUrl(path);
  if (signErr || !data) return actionError(signErr?.message ?? "sign-failed");
  return actionOk({ path, signed_url: data.signedUrl, token: data.token });
}
