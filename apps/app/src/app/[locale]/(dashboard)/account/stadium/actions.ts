"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import {
  actionError,
  actionOk,
  z,
  type ActionResult,
} from "@sporlo/shared";

import { createServiceRoleClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

export const StadiumSchema = z.object({
  name_ar: z.preprocess(emptyToNull, z.string().max(200).nullable()),
  name_en: z.preprocess(emptyToNull, z.string().max(200).nullable()),
  address_ar: z.preprocess(emptyToNull, z.string().max(500).nullable()),
  address_en: z.preprocess(emptyToNull, z.string().max(500).nullable()),
  city_ar: z.preprocess(emptyToNull, z.string().max(100).nullable()),
  city_en: z.preprocess(emptyToNull, z.string().max(100).nullable()),
  capacity: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce.number().int().positive().nullable(),
  ),
  opened_year: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce.number().int().min(1800).max(2200).nullable(),
  ),
  map_lat: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce.number().min(-90).max(90).nullable(),
  ),
  map_lng: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce.number().min(-180).max(180).nullable(),
  ),
  parking_notes_ar: z.preprocess(emptyToNull, z.string().max(2000).nullable()),
  parking_notes_en: z.preprocess(emptyToNull, z.string().max(2000).nullable()),
  accessibility_notes_ar: z.preprocess(emptyToNull, z.string().max(2000).nullable()),
  accessibility_notes_en: z.preprocess(emptyToNull, z.string().max(2000).nullable()),
});

export type StadiumInput = z.infer<typeof StadiumSchema>;

export async function updateStadiumInfo(
  input: StadiumInput,
): Promise<ActionResult<void>> {
  const parsed = StadiumSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");

  const tenant = await getActiveTenant();
  try {
    requirePrincipal(
      { role: tenant.user_role, department: tenant.department },
      "update",
      "stadium",
    );
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return actionError("permission-denied:update:stadium");
    }
    throw err;
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.from("stadium_info").upsert(
    {
      org_id: tenant.org_id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) return actionError(error.message);

  revalidatePath("/[locale]/(dashboard)/account/stadium", "page");
  revalidatePath("/[locale]/welcome/stadium", "page");
  return actionOk(undefined);
}
