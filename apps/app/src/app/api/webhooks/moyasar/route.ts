// Moyasar webhook handler. Configure in the Moyasar dashboard with this URL
// and a shared-secret header (we read from MOYASAR_WEBHOOK_SECRET). Every
// event is processed idempotently — repeat deliveries are fine.

import { NextResponse, type NextRequest } from "next/server";

import { halalasToSar, verifyWebhookSecret, type MoyasarPayment } from "@/lib/moyasar";
import {
  finalizeMoyasarPayment,
  markMoyasarPaymentFailed,
} from "@/lib/memberships-finalize";
import { finalizeTicketPayment } from "@/lib/events-finalize";
import { finalizeOrderPayment } from "@/lib/orders-finalize";

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

  const md = body.data.metadata ?? {};
  const sporloPaymentId = md.sporlo_payment_id ?? md.payment_id;
  const kind = md.kind ?? "subscription";

  if (!sporloPaymentId) {
    return NextResponse.json({ ok: true, ignored: "no-metadata" });
  }

  const paid =
    body.type === "payment_paid" ||
    body.data.status === "paid" ||
    body.data.status === "captured";
  const failed = body.type === "payment_failed" || body.data.status === "failed";

  if (paid) {
    const finalize =
      kind === "ticket"
        ? finalizeTicketPayment
        : kind === "order"
          ? finalizeOrderPayment
          : finalizeMoyasarPayment;
    const res = await finalize({
      paymentId: sporloPaymentId,
      provider_payment_id: body.data.id,
      amount_sar: halalasToSar(body.data.amount),
    });
    return NextResponse.json(res);
  }

  if (failed) {
    await markMoyasarPaymentFailed({
      paymentId: sporloPaymentId,
      reason: body.data.source?.message ?? body.data.status,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: body.type });
}
