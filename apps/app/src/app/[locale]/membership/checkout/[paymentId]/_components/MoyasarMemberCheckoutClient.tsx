"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

const MPF_JS = "https://cdn.moyasar.com/mpf/1.15.0/mpf.js";
const MPF_CSS = "https://cdn.moyasar.com/mpf/1.15.0/mpf.css";

declare global {
  interface Window {
    Moyasar?: { init: (config: Record<string, unknown>) => void };
  }
}

// Member-facing mirror of MoyasarCheckoutClient. Same widget; the only
// difference is the callback URL carries `kind=member-subscription`, which
// the /api/payments/moyasar handler uses to route the user back to /me
// instead of the staff dashboard.
export function MoyasarMemberCheckoutClient({
  publishableKey,
  paymentId,
  memberId,
  amountSar,
  locale,
}: {
  publishableKey: string;
  paymentId: string;
  memberId: string;
  amountSar: number;
  locale: "ar" | "en";
}) {
  const mountedRef = useRef(false);

  function buildCallback() {
    const origin = window.location.origin;
    return (
      `${origin}/api/payments/moyasar` +
      `?payment_id=${encodeURIComponent(paymentId)}` +
      `&member_id=${encodeURIComponent(memberId)}` +
      `&kind=member-subscription` +
      `&locale=${locale}`
    );
  }

  function init() {
    if (mountedRef.current) return;
    if (typeof window === "undefined" || !window.Moyasar) return;
    mountedRef.current = true;
    window.Moyasar.init({
      element: ".mysr-form",
      amount: Math.round(amountSar * 100),
      currency: "SAR",
      description: `Sporlo membership subscription ${paymentId}`,
      publishable_api_key: publishableKey,
      callback_url: buildCallback(),
      methods: ["creditcard", "applepay", "stcpay"],
      metadata: { sporlo_payment_id: paymentId, member_id: memberId, kind: "member-subscription" },
    });
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishableKey, paymentId, memberId, amountSar, locale]);

  return (
    <>
      <link rel="stylesheet" href={MPF_CSS} />
      <Script src={MPF_JS} strategy="afterInteractive" onLoad={init} />
      <div className="mysr-form rounded-card border border-spo-line bg-white p-4" />
    </>
  );
}
