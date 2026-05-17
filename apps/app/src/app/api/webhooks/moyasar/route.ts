// Moyasar webhook handler. Configure in the Moyasar dashboard with this URL
// and a shared-secret header (we read it from MOYASAR_WEBHOOK_SECRET). We
// process every event idempotently — repeat deliveries are fine.

import { NextResponse, type NextRequest } from "next/server";

import { halalasToSar, verifyWebhookSecret, type MoyasarPayment } from "@/lib/moyasar";
import {
  finalizeMoyasarPayment,
  markMoyasarPaymentFailed,
} from "@/lib/memberships-finalize";

export const dynamic = "force-dynamic";

interface WebhookEnvelope {
  type: string;
  data: MoyasarPayment;
}

export async function POST(req: NextRequest) {
  const providedSecret =
    req.headers.get("x-moyasar-secret") ?? req.headers.get("authorization");
  if (!verifyWebhookSecret(providedSecret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: WebhookEnvelope;
  try {
    body = (await req.json()) as WebhookEnvelope;
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }

  const sporloPaymentId =
    body.data.metadata?.sporlo_payment_id ?? body.data.metadata?.payment_id;
  if (!sporloPaymentId) {
    // Not a Sporlo-originated payment — accept and ignore.
    return NextResponse.json({ ok: true, ignored: "no-metadata" });
  }

  if (body.type === "payment_paid" || body.data.status === "paid" || body.data.status === "captured") {
    const res = await finalizeMoyasarPayment({
      paymentId: sporloPaymentId,
      provider_payment_id: body.data.id,
      amount_sar: halalasToSar(body.data.amount),
    });
    return NextResponse.json(res);
  }

  if (body.type === "payment_failed" || body.data.status === "failed") {
    await markMoyasarPaymentFailed({
      paymentId: sporloPaymentId,
      reason: body.data.source?.message ?? body.data.status,
    });
    return NextResponse.json({ ok: true });
  }

  // Other event types: refunded, voided, etc. Ignored for Sprint 0;
  // production wires them once we have the Moyasar dashboard test data.
  return NextResponse.json({ ok: true, ignored: body.type });
}
