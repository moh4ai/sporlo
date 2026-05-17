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

export function OrderCheckoutClient({
  publishableKey,
  paymentId,
  amountSar,
  buyerEmail,
  locale,
}: {
  publishableKey: string;
  paymentId: string;
  amountSar: number;
  buyerEmail: string;
  locale: "ar" | "en";
}) {
  const mountedRef = useRef(false);

  function init() {
    if (mountedRef.current) return;
    if (typeof window === "undefined" || !window.Moyasar) return;
    mountedRef.current = true;
    const origin = window.location.origin;
    const callbackUrl = `${origin}/api/payments/moyasar?payment_id=${encodeURIComponent(
      paymentId,
    )}&kind=order&locale=${locale}`;
    window.Moyasar.init({
      element: ".mysr-form",
      amount: Math.round(amountSar * 100),
      currency: "SAR",
      description: `Sporlo order ${paymentId}`,
      publishable_api_key: publishableKey,
      callback_url: callbackUrl,
      methods: ["creditcard", "applepay", "stcpay"],
      metadata: {
        sporlo_payment_id: paymentId,
        kind: "order",
        buyer_email: buyerEmail,
      },
    });
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <link rel="stylesheet" href={MPF_CSS} />
      <Script src={MPF_JS} strategy="afterInteractive" onLoad={() => init()} />
      <div className="mysr-form rounded-card border border-spo-line bg-white p-4" />
    </>
  );
}
