import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventDefinition } from "./events";
import { computeScores, type CategoryScore } from "./scoring";

// Sporlo Ministry KPI engine — single API surface every module imports.
//
// Per the master plan, modules emit typed events via `recordEvent(...)`. The
// engine never modifies them; computed views derive everything.

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

// ─────────────────────────────────────────────
// Penalty estimation
//
// Master plan describes 20-60% category deductions per violation. Our Phase-3
// MVP rule: any criterion that recorded zero events in the quarter gets a 20%
// deduction tied to that criterion's weight. Missed deadlines stack another
// 10% per missed deadline up to 40%.
// ─────────────────────────────────────────────

export interface PenaltyEstimate {
  amount_sar: number;
  reasons: string[];
  breakdown: PenaltyLine[];
}

export interface PenaltyLine {
  criterion_code: string | null;
  percent: number;
  reason: string;
}

export async function estimatePenalty(input: {
  client: SupabaseClient;
  org_id: string;
  quarter: string;
}): Promise<PenaltyEstimate> {
  const { client, org_id, quarter } = input;
  const score = await computeQuarterlyScore({ client, org_id, quarter });

  const breakdown: PenaltyLine[] = [];
  for (const cat of score.categories) {
    for (const c of cat.criteria) {
      if (c.event_count === 0) {
        breakdown.push({
          criterion_code: c.code,
          percent: 20,
          reason: `No events recorded for ${c.code}`,
        });
      }
    }
  }

  // Missed deadlines (overdue, not satisfied).
  const [start, end] = quarterBounds(quarter);
  const { data: missed } = await client
    .from("governance_deadlines")
    .select("id, title_ar, due_at")
    .eq("org_id", org_id)
    .is("satisfied_at", null)
    .gte("due_at", start.toISOString())
    .lt("due_at", end.toISOString())
    .lt("due_at", new Date().toISOString());

  let deadlinePercent = 0;
  for (const m of missed ?? []) {
    if (deadlinePercent >= 40) break;
    breakdown.push({
      criterion_code: null,
      percent: 10,
      reason: `Missed deadline: ${m.title_ar}`,
    });
    deadlinePercent += 10;
  }

  const totalPercent = Math.min(
    60,
    breakdown.reduce((acc, line) => acc + line.percent, 0),
  );

  // Pull org's prior-quarter support estimate as the base for deductions.
  // Falls back to zero — surfaced as percent-only in the UI.
  const { data: prior } = await client
    .from("financial_support_estimates")
    .select("amount_sar")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const base = Number(prior?.[0]?.amount_sar ?? 0);
  const amount_sar = Math.round((base * totalPercent) / 100);

  return {
    amount_sar,
    reasons: breakdown.map((b) => b.reason),
    breakdown,
  };
}

// ─────────────────────────────────────────────
// Financial support estimate
//
// Master plan: up to 2.5M SAR/quarter for Category ب clubs, scaling down by
// tier. We map total_score → support amount using a simple linear model
// capped at the tier ceiling. Tiers below A get a fraction of the ceiling.
// ─────────────────────────────────────────────

const TIER_CEILINGS: Record<string, number> = {
  a: 5_000_000,
  b: 2_500_000,
  c: 1_500_000,
  d: 800_000,
  e: 300_000,
};

export interface FinancialSupportEstimate {
  amount_sar: number;
  tier: string | null;
  total_score: number;
  ceiling: number;
  score_ratio: number;
}

export async function estimateFinancialSupport(input: {
  client: SupabaseClient;
  org_id: string;
  quarter: string;
}): Promise<FinancialSupportEstimate> {
  const { client, org_id, quarter } = input;
  const score = await computeQuarterlyScore({ client, org_id, quarter });

  const { data: org } = await client
    .from("organizations")
    .select("tier")
    .eq("id", org_id)
    .maybeSingle();

  const tier = (org?.tier ?? null) as string | null;
  const ceiling = tier ? TIER_CEILINGS[tier] ?? 0 : 0;

  // Normalise score against an arbitrary perfect-score reference of 100.
  // Phase 4 refines this once we have ≥1 real club's baseline.
  const REFERENCE_TOTAL = 100;
  const ratio = Math.min(1, score.total_score / REFERENCE_TOTAL);
  const amount_sar = Math.round(ceiling * ratio);

  return {
    amount_sar,
    tier,
    total_score: score.total_score,
    ceiling,
    score_ratio: ratio,
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export function quarterBounds(quarter: string): [Date, Date] {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter);
  if (!match) throw new Error(`Invalid quarter: ${quarter}`);
  const year = Number(match[1]);
  const q = Number(match[2]);
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 1));
  return [start, end];
}

export function currentQuarter(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

export function previousQuarters(count: number, from?: string): string[] {
  const start = from ? parseQuarter(from) : parseQuarter(currentQuarter());
  const out: string[] = [];
  let y = start.year;
  let q = start.q;
  for (let i = 0; i < count; i++) {
    out.push(`${y}-Q${q}`);
    q -= 1;
    if (q === 0) {
      q = 4;
      y -= 1;
    }
  }
  return out;
}

function parseQuarter(s: string): { year: number; q: number } {
  const m = /^(\d{4})-Q([1-4])$/.exec(s);
  if (!m) throw new Error(`Invalid quarter: ${s}`);
  return { year: Number(m[1]), q: Number(m[2]) };
}
