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

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

export const FanPortalSettingsSchema = z.object({
  hero_enabled: z.boolean(),
  next_match_enabled: z.boolean(),
  news_enabled: z.boolean(),
  squad_enabled: z.boolean(),
  shop_enabled: z.boolean(),
  about_enabled: z.boolean(),
  match_center_enabled: z.boolean(),
  honours_enabled: z.boolean(),
  sponsors_enabled: z.boolean(),
  galleries_enabled: z.boolean(),
  featured_news_id: z.preprocess(emptyToNull, UuidSchema.nullable()),
  featured_product_id: z.preprocess(emptyToNull, UuidSchema.nullable()),
});

export type FanPortalSettingsInput = z.infer<typeof FanPortalSettingsSchema>;

export async function updateFanPortalSettings(
  input: FanPortalSettingsInput,
): Promise<ActionResult<void>> {
  const parsed = FanPortalSettingsSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");

  const tenant = await getActiveTenant();
  try {
    requirePrincipal(
      { role: tenant.user_role, department: tenant.department },
      "update",
      "fan_portal",
    );
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return actionError(`permission-denied:update:fan_portal`);
    }
    throw err;
  }

  // Service-role upsert: the tenant policy on fan_portal_settings allows
  // self-writes, but using service-role is consistent with the other
  // org-scoped Server Actions in the app.
  const admin = createServiceRoleClient();
  const { error } = await admin.from("fan_portal_settings").upsert(
    {
      org_id: tenant.org_id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) return actionError(error.message);

  // Audit via authenticated client (org_id resolves from the JWT).
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("record_audit", {
    p_action: "fan_portal_updated",
    p_target_type: "fan_portal",
    p_target_id: tenant.org_id,
    p_payload: parsed.data,
  });

  revalidatePath("/[locale]/(dashboard)/fans", "page");
  revalidatePath("/[locale]/welcome", "page");
  return actionOk(undefined);
}
