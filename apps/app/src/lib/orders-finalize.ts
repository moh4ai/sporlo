// Service-role helper to finalise an order payment via Moyasar. Idempotent.
// Transitions order pending→paid, decrements variant stock with audit-trail,
// emits KPI events.

import { EVT, recordEvent } from "@sporlo/governance";

import { createServiceRoleClient } from "@/lib/supabase-server";

export async function finalizeOrderPayment(args: {
  paymentId: string;
  provider_payment_id: string;
  amount_sar: number;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createServiceRoleClient();

  const { data: pay } = await admin
    .from("payments")
    .select("id, org_id, status")
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

  // Find the order via payment_id reference on orders.
  const { data: order } = await admin
    .from("orders")
    .select("id, status, total_sar")
    .eq("payment_id", pay.id)
    .maybeSingle();
  if (order) {
    await admin
      .from("orders")
      .update({ status: "paid", paid_at: now.toISOString() })
      .eq("id", order.id);

    // Decrement stock per item; log inventory movement.
    const { data: items } = await admin
      .from("order_items")
      .select("id, variant_id, quantity")
      .eq("order_id", order.id);
    if (items) {
      for (const it of items) {
        if (!it.variant_id) continue;
        const { data: v } = await admin
          .from("product_variants")
          .select("stock")
          .eq("id", it.variant_id)
          .maybeSingle();
        const next = Math.max(0, Number(v?.stock ?? 0) - it.quantity);
        await admin
          .from("product_variants")
          .update({ stock: next })
          .eq("id", it.variant_id);
        await admin.from("inventory_movements").insert({
          org_id: pay.org_id,
          variant_id: it.variant_id,
          delta: -it.quantity,
          reason: "order_paid",
          order_id: order.id,
        });
      }
    }

    await recordEvent({
      client: admin,
      org_id: pay.org_id,
      definition: EVT.MERCH_REVENUE,
      quantitative_value: args.amount_sar,
      qualitative_payload: { order_id: order.id },
    });
    await recordEvent({
      client: admin,
      org_id: pay.org_id,
      definition: EVT.REVENUE_RECORDED,
      quantitative_value: args.amount_sar,
      qualitative_payload: { order_id: order.id, method: "moyasar", channel: "store" },
    });
  }

  await admin.from("audit_logs").insert({
    actor_user_id: null,
    actor_role: "system",
    org_id: pay.org_id,
    action: "order_payment_paid",
    target_type: "payment",
    target_id: pay.id,
    payload_jsonb: { provider_payment_id: args.provider_payment_id },
  });

  return { ok: true };
}
