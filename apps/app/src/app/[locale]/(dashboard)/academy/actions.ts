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
  AttendanceRecordSchema,
  CoachCreateSchema,
  CoachIdSchema,
  CoachUpdateSchema,
  ProgressNoteCreateSchema,
  ProgressNoteDeleteSchema,
  SessionCancelSchema,
  SessionCreateSchema,
  type AttendanceRecordInput,
  type CoachCreateInput,
  type CoachUpdateInput,
  type ProgressNoteCreateInput,
  type ProgressNoteDeleteInput,
  type SessionCancelInput,
  type SessionCreateInput,
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
// Coaches
// ─────────────────────────────────────────────

export async function createCoach(
  input: CoachCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CoachCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "academy");
  if (error) return permissionError("create", "academy");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("coaches")
    .insert({
      org_id: tenant!.org_id,
      full_name_ar: parsed.data.full_name_ar,
      full_name_en: parsed.data.full_name_en ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      bio: parsed.data.bio ?? null,
      active: parsed.data.active,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "coach_created",
    p_target_type: "coach",
    p_target_id: data.id,
    p_payload: { name: parsed.data.full_name_en ?? parsed.data.full_name_ar },
  });

  revalidatePath("/[locale]/(dashboard)/academy", "page");
  return actionOk({ id: data.id as string });
}

export async function updateCoach(
  input: CoachUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = CoachUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "academy");
  if (error) return permissionError("update", "academy");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("coaches")
    .update({
      full_name_ar: patch.full_name_ar,
      full_name_en: patch.full_name_en ?? null,
      email: patch.email ?? null,
      phone: patch.phone ?? null,
      bio: patch.bio ?? null,
      active: patch.active,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/academy", "page");
  return actionOk(undefined);
}

export async function archiveCoach(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = CoachIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "academy");
  if (error) return permissionError("delete", "academy");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("coaches")
    .update({ active: false })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  revalidatePath("/[locale]/(dashboard)/academy", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────

export async function createAcademySession(
  input: SessionCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = SessionCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "academy");
  if (error) return permissionError("update", "academy");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("academy_sessions")
    .insert({
      org_id: tenant!.org_id,
      title_ar: parsed.data.title_ar,
      title_en: parsed.data.title_en,
      scheduled_at: parsed.data.scheduled_at,
      duration_minutes: parsed.data.duration_minutes,
      coach_id: parsed.data.coach_id ?? null,
      facility_id: parsed.data.facility_id ?? null,
      age_group: parsed.data.age_group ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.ACADEMY_SESSION_HELD,
    qualitative_payload: { session_id: data.id, age_group: parsed.data.age_group },
    occurred_at: new Date(parsed.data.scheduled_at),
  });

  revalidatePath("/[locale]/(dashboard)/academy", "page");
  return actionOk({ id: data.id as string });
}

export async function cancelAcademySession(
  input: SessionCancelInput,
): Promise<ActionResult<void>> {
  const parsed = SessionCancelSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "academy");
  if (error) return permissionError("update", "academy");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("academy_sessions")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  revalidatePath(`/[locale]/(dashboard)/academy/${parsed.data.id}`, "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Attendance — offline-capable via @sporlo/offline + client_id idempotency
// ─────────────────────────────────────────────

export async function recordSessionAttendance(
  input: AttendanceRecordInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = AttendanceRecordSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "academy");
  if (error) return permissionError("update", "academy");

  const supabase = await createSupabaseServerClient();
  const { data, error: upErr } = await supabase
    .from("session_attendance")
    .upsert(
      {
        org_id: tenant!.org_id,
        session_id: parsed.data.session_id,
        member_id: parsed.data.member_id,
        present: parsed.data.present,
        note: parsed.data.note ?? null,
        recorded_by: tenant!.user_id,
        recorded_offline: parsed.data.recorded_offline,
        client_id: parsed.data.client_id,
      },
      { onConflict: "session_id,member_id" },
    )
    .select("id")
    .single();
  if (upErr || !data) return actionError(upErr?.message ?? "insert-failed");

  return actionOk({ id: data.id as string });
}

// ─────────────────────────────────────────────
// Progress notes
// ─────────────────────────────────────────────

export async function createProgressNote(
  input: ProgressNoteCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = ProgressNoteCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "academy");
  if (error) return permissionError("update", "academy");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("progress_notes")
    .insert({
      org_id: tenant!.org_id,
      member_id: parsed.data.member_id,
      coach_id: parsed.data.coach_id ?? null,
      session_id: parsed.data.session_id ?? null,
      note_ar: parsed.data.note_ar ?? null,
      note_en: parsed.data.note_en ?? null,
      rating: parsed.data.rating ?? null,
      parent_visible: parsed.data.parent_visible,
      created_by: tenant!.user_id,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.PARENT_ENGAGEMENT_RECORDED,
    qualitative_payload: {
      note_id: data.id,
      member_id: parsed.data.member_id,
      parent_visible: parsed.data.parent_visible,
    },
  });

  if (parsed.data.session_id) {
    revalidatePath(`/[locale]/(dashboard)/academy/${parsed.data.session_id}`, "page");
  }
  revalidatePath(`/[locale]/(dashboard)/memberships/members/${parsed.data.member_id}`, "page");
  return actionOk({ id: data.id as string });
}

export async function deleteProgressNote(
  input: ProgressNoteDeleteInput,
): Promise<ActionResult<void>> {
  const parsed = ProgressNoteDeleteSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "academy");
  if (error) return permissionError("update", "academy");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("progress_notes")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  return actionOk(undefined);
}
