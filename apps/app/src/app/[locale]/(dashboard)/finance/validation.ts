import {
  SarAmountSchema,
  UuidSchema,
  z,
} from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// ─────────────────────────────────────────────
// Payment methods
// ─────────────────────────────────────────────

const PaymentMethodTypeSchema = z.enum([
  "cash",
  "bank_transfer",
  "pos_terminal",
  "moyasar",
  "other",
]);

export const PaymentMethodCreateSchema = z.object({
  label: z.string().trim().min(2).max(80),
  type: PaymentMethodTypeSchema,
  details: z.preprocess(emptyToUndef, z.string().max(500).optional()),
  active: z.boolean().default(true),
});

export const PaymentMethodUpdateSchema = PaymentMethodCreateSchema.extend({
  id: UuidSchema,
});

export const PaymentMethodToggleSchema = z.object({
  id: UuidSchema,
  active: z.boolean(),
});

export type PaymentMethodCreateInput = z.infer<typeof PaymentMethodCreateSchema>;
export type PaymentMethodUpdateInput = z.infer<typeof PaymentMethodUpdateSchema>;
export type PaymentMethodToggleInput = z.infer<typeof PaymentMethodToggleSchema>;

// ─────────────────────────────────────────────
// Refunds
// ─────────────────────────────────────────────

export const RefundRequestSchema = z.object({
  payment_id: UuidSchema,
  amount_sar: SarAmountSchema,
  reason: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export const RefundDecisionSchema = z.object({
  id: UuidSchema,
});

export const RefundRejectSchema = z.object({
  id: UuidSchema,
  reason: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export type RefundRequestInput = z.infer<typeof RefundRequestSchema>;
export type RefundDecisionInput = z.infer<typeof RefundDecisionSchema>;
export type RefundRejectInput = z.infer<typeof RefundRejectSchema>;

// ─────────────────────────────────────────────
// Quarterly disclosures
// ─────────────────────────────────────────────

export const DisclosureSubmitSchema = z.object({
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/, "Quarter must be YYYY-Qn"),
  storage_path: z.preprocess(emptyToUndef, z.string().max(500).optional()),
  totals: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  notes: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export type DisclosureSubmitInput = z.infer<typeof DisclosureSubmitSchema>;
