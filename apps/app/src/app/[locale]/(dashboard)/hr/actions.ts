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
  CertCreateSchema,
  CertDeleteSchema,
  JDCreateSchema,
  JDIdSchema,
  JDUpdateSchema,
  StaffCreateSchema,
  StaffIdSchema,
  StaffUpdateSchema,
  type CertCreateInput,
  type CertDeleteInput,
  type JDCreateInput,
  type JDUpdateInput,
  type StaffCreateInput,
  type StaffUpdateInput,
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
// Staff
// ─────────────────────────────────────────────

export async function createStaff(
  input: StaffCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = StaffCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "hr");
  if (error) return permissionError("create", "hr");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("staff_profiles")
    .insert({
      org_id: tenant!.org_id,
      full_name_ar: parsed.data.full_name_ar,
      full_name_en: parsed.data.full_name_en ?? null,
      job_title_ar: parsed.data.job_title_ar ?? null,
      job_title_en: parsed.data.job_title_en ?? null,
      department: parsed.data.department ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      manager_id: parsed.data.manager_id ?? null,
      hire_date: parsed.data.hire_date ?? null,
      bio: parsed.data.bio ?? null,
      active: parsed.data.active,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "staff_added",
    p_target_type: "staff_profile",
    p_target_id: data.id,
    p_payload: { name: parsed.data.full_name_en ?? parsed.data.full_name_ar },
  });

  revalidatePath("/[locale]/(dashboard)/hr", "page");
  return actionOk({ id: data.id as string });
}

export async function updateStaff(
  input: StaffUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = StaffUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "hr");
  if (error) return permissionError("update", "hr");

  const { id, ...patch } = parsed.data;
  // Prevent setting manager_id to self.
  if (patch.manager_id === id) return actionError("self-manager", "manager_id");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("staff_profiles")
    .update({
      full_name_ar: patch.full_name_ar,
      full_name_en: patch.full_name_en ?? null,
      job_title_ar: patch.job_title_ar ?? null,
      job_title_en: patch.job_title_en ?? null,
      department: patch.department ?? null,
      email: patch.email ?? null,
      phone: patch.phone ?? null,
      manager_id: patch.manager_id ?? null,
      hire_date: patch.hire_date ?? null,
      bio: patch.bio ?? null,
      active: patch.active,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/hr", "page");
  return actionOk(undefined);
}

export async function archiveStaff(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = StaffIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "hr");
  if (error) return permissionError("delete", "hr");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("staff_profiles")
    .update({ active: false })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  revalidatePath("/[locale]/(dashboard)/hr", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Job descriptions
// ─────────────────────────────────────────────

export async function createJD(
  input: JDCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = JDCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "hr");
  if (error) return permissionError("create", "hr");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("job_descriptions")
    .insert({
      org_id: tenant!.org_id,
      title_ar: parsed.data.title_ar,
      title_en: parsed.data.title_en,
      department: parsed.data.department ?? null,
      level: parsed.data.level ?? null,
      responsibilities_ar: parsed.data.responsibilities_ar ?? null,
      responsibilities_en: parsed.data.responsibilities_en ?? null,
      requirements_ar: parsed.data.requirements_ar ?? null,
      requirements_en: parsed.data.requirements_en ?? null,
      active: parsed.data.active,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  revalidatePath("/[locale]/(dashboard)/hr/jds", "page");
  return actionOk({ id: data.id as string });
}

export async function updateJD(
  input: JDUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = JDUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "hr");
  if (error) return permissionError("update", "hr");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("job_descriptions")
    .update({
      title_ar: patch.title_ar,
      title_en: patch.title_en,
      department: patch.department ?? null,
      level: patch.level ?? null,
      responsibilities_ar: patch.responsibilities_ar ?? null,
      responsibilities_en: patch.responsibilities_en ?? null,
      requirements_ar: patch.requirements_ar ?? null,
      requirements_en: patch.requirements_en ?? null,
      active: patch.active,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/hr/jds", "page");
  return actionOk(undefined);
}

export async function archiveJD(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = JDIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "hr");
  if (error) return permissionError("delete", "hr");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("job_descriptions")
    .update({ active: false })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  revalidatePath("/[locale]/(dashboard)/hr/jds", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Certifications
// ─────────────────────────────────────────────

export async function createCertification(
  input: CertCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CertCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "hr");
  if (error) return permissionError("update", "hr");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("certifications")
    .insert({
      org_id: tenant!.org_id,
      staff_profile_id: parsed.data.staff_profile_id,
      name: parsed.data.name,
      issuer: parsed.data.issuer ?? null,
      issued_at: parsed.data.issued_at ?? null,
      expires_at: parsed.data.expires_at ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await recordEvent({
    client: supabase,
    org_id: tenant!.org_id,
    definition: EVT.STAFF_CERTIFIED,
    qualitative_payload: {
      certification_id: data.id,
      staff_profile_id: parsed.data.staff_profile_id,
      name: parsed.data.name,
    },
  });
  await supabase.rpc("record_audit", {
    p_action: "certification_added",
    p_target_type: "certification",
    p_target_id: data.id,
    p_payload: { name: parsed.data.name },
  });

  revalidatePath("/[locale]/(dashboard)/hr/certifications", "page");
  return actionOk({ id: data.id as string });
}

export async function deleteCertification(
  input: CertDeleteInput,
): Promise<ActionResult<void>> {
  const parsed = CertDeleteSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "hr");
  if (error) return permissionError("update", "hr");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("certifications")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  revalidatePath("/[locale]/(dashboard)/hr/certifications", "page");
  return actionOk(undefined);
}
