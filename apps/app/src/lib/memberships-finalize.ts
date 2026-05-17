// Server-only (not "use server"). Internal helpers shared between
// Server Actions and Route Handlers. Importing this file from a client
// component would fail because it touches process.env via the supabase client.

import { EVT, recordEvent } from "@sporlo/governance";

import { createServiceRoleClient } from "@/lib/supabase-server";

export function addMonthsIso(start: Date, months: number): string {
  const d = new Date(start);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

// Called from the Moyasar callback + webhook to mark a payment paid and
// transition the subscription. Idempotent: re-running on an already-paid
// payment is a no-op. Uses service-role because callbacks/webhooks arrive
// without a user session.
export async function finalizeMoyasarPayment(args: {
  paymentId: string;
  provider_payment_id: string;
  amount_sar: number;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createServiceRoleClient();

  const { data: pay } = await admin
    .from("payments")
    .select("id, org_id, status, subscription_id, member_id")
    .eq("id", args.paymentId)
    .maybeSingle();
  if (!pay) return { ok: false, error: "payment-not-found" };
  if (pay.status === "paid") return { ok: true };

  const now = new Date();
  await admin
    .from("payments")
    .update({
      status: "paid",
      paid_at: now.toISOString(),
      provider_payment_id: args.provider_payment_id,
      amount_sar: args.amount_sar,
    })
    .eq("id", pay.id);

  if (pay.subscription_id) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, status, plan_id, member_id")
      .eq("id", pay.subscription_id)
      .maybeSingle();
    if (sub) {
      const { data: plan } = await admin
        .from("plans")
        .select("duration_months")
        .eq("id", sub.plan_id)
        .maybeSingle();
      const months = Number(plan?.duration_months ?? 1);
      const isRenewal = sub.status === "active" || sub.status === "expired";
      await admin
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
        client: admin,
        org_id: pay.org_id,
        definition: isRenewal
          ? EVT.SUBSCRIPTION_RENEWED
          : EVT.SUBSCRIPTION_STARTED,
        quantitative_value: args.amount_sar,
        qualitative_payload: {
          subscription_id: sub.id,
          method: "moyasar",
        },
      });
      await recordEvent({
        client: admin,
        org_id: pay.org_id,
        definition: EVT.REVENUE_RECORDED,
        quantitative_value: args.amount_sar,
        qualitative_payload: {
          subscription_id: sub.id,
          method: "moyasar",
        },
      });
    }
  }

  await admin.from("audit_logs").insert({
    actor_user_id: null,
    actor_role: "system",
    org_id: pay.org_id,
    action: "payment_paid_via_moyasar",
    target_type: "payment",
    target_id: pay.id,
    payload_jsonb: { provider_payment_id: args.provider_payment_id },
  });

  return { ok: true };
}

export async function markMoyasarPaymentFailed(args: {
  paymentId: string;
  reason: string;
}): Promise<void> {
  const admin = createServiceRoleClient();
  await admin
    .from("payments")
    .update({ status: "failed", failure_reason: args.reason })
    .eq("id", args.paymentId);
}
