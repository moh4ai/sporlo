"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";
import { EVT, recordEvent } from "@sporlo/governance";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

import {
  RosterCreateSchema,
  RosterRemoveSchema,
  RosterUpdateSchema,
  SquadCreateSchema,
  SquadIdSchema,
  SquadUpdateSchema,
  TrainingCancelSchema,
  TrainingCreateSchema,
  type RosterCreateInput,
  type RosterRemoveInput,
  type RosterUpdateInput,
  type SquadCreateInput,
  type SquadUpdateInput,
  type TrainingCancelInput,
  type TrainingCreateInput,
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
// Squads
// ─────────────────────────────────────────────

export async function createSquad(
  input: SquadCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = SquadCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "team");
  if (error) return permissionError("create", "team");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("squads")
    .insert({
      org_id: tenant!.org_id,
      name_ar: parsed.data.name_ar,
      name_en: parsed.data.name_en,
      season: parsed.data.season ?? null,
      sport_type: parsed.data.sport_type,
      active: parsed.data.active,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.SQUAD_REGISTERED,
    qualitative_payload: { squad_id: data.id, name: parsed.data.name_en },
  });
  await supabase.rpc("record_audit", {
    p_action: "squad_created",
    p_target_type: "squad",
    p_target_id: data.id,
    p_payload: { name: parsed.data.name_en },
  });

  revalidatePath("/[locale]/(dashboard)/team", "page");
  return actionOk({ id: data.id as string });
}

export async function updateSquad(
  input: SquadUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = SquadUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "team");
  if (error) return permissionError("update", "team");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("squads")
    .update({
      name_ar: patch.name_ar,
      name_en: patch.name_en,
      season: patch.season ?? null,
      sport_type: patch.sport_type,
      active: patch.active,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath(`/[locale]/(dashboard)/team/${id}`, "page");
  revalidatePath("/[locale]/(dashboard)/team", "page");
  return actionOk(undefined);
}

export async function archiveSquad(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = SquadIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "team");
  if (error) return permissionError("delete", "team");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("squads")
    .update({ active: false })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/team", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Roster
// ─────────────────────────────────────────────

export async function addRosterEntry(
  input: RosterCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = RosterCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "team");
  if (error) return permissionError("update", "team");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("roster_entries")
    .insert({
      org_id: tenant!.org_id,
      squad_id: parsed.data.squad_id,
      member_id: parsed.data.member_id ?? null,
      full_name_ar: parsed.data.full_name_ar,
      full_name_en: parsed.data.full_name_en ?? null,
      jersey_number: parsed.data.jersey_number ?? null,
      position: parsed.data.position ?? null,
      date_of_birth: parsed.data.date_of_birth ?? null,
      nationality: parsed.data.nationality ?? null,
    })
    .select("id")
    .single();
  if (insErr || !data) {
    if (insErr?.code === "23505") return actionError("jersey-taken", "jersey_number");
    return actionError(insErr?.message ?? "insert-failed");
  }

  await supabase.rpc("record_audit", {
    p_action: "roster_entry_added",
    p_target_type: "roster_entry",
    p_target_id: data.id,
    p_payload: { squad_id: parsed.data.squad_id, name: parsed.data.full_name_en },
  });

  revalidatePath(`/[locale]/(dashboard)/team/${parsed.data.squad_id}`, "page");
  return actionOk({ id: data.id as string });
}

export async function updateRosterEntry(
  input: RosterUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = RosterUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "team");
  if (error) return permissionError("update", "team");

  const { id, squad_id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("roster_entries")
    .update({
      member_id: patch.member_id ?? null,
      full_name_ar: patch.full_name_ar,
      full_name_en: patch.full_name_en ?? null,
      jersey_number: patch.jersey_number ?? null,
      position: patch.position ?? null,
      date_of_birth: patch.date_of_birth ?? null,
      nationality: patch.nationality ?? null,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) {
    if (updErr.code === "23505") return actionError("jersey-taken", "jersey_number");
    return actionError(updErr.message);
  }

  revalidatePath(`/[locale]/(dashboard)/team/${squad_id}`, "page");
  return actionOk(undefined);
}

export async function removeRosterEntry(
  input: RosterRemoveInput,
): Promise<ActionResult<void>> {
  const parsed = RosterRemoveSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "team");
  if (error) return permissionError("update", "team");

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("roster_entries")
    .select("id, squad_id")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!row) return actionError("not-found");

  // Soft-remove: set active=false to preserve historical stats.
  await supabase
    .from("roster_entries")
    .update({ active: false })
    .eq("id", row.id);

  await supabase.rpc("record_audit", {
    p_action: "roster_entry_removed",
    p_target_type: "roster_entry",
    p_target_id: row.id,
    p_payload: {},
  });

  revalidatePath(`/[locale]/(dashboard)/team/${row.squad_id}`, "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Training plans
// ─────────────────────────────────────────────

export async function createTrainingPlan(
  input: TrainingCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = TrainingCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "team");
  if (error) return permissionError("update", "team");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("training_plans")
    .insert({
      org_id: tenant!.org_id,
      squad_id: parsed.data.squad_id,
      title_ar: parsed.data.title_ar,
      title_en: parsed.data.title_en,
      scheduled_at: parsed.data.scheduled_at,
      duration_minutes: parsed.data.duration_minutes,
      facility_id: parsed.data.facility_id ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.TRAINING_HELD,
    qualitative_payload: {
      training_plan_id: data.id,
      squad_id: parsed.data.squad_id,
    },
    occurred_at: new Date(parsed.data.scheduled_at),
  });
  await supabase.rpc("record_audit", {
    p_action: "training_plan_created",
    p_target_type: "training_plan",
    p_target_id: data.id,
    p_payload: { squad_id: parsed.data.squad_id, title: parsed.data.title_en },
  });

  revalidatePath(`/[locale]/(dashboard)/team/${parsed.data.squad_id}`, "page");
  return actionOk({ id: data.id as string });
}

export async function cancelTrainingPlan(
  input: TrainingCancelInput,
): Promise<ActionResult<void>> {
  const parsed = TrainingCancelSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "team");
  if (error) return permissionError("update", "team");

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("training_plans")
    .select("id, squad_id, cancelled_at")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!row) return actionError("not-found");
  if (row.cancelled_at) return actionError("already-cancelled");

  await supabase
    .from("training_plans")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", row.id);

  await supabase.rpc("record_audit", {
    p_action: "training_plan_cancelled",
    p_target_type: "training_plan",
    p_target_id: row.id,
    p_payload: {},
  });

  revalidatePath(`/[locale]/(dashboard)/team/${row.squad_id}`, "page");
  return actionOk(undefined);
}
