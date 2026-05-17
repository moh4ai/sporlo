"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import { actionError, actionOk, type ActionResult } from "@sporlo/shared";
import {
  EVT,
  computeQuarterlyScore,
  estimateFinancialSupport,
  estimatePenalty,
  recordEvent,
} from "@sporlo/governance";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

import {
  AppealCreateSchema,
  AppealResolveSchema,
  DeadlineCreateSchema,
  DeadlineIdSchema,
  GenerateReportSchema,
  RecomputeScoreSchema,
  SatisfyDeadlineSchema,
  SubmitReportSchema,
  type AppealCreateInput,
  type AppealResolveInput,
  type DeadlineCreateInput,
  type GenerateReportInput,
  type RecomputeScoreInput,
} from "./validation";

function permissionError(action: string, resource: string): ActionResult<never> {
  return actionError(`permission-denied:${action}:${resource}`);
}

async function withPrincipal(
  action: Parameters<typeof requirePrincipal>[1],
  resource: Parameters<typeof requirePrincipal>[2],
) {
  const tenant = await getActiveTenant();
  try {
    requirePrincipal(
      { role: tenant.user_role, department: tenant.department },
      action,
      resource,
    );
  } catch (err) {
    if (err instanceof PermissionDeniedError) return { tenant: null, error: err };
    throw err;
  }
  return { tenant, error: null };
}

// ─────────────────────────────────────────────
// Deadlines
// ─────────────────────────────────────────────

export async function createDeadline(
  input: DeadlineCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = DeadlineCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "governance_deadline");
  if (error) return permissionError("create", "governance_deadline");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("governance_deadlines")
    .insert({
      org_id: tenant!.org_id,
      title_ar: parsed.data.title_ar,
      due_at: parsed.data.due_at,
      warning_at: parsed.data.warning_at || null,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "deadline_created",
    p_target_type: "governance_deadline",
    p_target_id: data.id,
    p_payload: { title: parsed.data.title_ar },
  });

  revalidatePath("/[locale]/(dashboard)/governance/deadlines", "page");
  return actionOk({ id: data.id as string });
}

export async function satisfyDeadline(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = SatisfyDeadlineSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "governance_deadline");
  if (error) return permissionError("update", "governance_deadline");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("governance_deadlines")
    .update({ satisfied_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/governance/deadlines", "page");
  return actionOk(undefined);
}

export async function deleteDeadline(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = DeadlineIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "governance_deadline");
  if (error) return permissionError("delete", "governance_deadline");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("governance_deadlines")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  revalidatePath("/[locale]/(dashboard)/governance/deadlines", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Appeals
// ─────────────────────────────────────────────

export async function fileAppeal(
  input: AppealCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = AppealCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "appeal");
  if (error) return permissionError("create", "appeal");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("appeal_log")
    .insert({
      org_id: tenant!.org_id,
      penalty_log_id: parsed.data.penalty_log_id || null,
      filed_by: tenant!.user_id,
      narrative: parsed.data.narrative,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  // If tied to a penalty, mark penalty as appealed.
  if (parsed.data.penalty_log_id) {
    await supabase
      .from("penalty_log")
      .update({ status: "appealed" })
      .eq("id", parsed.data.penalty_log_id)
      .eq("org_id", tenant!.org_id);
  }

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.APPEAL_FILED,
    qualitative_payload: { appeal_id: data.id },
  });
  await supabase.rpc("record_audit", {
    p_action: "appeal_filed",
    p_target_type: "appeal",
    p_target_id: data.id,
    p_payload: { penalty_log_id: parsed.data.penalty_log_id ?? null },
  });

  revalidatePath("/[locale]/(dashboard)/governance/appeals", "page");
  return actionOk({ id: data.id as string });
}

export async function resolveAppeal(
  input: AppealResolveInput,
): Promise<ActionResult<void>> {
  const parsed = AppealResolveSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "appeal");
  if (error) return permissionError("update", "appeal");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("appeal_log")
    .update({
      status: parsed.data.status,
      resolution_notes: parsed.data.resolution_notes || null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "appeal_resolved",
    p_target_type: "appeal",
    p_target_id: parsed.data.id,
    p_payload: { status: parsed.data.status },
  });

  revalidatePath("/[locale]/(dashboard)/governance/appeals", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Recompute quarterly score (snapshots penalty + financial support tables)
// ─────────────────────────────────────────────

export async function recomputeQuarterlyScore(
  input: RecomputeScoreInput,
): Promise<ActionResult<{ total_score: number; penalty_sar: number; support_sar: number }>> {
  const parsed = RecomputeScoreSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "governance");
  if (error) return permissionError("update", "governance");

  const supabase = await createSupabaseServerClient();

  const score = await computeQuarterlyScore({
    client: supabase,
    org_id: tenant!.org_id,
    quarter: parsed.data.quarter,
  });

  const support = await estimateFinancialSupport({
    client: supabase,
    org_id: tenant!.org_id,
    quarter: parsed.data.quarter,
  });

  // Upsert financial support estimate (unique on org_id + quarter).
  await supabase.from("financial_support_estimates").upsert(
    {
      org_id: tenant!.org_id,
      quarter: parsed.data.quarter,
      tier: support.tier,
      amount_sar: support.amount_sar,
      total_score: support.total_score,
      basis_jsonb: {
        ceiling: support.ceiling,
        score_ratio: support.score_ratio,
        categories: score.categories,
      },
    },
    { onConflict: "org_id,quarter" },
  );

  const penalty = await estimatePenalty({
    client: supabase,
    org_id: tenant!.org_id,
    quarter: parsed.data.quarter,
  });

  // Wipe + re-insert estimated penalty lines for this quarter. Confirmed/
  // waived/appealed entries are preserved by status filter.
  await supabase
    .from("penalty_log")
    .delete()
    .eq("org_id", tenant!.org_id)
    .eq("quarter", parsed.data.quarter)
    .eq("status", "estimated");

  if (penalty.breakdown.length > 0) {
    const rows = penalty.breakdown.map((line) => ({
      org_id: tenant!.org_id,
      quarter: parsed.data.quarter,
      criterion_code: line.criterion_code,
      percent_deducted: line.percent,
      amount_sar: 0,
      reason: line.reason,
      status: "estimated" as const,
    }));
    await supabase.from("penalty_log").insert(rows);
  }

  await supabase.rpc("record_audit", {
    p_action: "score_recomputed",
    p_target_type: "governance",
    p_target_id: null,
    p_payload: { quarter: parsed.data.quarter, total_score: score.total_score },
  });

  revalidatePath("/[locale]/(dashboard)/governance", "page");
  return actionOk({
    total_score: score.total_score,
    penalty_sar: penalty.amount_sar,
    support_sar: support.amount_sar,
  });
}

// ─────────────────────────────────────────────
// Ministry report (Phase 4)
// ─────────────────────────────────────────────

export async function generateMinistryReport(
  input: GenerateReportInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = GenerateReportSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "ministry_report");
  if (error) return permissionError("create", "ministry_report");

  const supabase = await createSupabaseServerClient();

  const score = await computeQuarterlyScore({
    client: supabase,
    org_id: tenant!.org_id,
    quarter: parsed.data.quarter,
  });

  const { data, error: insErr } = await supabase
    .from("ministry_reports")
    .insert({
      org_id: tenant!.org_id,
      quarter: parsed.data.quarter,
      format: parsed.data.format,
      total_score: score.total_score,
      generated_by: tenant!.user_id,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.REPORT_GENERATED,
    qualitative_payload: {
      report_id: data.id,
      format: parsed.data.format,
      quarter: parsed.data.quarter,
    },
  });
  await supabase.rpc("record_audit", {
    p_action: "report_generated",
    p_target_type: "ministry_report",
    p_target_id: data.id,
    p_payload: { quarter: parsed.data.quarter, format: parsed.data.format },
  });

  revalidatePath("/[locale]/(dashboard)/governance/reports", "page");
  return actionOk({ id: data.id as string });
}

export async function markReportSubmitted(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = SubmitReportSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "governance");
  if (error) return permissionError("update", "governance");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("ministry_reports")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  revalidatePath("/[locale]/(dashboard)/governance/reports", "page");
  return actionOk(undefined);
}
