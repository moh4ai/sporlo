import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventDefinition } from "./events";
import { computeScores, type CategoryScore } from "./scoring";

// Sporlo Ministry KPI engine — single API surface every module imports.
//
// Per the master plan, modules emit typed events via `recordEvent(...)`. The
// engine never modifies them; computed views derive everything. Until
// `kpi_scores_quarterly` materialized view ships (Phase 3), `computeQuarterlyScore`
// computes on the fly from raw events.

export interface RecordEventInput {
  client: SupabaseClient;
  org_id: string;
  branch_id?: string | null;
  definition: EventDefinition;
  quantitative_value?: number | null;
  qualitative_payload?: Record<string, unknown>;
  occurred_at?: Date;
}

export interface RecordEventResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function recordEvent(
  input: RecordEventInput,
): Promise<RecordEventResult> {
  const {
    client,
    org_id,
    branch_id,
    definition,
    quantitative_value,
    qualitative_payload,
    occurred_at,
  } = input;

  const { data, error } = await client
    .from("kpi_events")
    .insert({
      org_id,
      branch_id: branch_id ?? null,
      category: definition.category ?? null,
      criterion_code: definition.criterion_code,
      event_type: definition.type,
      quantitative_value: quantitative_value ?? null,
      qualitative_payload_jsonb: qualitative_payload ?? {},
      source_module: definition.source_module,
      occurred_at: (occurred_at ?? new Date()).toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data!.id as string };
}

export interface QuarterlyScoreInput {
  client: SupabaseClient;
  org_id: string;
  /** Quarter identifier — e.g. "2025-Q4". */
  quarter: string;
}

export interface QuarterlyScoreResult {
  quarter: string;
  org_id: string;
  categories: CategoryScore[];
  total_score: number;
}

// Phase-1 placeholder: counts events per criterion within the quarter.
// Phase-3 will switch to the materialized view + weight-based formula.
export async function computeQuarterlyScore(
  input: QuarterlyScoreInput,
): Promise<QuarterlyScoreResult> {
  const { client, org_id, quarter } = input;
  const [start, end] = quarterBounds(quarter);

  const { data: events } = await client
    .from("kpi_events")
    .select("category, criterion_code, quantitative_value")
    .eq("org_id", org_id)
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString());

  const { data: criteria } = await client
    .from("kpi_categories")
    .select("code, category, weight");

  return computeScores(org_id, quarter, events ?? [], criteria ?? []);
}

export interface DeadlineInput {
  client: SupabaseClient;
  org_id: string;
}

export async function listDeadlines({ client, org_id }: DeadlineInput) {
  const { data } = await client
    .from("governance_deadlines")
    .select("*")
    .eq("org_id", org_id)
    .is("satisfied_at", null)
    .order("due_at", { ascending: true });
  return data ?? [];
}

// Penalty + financial support estimates — Phase 4 fills the formulas. The
// master plan describes 20-60% deductions per category violation and up to
// 2.5M SAR/quarter financial support for Category ب clubs.
export async function estimatePenalty(input: {
  client: SupabaseClient;
  org_id: string;
  quarter: string;
}): Promise<{ amount_sar: number; reasons: string[] }> {
  void input;
  return { amount_sar: 0, reasons: [] };
}

export async function estimateFinancialSupport(input: {
  client: SupabaseClient;
  org_id: string;
  quarter: string;
}): Promise<{ amount_sar: number; tier: string | null }> {
  void input;
  return { amount_sar: 0, tier: null };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function quarterBounds(quarter: string): [Date, Date] {
  // Accepts "YYYY-Qn" where n ∈ 1..4. Returns [start, end) UTC.
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter);
  if (!match) throw new Error(`Invalid quarter: ${quarter}`);
  const year = Number(match[1]);
  const q = Number(match[2]);
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 1));
  return [start, end];
}
