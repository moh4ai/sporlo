// Typed event constants every module emits. Each event maps to:
//   - `category` (Ministry KPI category B/C/D/E) OR null if unmapped
//   - `criterion_code` (the criterion row in kpi_categories) OR null
//
// criterion_code is nullable in the DB (see migration 0006_cross_cutting.sql)
// so unmapped events still record — we may map them in a later migration as
// the Ministry rubric is refined.

import type { KpiCategory } from "@sporlo/db";

export interface EventDefinition {
  type: string;
  category: KpiCategory | null;
  criterion_code: string | null;
  source_module: string;
}

// Memberships (Phase 1)
export const MEMBER_ADDED: EventDefinition = {
  type: "member_added",
  category: "c",
  criterion_code: "C1",
  source_module: "memberships",
};

export const SUBSCRIPTION_STARTED: EventDefinition = {
  type: "subscription_started",
  category: "b",
  criterion_code: "B2",
  source_module: "memberships",
};

export const SUBSCRIPTION_RENEWED: EventDefinition = {
  type: "subscription_renewed",
  category: "b",
  criterion_code: "B2",
  source_module: "memberships",
};

export const SUBSCRIPTION_FROZEN: EventDefinition = {
  type: "subscription_frozen",
  category: null,
  criterion_code: null,
  source_module: "memberships",
};

export const SUBSCRIPTION_CANCELLED: EventDefinition = {
  type: "subscription_cancelled",
  category: null,
  criterion_code: null,
  source_module: "memberships",
};

export const REVENUE_RECORDED: EventDefinition = {
  type: "revenue_recorded",
  category: "b",
  criterion_code: "B2",
  source_module: "memberships",
};

export const COUPON_REDEEMED: EventDefinition = {
  type: "coupon_redeemed",
  category: null,
  criterion_code: null,
  source_module: "memberships",
};

// Finance (Phase 1 + Phase 3 carry)
export const REFUND_PROCESSED: EventDefinition = {
  type: "refund_processed",
  category: "b",
  criterion_code: "B2",
  source_module: "finance",
};

export const DISCLOSURE_SUBMITTED: EventDefinition = {
  type: "disclosure_submitted",
  category: "b",
  criterion_code: "B2",
  source_module: "finance",
};

// Events (Phase 2)
export const TICKET_SOLD: EventDefinition = {
  type: "ticket_sold",
  category: "b",
  criterion_code: "B2",
  source_module: "events",
};

export const ATTENDANCE_RECORDED: EventDefinition = {
  type: "attendance_recorded",
  category: "d",
  criterion_code: "D1",
  source_module: "events",
};

export const EVENT_HELD: EventDefinition = {
  type: "event_held",
  category: "d",
  criterion_code: "D1",
  source_module: "events",
};

// Store (Phase 2)
export const MERCH_REVENUE: EventDefinition = {
  type: "merch_revenue",
  category: "b",
  criterion_code: "B2",
  source_module: "store",
};

export const ORDER_FULFILLED: EventDefinition = {
  type: "order_fulfilled",
  category: null,
  criterion_code: null,
  source_module: "store",
};

// Academy (Phase 3)
export const ACADEMY_SESSION_HELD: EventDefinition = {
  type: "academy_session_held",
  category: "d",
  criterion_code: "D1",
  source_module: "academy",
};

export const PARENT_ENGAGEMENT_RECORDED: EventDefinition = {
  type: "parent_engagement_recorded",
  category: "d",
  criterion_code: "D1",
  source_module: "academy",
};

// Facilities (Phase 3)
export const FACILITY_BOOKED: EventDefinition = {
  type: "facility_booked",
  category: "e",
  criterion_code: "E1",
  source_module: "facilities",
};

// Team (Phase 3)
export const SQUAD_REGISTERED: EventDefinition = {
  type: "squad_registered",
  category: null,
  criterion_code: null,
  source_module: "team",
};

export const TRAINING_HELD: EventDefinition = {
  type: "training_held",
  category: "d",
  criterion_code: "D1",
  source_module: "team",
};

// HR (Phase 3)
export const STAFF_CERTIFIED: EventDefinition = {
  type: "staff_certified",
  category: "e",
  criterion_code: "E1",
  source_module: "hr",
};

// Governance (Phase 4)
export const REPORT_GENERATED: EventDefinition = {
  type: "report_generated",
  category: "b",
  criterion_code: "B1",
  source_module: "governance",
};

export const APPEAL_FILED: EventDefinition = {
  type: "appeal_filed",
  category: null,
  criterion_code: null,
  source_module: "governance",
};

// Convenience namespace re-export — import `EVT.SUBSCRIPTION_STARTED` etc.
export const EVT = {
  MEMBER_ADDED,
  SUBSCRIPTION_STARTED,
  SUBSCRIPTION_RENEWED,
  SUBSCRIPTION_FROZEN,
  SUBSCRIPTION_CANCELLED,
  REVENUE_RECORDED,
  COUPON_REDEEMED,
  REFUND_PROCESSED,
  DISCLOSURE_SUBMITTED,
  TICKET_SOLD,
  ATTENDANCE_RECORDED,
  EVENT_HELD,
  MERCH_REVENUE,
  ORDER_FULFILLED,
  ACADEMY_SESSION_HELD,
  PARENT_ENGAGEMENT_RECORDED,
  FACILITY_BOOKED,
  SQUAD_REGISTERED,
  TRAINING_HELD,
  STAFF_CERTIFIED,
  REPORT_GENERATED,
  APPEAL_FILED,
} as const;
