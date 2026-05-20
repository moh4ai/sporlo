// Effective unit price for a product variant given the buyer's member context.
//
// SOURCE OF TRUTH: createOrderIntent in
// apps/app/src/app/[locale]/(dashboard)/store/actions.ts mirrors this exact
// math server-side and is authoritative for what the buyer actually pays.
// This helper is for display only — keep them in sync.

export interface PricingInput {
  basePrice: number;
  memberOverride: number | null;
  planDiscountPct: number;
  isMember: boolean;
}

export function effectiveUnitPrice({
  basePrice,
  memberOverride,
  planDiscountPct,
  isMember,
}: PricingInput): number {
  if (!isMember) return basePrice;
  if (memberOverride != null) return memberOverride;
  if (planDiscountPct > 0) {
    return Math.round(basePrice * (100 - planDiscountPct)) / 100;
  }
  return basePrice;
}

// True when this variant has a member-only price worth promoting to a
// not-yet-signed-in shopper.
export function hasMemberDiscount(
  variant: { member_price_sar: number | null },
  planDiscountPct = 0,
): boolean {
  return variant.member_price_sar != null || planDiscountPct > 0;
}
