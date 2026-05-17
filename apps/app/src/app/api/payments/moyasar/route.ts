// Moyasar return-URL handler. The Moyasar Forms script redirects the buyer
// here once payment is captured. We never trust URL params alone — we fetch
// the payment via the REST API to confirm before finalising.
//
// Three kinds of payments funnel through this endpoint:
//   - subscription (Memberships) — finalizeMoyasarPayment
//   - ticket (Events) — finalizeTicketPayment
//   - order (Store) — finalizeOrderPayment

import { NextResponse, type NextRequest } from "next/server";

import { fetchPayment, halalasToSar, MoyasarError } from "@/lib/moyasar";
import {
  finalizeMoyasarPayment,
  markMoyasarPaymentFailed,
} from "@/lib/memberships-finalize";
import { finalizeTicketPayment } from "@/lib/events-finalize";
import { finalizeOrderPayment } from "@/lib/orders-finalize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const moyasarPaymentId = url.searchParams.get("id");
  const sporloPaymentId = url.searchParams.get("payment_id");
  const memberId = url.searchParams.get("member_id");
  const fixtureId = url.searchParams.get("fixture_id");
  const kind = url.searchParams.get("kind") ?? "subscription";
  const locale = url.searchParams.get("locale") ?? "ar";

  if (!moyasarPaymentId || !sporloPaymentId) {
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, req.url));
  }

  const redirectOnFinish =
    kind === "ticket" && fixtureId
      ? `/${locale}/fixtures/${fixtureId}`
      : kind === "order"
        ? `/${locale}/shop`
        : memberId
          ? `/${locale}/memberships/members/${memberId}`
          : `/${locale}`;

  try {
    const remote = await fetchPayment(moyasarPaymentId);
    if (remote.status === "paid" || remote.status === "captured") {
      if (kind === "ticket") {
        await finalizeTicketPayment({
          paymentId: sporloPaymentId,
          provider_payment_id: remote.id,
          amount_sar: halalasToSar(remote.amount),
        });
      } else if (kind === "order") {
        await finalizeOrderPayment({
          paymentId: sporloPaymentId,
          provider_payment_id: remote.id,
          amount_sar: halalasToSar(remote.amount),
        });
      } else {
        await finalizeMoyasarPayment({
          paymentId: sporloPaymentId,
          provider_payment_id: remote.id,
          amount_sar: halalasToSar(remote.amount),
        });
      }
      return NextResponse.redirect(new URL(`${redirectOnFinish}?paid=1`, req.url));
    }
    await markMoyasarPaymentFailed({
      paymentId: sporloPaymentId,
      reason: remote.source?.message ?? remote.status,
    });
    return NextResponse.redirect(new URL(`${redirectOnFinish}?paid=0`, req.url));
  } catch (err) {
    const reason = err instanceof MoyasarError ? err.message : "unknown";
    await markMoyasarPaymentFailed({ paymentId: sporloPaymentId, reason });
    return NextResponse.redirect(new URL(`${redirectOnFinish}?paid=0`, req.url));
  }
}
