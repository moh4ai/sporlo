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

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const HonourSchema = z.object({
  competition_ar: z.string().trim().min(1).max(120),
  competition_en: z.string().trim().min(1).max(120),
  kind: z.enum(["league", "domestic_cup", "continental", "international", "regional", "other"]),
  win_count: z.coerce.number().int().positive(),
  last_won_year: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(1900).max(2200).optional(),
  ),
  display_order: z.coerce.number().int().min(0).default(0),
});

export type HonourInput = z.infer<typeof HonourSchema>;
export const HonourIdSchema = z.object({ id: UuidSchema });

async function gate(action: Parameters<typeof requirePrincipal>[1]) {
  const tenant = await getActiveTenant();
  try {
    requirePrincipal(
      { role: tenant.user_role, department: tenant.department },
      action,
      "honour",
    );
  } catch (err) {
    if (err instanceof PermissionDeniedError) return { tenant: null, error: err };
    throw err;
  }
  return { tenant, error: null };
}

function permError(action: string): ActionResult<never> {
  return actionError(`permission-denied:${action}:honour`);
}

export async function createHonour(
  input: HonourInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = HonourSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await gate("create");
  if (error) return permError("create");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("honours")
    .insert({ ...parsed.data, org_id: tenant!.org_id })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "honour_added",
    p_target_type: "honour",
    p_target_id: data.id,
    p_payload: {
      competition_en: parsed.data.competition_en,
      win_count: parsed.data.win_count,
    },
  });

  revalidatePath("/[locale]/(dashboard)/account/honours", "page");
  revalidatePath("/[locale]/welcome", "page");
  return actionOk({ id: data.id as string });
}

export async function updateHonour(
  input: HonourInput & { id: string },
): Promise<ActionResult<void>> {
  const parsed = HonourSchema.extend({ id: UuidSchema }).safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await gate("update");
  if (error) return permError("update");

  const { id, ...patch } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("honours")
    .update(patch)
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/account/honours", "page");
  revalidatePath("/[locale]/welcome", "page");
  return actionOk(undefined);
}

export async function deleteHonour(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = HonourIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await gate("delete");
  if (error) return permError("delete");

  const supabase = await createSupabaseServerClient();
  const { error: delErr } = await supabase
    .from("honours")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (delErr) return actionError(delErr.message);

  revalidatePath("/[locale]/(dashboard)/account/honours", "page");
  revalidatePath("/[locale]/welcome", "page");
  return actionOk(undefined);
}
