"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import {
  actionError,
  actionOk,
  UuidSchema,
  z,
  type ActionResult,
} from "@sporlo/shared";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const SponsorSchema = z.object({
  name_ar: z.string().trim().min(1).max(120),
  name_en: z.string().trim().min(1).max(120),
  tier: z.enum(["strategic", "main", "official", "supporter"]),
  url: z.preprocess(emptyToUndef, z.string().url().optional()),
  display_order: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export type SponsorInput = z.infer<typeof SponsorSchema>;
export const SponsorIdSchema = z.object({ id: UuidSchema });

async function gate(action: Parameters<typeof requirePrincipal>[1]) {
  const tenant = await getActiveTenant();
  try {
    requirePrincipal(
      { role: tenant.user_role, department: tenant.department },
      action,
      "sponsor",
    );
  } catch (err) {
    if (err instanceof PermissionDeniedError) return { tenant: null, error: err };
    throw err;
  }
  return { tenant, error: null };
}

function permError(action: string): ActionResult<never> {
  return actionError(`permission-denied:${action}:sponsor`);
}

export async function createSponsor(
  input: SponsorInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = SponsorSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await gate("create");
  if (error) return permError("create");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("sponsors")
    .insert({
      org_id: tenant!.org_id,
      name_ar: parsed.data.name_ar,
      name_en: parsed.data.name_en,
      tier: parsed.data.tier,
      url: parsed.data.url ?? null,
      display_order: parsed.data.display_order,
      active: parsed.data.active,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "sponsor_added",
    p_target_type: "sponsor",
    p_target_id: data.id,
    p_payload: { tier: parsed.data.tier, name_en: parsed.data.name_en },
  });

  revalidatePath("/[locale]/(dashboard)/account/sponsors", "page");
  revalidatePath("/[locale]/welcome", "page");
  return actionOk({ id: data.id as string });
}

export async function updateSponsor(
  input: SponsorInput & { id: string },
): Promise<ActionResult<void>> {
  const parsed = SponsorSchema.extend({ id: UuidSchema }).safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await gate("update");
  if (error) return permError("update");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("sponsors")
    .update({
      name_ar: patch.name_ar,
      name_en: patch.name_en,
      tier: patch.tier,
      url: patch.url ?? null,
      display_order: patch.display_order,
      active: patch.active,
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/account/sponsors", "page");
  revalidatePath("/[locale]/welcome", "page");
  return actionOk(undefined);
}

export async function deleteSponsor(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = SponsorIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await gate("delete");
  if (error) return permError("delete");

  const supabase = await createSupabaseServerClient();
  const { error: delErr } = await supabase
    .from("sponsors")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (delErr) return actionError(delErr.message);

  revalidatePath("/[locale]/(dashboard)/account/sponsors", "page");
  revalidatePath("/[locale]/welcome", "page");
  return actionOk(undefined);
}

export async function uploadSponsorLogo(
  form: FormData,
): Promise<ActionResult<{ path: string }>> {
  const id = form.get("sponsor_id");
  if (typeof id !== "string" || !id) return actionError("missing-sponsor-id");

  const { tenant, error } = await gate("update");
  if (error) return permError("update");

  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return actionError("no-file", "logo");
  }
  if (file.size > 2 * 1024 * 1024) return actionError("too-large", "logo");
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) return actionError("invalid-type", "logo");

  const ext =
    file.type === "image/svg+xml"
      ? "svg"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
  const path = `${tenant!.org_id}/${id}-${Date.now()}.${ext}`;

  const admin = createServiceRoleClient();
  const { error: upErr } = await admin.storage
    .from("sponsor-logos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return actionError(upErr.message, "logo");

  const { error: updErr } = await admin
    .from("sponsors")
    .update({ logo_path: path })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/account/sponsors", "page");
  revalidatePath("/[locale]/welcome", "page");
  return actionOk({ path });
}
