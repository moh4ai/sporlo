// Hand-typed shape of the Day 2 schema. Generate the full `Database` type from
// Supabase once a project exists: `supabase gen types typescript --linked`.

export type Tier = "a" | "b" | "c" | "d" | "e";

export type Role =
  | "super_admin"
  | "club_admin"
  | "dept_manager"
  | "staff"
  | "coach"
  | "member"
  | "auditor";

export type Department =
  | "finance"
  | "hr"
  | "marketing"
  | "sports"
  | "legal"
  | "it"
  | "academy"
  | "events"
  | "csr"
  | "governance";

export type KpiCategory = "b" | "c" | "d" | "e";

export interface Organization {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  tier: Tier | null;
  subdomain: string | null;
  custom_domain: string | null;
  branding_overrides_jsonb: Record<string, unknown>;
  subscription_tier: string;
  created_at: string;
}

export interface Branch {
  id: string;
  org_id: string;
  name_ar: string;
  name_en: string;
  city: string | null;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string | null;
  phone: string | null;
  full_name_ar: string | null;
  full_name_en: string | null;
  role: Role;
  department: Department | null;
  created_at: string;
}

export type MemberStatus = "active" | "inactive" | "prospect";

export interface Member {
  id: string;
  org_id: string;
  branch_id: string | null;
  full_name_ar: string;
  full_name_en: string | null;
  email: string | null;
  phone: string | null;
  national_id: string | null;
  date_of_birth: string | null;
  member_number: string | null;
  status: MemberStatus;
  joined_at: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// Memberships module (Phase 1)
// ─────────────────────────────────────────────

export interface Plan {
  id: string;
  org_id: string;
  code: string;
  name_ar: string;
  name_en: string;
  duration_months: number;
  price_sar: number;
  member_only_store_discount_pct: number;
  includes_jsonb: Record<string, unknown>;
  active: boolean;
  archived_at: string | null;
  created_at: string;
}

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "frozen"
  | "cancelled"
  | "expired";

export interface Subscription {
  id: string;
  org_id: string;
  member_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  starts_at: string | null;
  ends_at: string | null;
  frozen_from: string | null;
  frozen_to: string | null;
  moyasar_subscription_id: string | null;
  created_at: string;
  cancelled_at: string | null;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Payment {
  id: string;
  org_id: string;
  subscription_id: string | null;
  member_id: string | null;
  amount_sar: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  provider_payment_id: string | null;
  paid_at: string | null;
  failure_reason: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface DiscountCoupon {
  id: string;
  org_id: string;
  code: string;
  percent_off: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_to: string | null;
  plan_scope_jsonb: string[];
  active: boolean;
  created_at: string;
}

export interface CouponRedemption {
  id: string;
  org_id: string;
  coupon_id: string;
  subscription_id: string | null;
  member_id: string | null;
  redeemed_at: string;
}

export interface MemberPortalToken {
  id: string;
  org_id: string;
  member_id: string;
  token: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export interface KpiCategoryRow {
  code: string;
  category: KpiCategory;
  title_ar: string;
  title_en: string;
  weight: number;
}

export interface KpiEvent {
  id: string;
  org_id: string;
  branch_id: string | null;
  category: KpiCategory;
  criterion_code: string;
  event_type: string;
  quantitative_value: number | null;
  qualitative_payload_jsonb: Record<string, unknown>;
  source_module: string;
  occurred_at: string;
  recorded_at: string;
}

export interface GovernanceDocument {
  id: string;
  org_id: string;
  quarter: string;
  document_type: string;
  title_ar: string;
  storage_path: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  completeness_score: number | null;
  created_at: string;
}

export interface GovernanceDeadline {
  id: string;
  org_id: string;
  title_ar: string;
  due_at: string;
  warning_at: string | null;
  satisfied_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  org_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload_jsonb: Record<string, unknown>;
  created_at: string;
}
