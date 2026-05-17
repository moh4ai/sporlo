"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import { CATALOG } from "@sporlo/integrations/catalog";
import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

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

export async function installIntegration(
  input: { slug: string },
): Promise<ActionResult<void>> {
  const entry = CATALOG.find((c) => c.slug === input.slug);
  if (!entry) return actionError("unknown-slug", "slug");
  if (entry.availability !== "available") return actionError("coming-soon");

  const { tenant, error } = await withPrincipal("create", "integration");
  if (error) return permissionError("create", "integration");

  const supabase = await createSupabaseServerClient();
  const { error: insErr } = await supabase.from("org_integrations").upsert(
    {
      org_id: tenant!.org_id,
      integration_slug: entry.slug,
      config_jsonb: {},
      enabled: true,
      installed_by: tenant!.user_id,
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,integration_slug" },
  );
  if (insErr) return actionError(insErr.message);

  await supabase.rpc("record_audit", {
    p_action: "integration_installed",
    p_target_type: "integration",
    p_target_id: null,
    p_payload: { slug: entry.slug },
  });

  revalidatePath("/[locale]/(dashboard)/integrations", "page");
  revalidatePath(`/[locale]/(dashboard)/integrations/${entry.slug}`, "page");
  return actionOk(undefined);
}

export async function uninstallIntegration(
  input: { slug: string },
): Promise<ActionResult<void>> {
  const { tenant, error } = await withPrincipal("delete", "integration");
  if (error) return permissionError("delete", "integration");

  const supabase = await createSupabaseServerClient();
  const { error: delErr } = await supabase
    .from("org_integrations")
    .delete()
    .eq("org_id", tenant!.org_id)
    .eq("integration_slug", input.slug);
  if (delErr) return actionError(delErr.message);

  await supabase.rpc("record_audit", {
    p_action: "integration_uninstalled",
    p_target_type: "integration",
    p_target_id: null,
    p_payload: { slug: input.slug },
  });

  revalidatePath("/[locale]/(dashboard)/integrations", "page");
  revalidatePath(`/[locale]/(dashboard)/integrations/${input.slug}`, "page");
  return actionOk(undefined);
}
