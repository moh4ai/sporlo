import {
  EmailSchema,
  PositiveIntSchema,
  SarAmountSchema,
  UuidSchema,
  z,
} from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// ─────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────

export const ProductCreateSchema = z.object({
  name_ar: z.string().trim().min(1).max(120),
  name_en: z.string().trim().min(1).max(120),
  description_ar: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  description_en: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  // Legacy single-text column — kept writable so admins can still seed it,
  // but bilingual pairs below take precedence on the public pages.
  category: z.preprocess(emptyToUndef, z.string().max(60).optional()),
  category_ar: z.preprocess(emptyToUndef, z.string().max(60).optional()),
  category_en: z.preprocess(emptyToUndef, z.string().max(60).optional()),
  active: z.boolean().default(true),
});

export const ProductUpdateSchema = ProductCreateSchema.extend({
  id: UuidSchema,
});

export const ProductArchiveSchema = z.object({
  id: UuidSchema,
  archive: z.boolean(),
});

export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
export type ProductArchiveInput = z.infer<typeof ProductArchiveSchema>;

// ─────────────────────────────────────────────
// Variants
// ─────────────────────────────────────────────

export const VariantCreateSchema = z.object({
  product_id: UuidSchema,
  sku: z.preprocess(emptyToUndef, z.string().max(60).optional()),
  // Canonical axis values — used as the option key in the swatch picker.
  size: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  color: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  // Locale-specific display labels for the same axes.
  size_ar: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  size_en: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  color_ar: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  color_en: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  price_sar: SarAmountSchema,
  member_price_sar: z.preprocess(emptyToUndef, SarAmountSchema.optional()),
  stock: z.number().int().min(0).default(0),
});

export const VariantUpdateSchema = VariantCreateSchema.extend({
  id: UuidSchema,
});

export const VariantDeleteSchema = z.object({ id: UuidSchema });

export const StockAdjustSchema = z.object({
  variant_id: UuidSchema,
  delta: z.number().int(),
  note: z.preprocess(emptyToUndef, z.string().max(200).optional()),
});

export type VariantCreateInput = z.infer<typeof VariantCreateSchema>;
export type VariantUpdateInput = z.infer<typeof VariantUpdateSchema>;
export type VariantDeleteInput = z.infer<typeof VariantDeleteSchema>;
export type StockAdjustInput = z.infer<typeof StockAdjustSchema>;

// ─────────────────────────────────────────────
// Public order intent
// ─────────────────────────────────────────────

export const CartLineSchema = z.object({
  variant_id: UuidSchema,
  quantity: PositiveIntSchema.max(20),
});

export const OrderIntentSchema = z.object({
  org_id: UuidSchema,
  lines: z.array(CartLineSchema).min(1).max(20),
  buyer_name: z.string().trim().min(2).max(120),
  buyer_email: EmailSchema,
  buyer_phone: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  shipping_address: z.preprocess(emptyToUndef, z.string().max(500).optional()),
  payment_method: z.enum(["moyasar", "manual"]).default("moyasar"),
});

export type OrderIntentInput = z.infer<typeof OrderIntentSchema>;

// ─────────────────────────────────────────────
// Product image gallery actions
// ─────────────────────────────────────────────

export const ProductImageReorderSchema = z.object({
  product_id: UuidSchema,
  paths: z.array(z.string().min(1).max(500)).max(20),
});

export const ProductImageRemoveSchema = z.object({
  product_id: UuidSchema,
  path: z.string().min(1).max(500),
});

export const MemberDiscountLookupSchema = z.object({
  org_id: UuidSchema,
  email: EmailSchema,
});

export type ProductImageReorderInput = z.infer<typeof ProductImageReorderSchema>;
export type ProductImageRemoveInput = z.infer<typeof ProductImageRemoveSchema>;
export type MemberDiscountLookupInput = z.infer<typeof MemberDiscountLookupSchema>;

// ─────────────────────────────────────────────
// Fulfillment
// ─────────────────────────────────────────────

export const ShipOrderSchema = z.object({
  id: UuidSchema,
  carrier: z.preprocess(emptyToUndef, z.string().max(60).optional()),
  tracking_number: z.preprocess(emptyToUndef, z.string().max(80).optional()),
});

export const DeliverOrderSchema = z.object({ id: UuidSchema });

export type ShipOrderInput = z.infer<typeof ShipOrderSchema>;
export type DeliverOrderInput = z.infer<typeof DeliverOrderSchema>;
