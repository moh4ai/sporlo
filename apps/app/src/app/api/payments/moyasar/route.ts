// Moyasar return-URL handler. Moyasar redirects here after the user completes
// (or fails) the hosted form. Query params include `id` (Moyasar payment id),
// `status`, and the metadata we provided when initialising the form. We never
// trust the URL params for the source of truth — we fetch the payment via the
// REST API server-side to confirm.

import { NextResponse, type NextRequest } from "next/server";

import { fetchPayment, halalasToSar, MoyasarError } from "@/lib/moyasar";
import {
  finalizeMoyasarPayment,
  markMoyasarPaymentFailed,
} from "@/lib/memberships-finalize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const moyasarPaymentId = url.searchParams.get("id");
  const sporloPaymentId = url.searchParams.get("payment_id");
  const memberId = url.searchParams.get("member_id");
  const locale = url.searchParams.get("locale") ?? "ar";

  if (!moyasarPaymentId || !sporloPaymentId || !memberId) {
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, req.url));
  }

  const memberHref = `/${locale}/memberships/members/${memberId}`;

  try {
    const remote = await fetchPayment(moyasarPaymentId);
    if (remote.status === "paid" || remote.status === "captured") {
      await finalizeMoyasarPayment({
        paymentId: sporloPaymentId,
        provider_payment_id: remote.id,
        amount_sar: halalasToSar(remote.amount),
      });
      return NextResponse.redirect(new URL(`${memberHref}?paid=1`, req.url));
    }
    await markMoyasarPaymentFailed({
      paymentId: sporloPaymentId,
      reason: remote.source?.message ?? remote.status,
    });
    return NextResponse.redirect(new URL(`${memberHref}?paid=0`, req.url));
  } catch (err) {
    const reason = err instanceof MoyasarError ? err.message : "unknown";
    await markMoyasarPaymentFailed({ paymentId: sporloPaymentId, reason });
    return NextResponse.redirect(new URL(`${memberHref}?paid=0`, req.url));
  }
}
