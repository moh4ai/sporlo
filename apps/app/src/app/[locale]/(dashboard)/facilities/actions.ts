"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";
import { EVT, recordEvent } from "@sporlo/governance";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

import {
  BookingCancelSchema,
  BookingCreateSchema,
  FacilityCreateSchema,
  FacilityIdSchema,
  FacilityUpdateSchema,
  MaintenanceCreateSchema,
  MaintenanceDeleteSchema,
  type BookingCancelInput,
  type BookingCreateInput,
  type FacilityCreateInput,
  type FacilityUpdateInput,
  type MaintenanceCreateInput,
  type MaintenanceDeleteInput,
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
// Facilities
// ─────────────────────────────────────────────

export async function createFacility(
  input: FacilityCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = FacilityCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "facilities");
  if (error) return permissionError("create", "facilities");

  const supabase = await createSupabaseServerClient();
  const { data, error: insertErr } = await supabase
    .from("facilities")
    .insert({
      org_id: tenant!.org_id,
      name_ar: parsed.data.name_ar,
      name_en: parsed.data.name_en,
      facility_type: parsed.data.facility_type ?? null,
      capacity: parsed.data.capacity ?? null,
      hourly_rate_sar: parsed.data.hourly_rate_sar ?? null,
      member_hourly_rate_sar: parsed.data.member_hourly_rate_sar ?? null,
      notes: parsed.data.notes ?? null,
      active: parsed.data.active,
    })
    .select("id")
    .single();
  if (insertErr || !data) return actionError(insertErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "facility_created",
    p_target_type: "facility",
    p_target_id: data.id,
    p_payload: { name: parsed.data.name_en },
  });

  revalidatePath("/[locale]/(dashboard)/facilities", "page");
  return actionOk({ id: data.id as string });
}

export async function updateFacility(
  input: FacilityUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = FacilityUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "facilities");
  if (error) return permissionError("update", "facilities");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("facilities")
    .update({
      name_ar: patch.name_ar,
      name_en: patch.name_en,
      facility_type: patch.facility_type ?? null,
      capacity: patch.capacity ?? null,
      hourly_rate_sar: patch.hourly_rate_sar ?? null,
      member_hourly_rate_sar: patch.member_hourly_rate_sar ?? null,
      notes: patch.notes ?? null,
      active: patch.active,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath(`/[locale]/(dashboard)/facilities/${id}`, "page");
  return actionOk(undefined);
}

export async function archiveFacility(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = FacilityIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "facilities");
  if (error) return permissionError("delete", "facilities");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("facilities")
    .update({ active: false })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "facility_archived",
    p_target_type: "facility",
    p_target_id: parsed.data.id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/facilities", "page");
  return actionOk(undefined);
}

export async function uploadFacilityImage(
  form: FormData,
): Promise<ActionResult<{ path: string }>> {
  const id = form.get("facility_id");
  if (typeof id !== "string" || !id) return actionError("missing-facility-id");

  const { tenant, error } = await withPrincipal("update", "facilities");
  if (error) return permissionError("update", "facilities");

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return actionError("no-file", "image");
  }
  if (file.size > 5 * 1024 * 1024) return actionError("too-large", "image");
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) return actionError("invalid-type", "image");

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${tenant!.org_id}/${id}-${Date.now()}.${ext}`;

  const admin = createServiceRoleClient();
  const { error: upErr } = await admin.storage
    .from("facility-images")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return actionError(upErr.message, "image");

  const { error: updErr } = await admin
    .from("facilities")
    .update({ image_path: path })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/facilities", "page");
  revalidatePath(`/[locale]/(dashboard)/facilities/${id}`, "page");
  return actionOk({ path });
}

// ─────────────────────────────────────────────
// Bookings
// ─────────────────────────────────────────────

function makeRange(starts_at: string, ends_at: string): string {
  // Postgres tstzrange literal: "[lower,upper)"
  return `[${starts_at},${ends_at})`;
}

export async function createBooking(
  input: BookingCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = BookingCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "facilities");
  if (error) return permissionError("update", "facilities");

  const startsAt = new Date(parsed.data.starts_at);
  const endsAt = new Date(parsed.data.ends_at);
  if (endsAt <= startsAt) return actionError("invalid-range", "ends_at");

  const supabase = await createSupabaseServerClient();

  // Check maintenance windows overlap manually (not covered by the EXCLUDE
  // constraint, which is scoped to facility_bookings only).
  const { data: maintenance } = await supabase
    .from("maintenance_windows")
    .select("id")
    .eq("facility_id", parsed.data.facility_id)
    .overlaps("time_range", makeRange(parsed.data.starts_at, parsed.data.ends_at))
    .limit(1);
  if (maintenance && maintenance.length > 0) {
    return actionError("maintenance-conflict");
  }

  const { data, error: insErr } = await supabase
    .from("facility_bookings")
    .insert({
      org_id: tenant!.org_id,
      facility_id: parsed.data.facility_id,
      member_id: parsed.data.member_id ?? null,
      booked_by_name: parsed.data.booked_by_name ?? null,
      booked_by_email: parsed.data.booked_by_email ?? null,
      booked_by_phone: parsed.data.booked_by_phone ?? null,
      time_range: makeRange(parsed.data.starts_at, parsed.data.ends_at),
      status: "confirmed",
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (insErr || !data) {
    // Postgres exclusion-constraint violation = 23P01.
    if (insErr?.code === "23P01") return actionError("time-conflict");
    return actionError(insErr?.message ?? "insert-failed");
  }

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.FACILITY_BOOKED,
    qualitative_payload: {
      booking_id: data.id,
      facility_id: parsed.data.facility_id,
    },
  });
  await supabase.rpc("record_audit", {
    p_action: "facility_booked",
    p_target_type: "facility_booking",
    p_target_id: data.id,
    p_payload: {
      facility_id: parsed.data.facility_id,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
    },
  });

  revalidatePath(`/[locale]/(dashboard)/facilities/${parsed.data.facility_id}`, "page");
  return actionOk({ id: data.id as string });
}

export async function cancelBooking(
  input: BookingCancelInput,
): Promise<ActionResult<void>> {
  const parsed = BookingCancelSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "facilities");
  if (error) return permissionError("update", "facilities");

  const supabase = await createSupabaseServerClient();
  const { data: booking } = await supabase
    .from("facility_bookings")
    .select("id, facility_id, status")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!booking) return actionError("booking-not-found");
  if (booking.status === "cancelled") return actionError("already-cancelled");

  await supabase
    .from("facility_bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id);

  await supabase.rpc("record_audit", {
    p_action: "facility_booking_cancelled",
    p_target_type: "facility_booking",
    p_target_id: booking.id,
    p_payload: {},
  });

  revalidatePath(`/[locale]/(dashboard)/facilities/${booking.facility_id}`, "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Maintenance windows
// ─────────────────────────────────────────────

export async function createMaintenance(
  input: MaintenanceCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = MaintenanceCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "facilities");
  if (error) return permissionError("update", "facilities");

  const startsAt = new Date(parsed.data.starts_at);
  const endsAt = new Date(parsed.data.ends_at);
  if (endsAt <= startsAt) return actionError("invalid-range", "ends_at");

  const supabase = await createSupabaseServerClient();

  // Block creation if there's an active booking that overlaps. Otherwise
  // an admin could schedule maintenance on top of paying customers.
  const { data: bookings } = await supabase
    .from("facility_bookings")
    .select("id")
    .eq("facility_id", parsed.data.facility_id)
    .in("status", ["held", "confirmed"])
    .overlaps("time_range", makeRange(parsed.data.starts_at, parsed.data.ends_at))
    .limit(1);
  if (bookings && bookings.length > 0) {
    return actionError("booking-conflict");
  }

  const { data, error: insErr } = await supabase
    .from("maintenance_windows")
    .insert({
      org_id: tenant!.org_id,
      facility_id: parsed.data.facility_id,
      time_range: makeRange(parsed.data.starts_at, parsed.data.ends_at),
      reason: parsed.data.reason ?? null,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "maintenance_scheduled",
    p_target_type: "maintenance_window",
    p_target_id: data.id,
    p_payload: {
      facility_id: parsed.data.facility_id,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
    },
  });

  revalidatePath(`/[locale]/(dashboard)/facilities/${parsed.data.facility_id}`, "page");
  return actionOk({ id: data.id as string });
}

export async function deleteMaintenance(
  input: MaintenanceDeleteInput,
): Promise<ActionResult<void>> {
  const parsed = MaintenanceDeleteSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "facilities");
  if (error) return permissionError("update", "facilities");

  const supabase = await createSupabaseServerClient();
  const { data: mw } = await supabase
    .from("maintenance_windows")
    .select("id, facility_id")
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  if (!mw) return actionError("not-found");

  await supabase.from("maintenance_windows").delete().eq("id", mw.id);

  await supabase.rpc("record_audit", {
    p_action: "maintenance_removed",
    p_target_type: "maintenance_window",
    p_target_id: mw.id,
    p_payload: {},
  });

  revalidatePath(`/[locale]/(dashboard)/facilities/${mw.facility_id}`, "page");
  return actionOk(undefined);
}
