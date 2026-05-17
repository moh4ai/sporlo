import {
  BilingualNameSchema,
  EmailSchema,
  PositiveIntSchema,
  SarAmountSchema,
  SaudiNationalIdSchema,
  SaudiPhoneSchema,
  UuidSchema,
  z,
} from "@sporlo/shared";

const PlanCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9-]+$/, "Plan code: lowercase letters, digits, hyphens");

const DiscountPctSchema = z.number().min(0).max(100).finite();

export const PlanCreateSchema = BilingualNameSchema.extend({
  code: PlanCodeSchema,
  duration_months: PositiveIntSchema.max(120),
  price_sar: SarAmountSchema,
  member_only_store_discount_pct: DiscountPctSchema,
});

export const PlanUpdateSchema = PlanCreateSchema.extend({
  id: UuidSchema,
});

export const PlanArchiveSchema = z.object({
  id: UuidSchema,
  archive: z.boolean(),
});

export type PlanCreateInput = z.infer<typeof PlanCreateSchema>;
export type PlanUpdateInput = z.infer<typeof PlanUpdateSchema>;
export type PlanArchiveInput = z.infer<typeof PlanArchiveSchema>;

// ─────────────────────────────────────────────
// Members
// ─────────────────────────────────────────────

const MemberStatusSchema = z.enum(["active", "inactive", "prospect"]);

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

export const MemberCreateSchema = z.object({
  full_name_ar: z.string().trim().min(2).max(200),
  full_name_en: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
  email: z.preprocess(emptyToUndef, EmailSchema.optional()),
  phone: z.preprocess(emptyToUndef, SaudiPhoneSchema.optional()),
  national_id: z.preprocess(emptyToUndef, SaudiNationalIdSchema.optional()),
  date_of_birth: z.preprocess(emptyToUndef, z.string().date().optional()),
  branch_id: z.preprocess(emptyToUndef, UuidSchema.optional()),
  status: MemberStatusSchema.default("active"),
});

export const MemberUpdateSchema = MemberCreateSchema.extend({
  id: UuidSchema,
});

export const MemberStatusChangeSchema = z.object({
  id: UuidSchema,
  status: MemberStatusSchema,
});

export type MemberCreateInput = z.infer<typeof MemberCreateSchema>;
export type MemberUpdateInput = z.infer<typeof MemberUpdateSchema>;
export type MemberStatusChangeInput = z.infer<typeof MemberStatusChangeSchema>;

// ─────────────────────────────────────────────
// Subscriptions
// ─────────────────────────────────────────────

export const SubscriptionStartSchema = z.object({
  member_id: UuidSchema,
  plan_id: UuidSchema,
  /** "moyasar" → returns a Moyasar checkout payload; "manual" → admin records payment immediately. */
  payment_method: z.enum(["moyasar", "manual"]).default("manual"),
  coupon_code: z.preprocess(emptyToUndef, z.string().trim().max(40).optional()),
});

export const SubscriptionIdSchema = z.object({ id: UuidSchema });

export const SubscriptionFreezeSchema = z.object({
  id: UuidSchema,
  frozen_from: z.string().date(),
  frozen_to: z.string().date(),
});

export const SubscriptionCancelSchema = z.object({
  id: UuidSchema,
  reason: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export const ManualPaymentSchema = z.object({
  subscription_id: UuidSchema,
  amount_sar: SarAmountSchema,
  note: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export const RefundPaymentSchema = z.object({
  payment_id: UuidSchema,
  reason: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export type SubscriptionStartInput = z.infer<typeof SubscriptionStartSchema>;
export type SubscriptionFreezeInput = z.infer<typeof SubscriptionFreezeSchema>;
export type SubscriptionCancelInput = z.infer<typeof SubscriptionCancelSchema>;
export type ManualPaymentInput = z.infer<typeof ManualPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;

// ─────────────────────────────────────────────
// Coupons
// ─────────────────────────────────────────────

const CouponCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Z0-9-]+$/, "Coupon code: uppercase letters, digits, hyphens");

export const CouponCreateSchema = z.object({
  code: CouponCodeSchema,
  percent_off: z.number().min(0).max(100).finite(),
  max_uses: z.preprocess(emptyToUndef, PositiveIntSchema.optional()),
  valid_from: z.string().date(),
  valid_to: z.preprocess(emptyToUndef, z.string().date().optional()),
  plan_scope: z.array(UuidSchema).default([]),
  active: z.boolean().default(true),
});

export const CouponUpdateSchema = CouponCreateSchema.extend({
  id: UuidSchema,
});

export const CouponDisableSchema = z.object({
  id: UuidSchema,
  active: z.boolean(),
});

export type CouponCreateInput = z.infer<typeof CouponCreateSchema>;
export type CouponUpdateInput = z.infer<typeof CouponUpdateSchema>;
export type CouponDisableInput = z.infer<typeof CouponDisableSchema>;

// ─────────────────────────────────────────────
// Member portal magic link
// ─────────────────────────────────────────────

export const PortalLinkSchema = z.object({
  member_id: UuidSchema,
});

export type PortalLinkInput = z.infer<typeof PortalLinkSchema>;
