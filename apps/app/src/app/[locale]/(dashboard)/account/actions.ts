"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

import { OrgUpdateSchema, type OrgUpdateInput } from "./validation";

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

function permissionError(action: string, resource: string): ActionResult<never> {
  return actionError(`permission-denied:${action}:${resource}`);
}

export async function updateOrganization(
  input: OrgUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = OrgUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionError(issue?.message ?? "invalid", issue?.path?.[0]?.toString());
  }
  const { tenant, error } = await withPrincipal("update", "account");
  if (error) return permissionError("update", "account");

  // Use service-role for the write because `public.organizations` RLS only
  // grants SELECT on the caller's own row; UPDATE goes through the trusted
  // server context after the ACL check above.
  // Strip empty entries out of social so we don't store a wall of empties.
  const cleanSocial: Record<string, string> = {};
  if (parsed.data.social) {
    for (const [k, v] of Object.entries(parsed.data.social)) {
      if (typeof v === "string" && v.trim() !== "") cleanSocial[k] = v;
    }
  }

  const admin = createServiceRoleClient();
  const { error: updErr } = await admin
    .from("organizations")
    .update({
      name_ar: parsed.data.name_ar,
      name_en: parsed.data.name_en,
      tagline_ar: parsed.data.tagline_ar ?? null,
      tagline_en: parsed.data.tagline_en ?? null,
      subdomain: parsed.data.subdomain ?? null,
      custom_domain: parsed.data.custom_domain ?? null,
      primary_color: parsed.data.primary_color ?? null,
      social_jsonb: cleanSocial,
      app_store_url: parsed.data.app_store_url ?? null,
      play_store_url: parsed.data.play_store_url ?? null,
      newsletter_provider: parsed.data.newsletter_provider ?? null,
    })
    .eq("id", tenant!.org_id);

  if (updErr) {
    // Supabase reports unique-violations with code 23505. Map subdomain /
    // custom_domain collisions to a friendly error the UI can surface.
    if (updErr.code === "23505") {
      const field = updErr.message.includes("subdomain")
        ? "subdomain"
        : updErr.message.includes("custom_domain")
          ? "custom_domain"
          : undefined;
      return actionError("already-taken", field);
    }
    return actionError(updErr.message);
  }

  // Audit via authenticated client so org_id resolves from the JWT.
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("record_audit", {
    p_action: "organization_updated",
    p_target_type: "organization",
    p_target_id: tenant!.org_id,
    p_payload: {
      name_ar: parsed.data.name_ar,
      name_en: parsed.data.name_en,
    },
  });

  revalidatePath("/[locale]/(dashboard)/account", "page");
  return actionOk(undefined);
}

export async function uploadOrgLogo(
  form: FormData,
): Promise<ActionResult<{ path: string }>> {
  const { tenant, error } = await withPrincipal("update", "account");
  if (error) return permissionError("update", "account");

  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return actionError("no-file", "logo");
  }
  if (file.size > 2 * 1024 * 1024) {
    return actionError("too-large", "logo");
  }
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return actionError("invalid-type", "logo");
  }

  const ext = file.type === "image/svg+xml"
    ? "svg"
    : file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${tenant!.org_id}/logo-${Date.now()}.${ext}`;

  const admin = createServiceRoleClient();
  const { error: upErr } = await admin.storage
    .from("org-branding")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return actionError(upErr.message, "logo");

  const { error: updErr } = await admin
    .from("organizations")
    .update({ logo_path: path })
    .eq("id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("record_audit", {
    p_action: "organization_logo_updated",
    p_target_type: "organization",
    p_target_id: tenant!.org_id,
    p_payload: { path },
  });

  revalidatePath("/[locale]/(dashboard)/account", "page");
  return actionOk({ path });
}

export async function archiveOrganization(): Promise<ActionResult<void>> {
  const { tenant, error } = await withPrincipal("update", "account");
  if (error) return permissionError("update", "account");

  const admin = createServiceRoleClient();
  const { error: updErr } = await admin
    .from("organizations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("record_audit", {
    p_action: "organization_archived",
    p_target_type: "organization",
    p_target_id: tenant!.org_id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/account", "page");
  return actionOk(undefined);
}

export async function unarchiveOrganization(): Promise<ActionResult<void>> {
  const { tenant, error } = await withPrincipal("update", "account");
  if (error) return permissionError("update", "account");

  const admin = createServiceRoleClient();
  const { error: updErr } = await admin
    .from("organizations")
    .update({ archived_at: null })
    .eq("id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("record_audit", {
    p_action: "organization_unarchived",
    p_target_type: "organization",
    p_target_id: tenant!.org_id,
    p_payload: {},
  });

  revalidatePath("/[locale]/(dashboard)/account", "page");
  return actionOk(undefined);
}
