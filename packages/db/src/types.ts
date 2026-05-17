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

// ─────────────────────────────────────────────
// Finance module (Phase 1 + 3 carry)
// ─────────────────────────────────────────────

export type PaymentMethodType =
  | "cash"
  | "bank_transfer"
  | "pos_terminal"
  | "moyasar"
  | "other";

export interface PaymentMethodRow {
  id: string;
  org_id: string;
  label: string;
  type: PaymentMethodType;
  details_jsonb: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

export type RefundStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "completed"
  | "failed";

export interface Refund {
  id: string;
  org_id: string;
  payment_id: string;
  amount_sar: number;
  reason: string | null;
  status: RefundStatus;
  requested_by: string | null;
  approved_by: string | null;
  processed_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

export interface QuarterlyDisclosure {
  id: string;
  org_id: string;
  quarter: string;
  totals_jsonb: Record<string, unknown>;
  document_id: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  notes: string | null;
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

// ─────────────────────────────────────────────
// Events module (Phase 2)
// ─────────────────────────────────────────────

export type FixtureStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Fixture {
  id: string;
  org_id: string;
  branch_id: string | null;
  opponent_ar: string;
  opponent_en: string;
  kickoff_at: string;
  venue: string | null;
  sport_type: string;
  status: FixtureStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
}

export interface VenueSection {
  id: string;
  org_id: string;
  fixture_id: string;
  label: string;
  rows_count: number;
  seats_per_row: number;
  capacity: number;
  display_order: number;
  created_at: string;
}

export type SeatStatus = "available" | "held" | "sold" | "blocked";

export interface Seat {
  id: string;
  org_id: string;
  section_id: string;
  row_label: string;
  seat_number: number;
  status: SeatStatus;
  held_until: string | null;
  created_at: string;
}

export interface PricingTier {
  id: string;
  org_id: string;
  fixture_id: string;
  section_id: string;
  label: string;
  price_sar: number;
  member_price_sar: number | null;
  created_at: string;
}

export type TicketStatus = "pending" | "paid" | "cancelled" | "refunded";

export interface Ticket {
  id: string;
  org_id: string;
  fixture_id: string;
  seat_id: string | null;
  buyer_member_id: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  qr_code: string;
  price_sar: number;
  status: TicketStatus;
  payment_id: string | null;
  sold_at: string | null;
  scanned_at: string | null;
  scanned_by: string | null;
  created_at: string;
}

export type MatchEventType =
  | "goal"
  | "own_goal"
  | "penalty"
  | "yellow_card"
  | "red_card"
  | "substitution"
  | "injury"
  | "note";

export interface MatchEvent {
  id: string;
  org_id: string;
  fixture_id: string;
  minute: number;
  type: MatchEventType;
  team: "home" | "away";
  player_name: string | null;
  payload_jsonb: Record<string, unknown>;
  recorded_offline: boolean;
  recorded_by: string | null;
  client_id: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// Store module (Phase 2)
// ─────────────────────────────────────────────

export interface Product {
  id: string;
  org_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  category: string | null;
  active: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  org_id: string;
  product_id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  price_sar: number;
  member_price_sar: number | null;
  stock: number;
  active: boolean;
  created_at: string;
}

export type InventoryReason =
  | "initial"
  | "restock"
  | "order_paid"
  | "order_cancelled"
  | "manual_adjustment";

export interface InventoryMovement {
  id: string;
  org_id: string;
  variant_id: string;
  delta: number;
  reason: InventoryReason;
  order_id: string | null;
  note: string | null;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface Order {
  id: string;
  org_id: string;
  buyer_member_id: string | null;
  buyer_email: string;
  buyer_phone: string | null;
  shipping_address: string | null;
  subtotal_sar: number;
  discount_sar: number;
  total_sar: number;
  currency: string;
  status: OrderStatus;
  payment_id: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  org_id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price_sar: number;
  subtotal_sar: number;
  created_at: string;
}

export interface Shipment {
  id: string;
  org_id: string;
  order_id: string;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string;
  delivered_at: string | null;
  notes: string | null;
}
