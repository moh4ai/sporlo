"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Moyasar's hosted-form CDN. Loaded once per checkout view.
const MPF_JS = "https://cdn.moyasar.com/mpf/1.15.0/mpf.js";
const MPF_CSS = "https://cdn.moyasar.com/mpf/1.15.0/mpf.css";

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

export function MoyasarCheckoutClient({
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

  useEffect(() => {
    if (mountedRef.current) return;
    if (typeof window === "undefined" || !window.Moyasar) return;
    mountedRef.current = true;

    const origin = window.location.origin;
    const callbackUrl = `${origin}/api/payments/moyasar?payment_id=${encodeURIComponent(
      paymentId,
    )}&member_id=${encodeURIComponent(memberId)}&locale=${locale}`;

    window.Moyasar.init({
      element: ".mysr-form",
      amount: Math.round(amountSar * 100), // halalas
      currency: "SAR",
      description: `Sporlo subscription ${paymentId}`,
      publishable_api_key: publishableKey,
      callback_url: callbackUrl,
      methods: ["creditcard", "applepay", "stcpay"],
      metadata: { sporlo_payment_id: paymentId, member_id: memberId },
    });
    // Re-init not needed; Moyasar mounts on the first call.
  }, [publishableKey, paymentId, memberId, amountSar, locale]);

  return (
    <>
      <link rel="stylesheet" href={MPF_CSS} />
      <Script
        src={MPF_JS}
        strategy="afterInteractive"
        onLoad={() => {
          if (!mountedRef.current && typeof window !== "undefined" && window.Moyasar) {
            mountedRef.current = true;
            const origin = window.location.origin;
            const callbackUrl = `${origin}/api/payments/moyasar?payment_id=${encodeURIComponent(
              paymentId,
            )}&member_id=${encodeURIComponent(memberId)}&locale=${locale}`;
            window.Moyasar.init({
              element: ".mysr-form",
              amount: Math.round(amountSar * 100),
              currency: "SAR",
              description: `Sporlo subscription ${paymentId}`,
              publishable_api_key: publishableKey,
              callback_url: callbackUrl,
              methods: ["creditcard", "applepay", "stcpay"],
              metadata: { sporlo_payment_id: paymentId, member_id: memberId },
            });
          }
        }}
      />
      <div className="mysr-form rounded-card border border-spo-line bg-white p-4" />
    </>
  );
}
