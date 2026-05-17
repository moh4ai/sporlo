// Service-role helpers for finalising ticket payments + transitioning seat
// status. Called from the Moyasar callback / webhook. Idempotent.

import { EVT, recordEvent } from "@sporlo/governance";

import { createServiceRoleClient } from "@/lib/supabase-server";

export async function finalizeTicketPayment(args: {
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

  // Mark all tickets attached to this payment as paid, seats as sold.
  const { data: tickets } = await admin
    .from("tickets")
    .select("id, fixture_id, seat_id")
    .eq("payment_id", pay.id);

  if (tickets && tickets.length > 0) {
    const ticketIds = tickets.map((t) => t.id);
    const seatIds = tickets.map((t) => t.seat_id).filter(Boolean) as string[];
    await admin
      .from("tickets")
      .update({ status: "paid", sold_at: now.toISOString() })
      .in("id", ticketIds);
    if (seatIds.length > 0) {
      await admin.from("seats").update({ status: "sold" }).in("id", seatIds);
    }
    for (const t of tickets) {
      await recordEvent({
        client: admin,
        org_id: pay.org_id,
        definition: EVT.TICKET_SOLD,
        quantitative_value: args.amount_sar / tickets.length,
        qualitative_payload: { ticket_id: t.id, fixture_id: t.fixture_id },
      });
    }
    await recordEvent({
      client: admin,
      org_id: pay.org_id,
      definition: EVT.REVENUE_RECORDED,
      quantitative_value: args.amount_sar,
      qualitative_payload: { tickets: tickets.length, method: "moyasar" },
    });
  }

  await admin.from("audit_logs").insert({
    actor_user_id: null,
    actor_role: "system",
    org_id: pay.org_id,
    action: "ticket_payment_paid",
    target_type: "payment",
    target_id: pay.id,
    payload_jsonb: { provider_payment_id: args.provider_payment_id },
  });

  return { ok: true };
}
