// Thin Moyasar REST API wrapper. Server-only — never expose the secret key.
// Test keys begin with sk_test_; production with sk_live_. Both formats work
// with the same endpoints. Docs: https://docs.moyasar.com/

const MOYASAR_BASE = "https://api.moyasar.com";

export class MoyasarError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = "MoyasarError";
  }
}

function secretKey(): string {
  const key = process.env.MOYASAR_SECRET_KEY;
  if (!key) {
    throw new MoyasarError(0, "moyasar-secret-key-missing");
  }
  return key;
}

function authHeader(): string {
  return `Basic ${Buffer.from(secretKey() + ":").toString("base64")}`;
}

export function moyasarPublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? null;
}

export interface MoyasarPayment {
  id: string;
  status:
    | "initiated"
    | "paid"
    | "failed"
    | "authorized"
    | "captured"
    | "refunded"
    | "voided";
  amount: number; // halalas (SAR × 100)
  fee: number;
  currency: string;
  refunded: number;
  refunded_at: string | null;
  description: string | null;
  amount_format: string;
  fee_format: string;
  invoice_id: string | null;
  ip: string | null;
  callback_url: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string> | null;
  source: {
    type: string;
    company?: string;
    name?: string;
    number?: string;
    message?: string;
  } | null;
}

export async function fetchPayment(paymentId: string): Promise<MoyasarPayment> {
  const res = await fetch(`${MOYASAR_BASE}/v1/payments/${paymentId}`, {
    method: "GET",
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new MoyasarError(res.status, "moyasar-fetch-failed", text);
  }
  return (await res.json()) as MoyasarPayment;
}

export async function refundPayment(
  paymentId: string,
  amountHalalas?: number,
): Promise<MoyasarPayment> {
  const body = amountHalalas != null ? { amount: amountHalalas } : {};
  const res = await fetch(`${MOYASAR_BASE}/v1/payments/${paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new MoyasarError(res.status, "moyasar-refund-failed", text);
  }
  return (await res.json()) as MoyasarPayment;
}

// Moyasar webhooks include a shared-secret header rather than HMAC. We
// configure that secret in the Moyasar dashboard and read it from env.
export function verifyWebhookSecret(provided: string | null): boolean {
  const expected = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!expected) return false;
  if (!provided) return false;
  // Constant-time-ish compare (Node's tsc lacks crypto.timingSafeEqual here; for
  // strings the length-checked equality is good enough for a small secret).
  if (provided.length !== expected.length) return false;
  let acc = 0;
  for (let i = 0; i < expected.length; i++) {
    acc |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return acc === 0;
}

export function halalasToSar(halalas: number): number {
  return Math.round(halalas) / 100;
}

export function sarToHalalas(sar: number): number {
  return Math.round(sar * 100);
}
