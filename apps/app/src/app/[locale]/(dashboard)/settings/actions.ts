"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

import {
  NotificationPrefSchema,
  PrefsUpdateSchema,
  ProfileUpdateSchema,
  type NotificationPrefInput,
  type PrefsUpdateInput,
  type ProfileUpdateInput,
} from "./validation";

// Every Settings action targets the caller's own row only. ACL is "read/update
// for everyone" because the action body scopes by tenant.user_id — no extra
// authorisation needed.

export async function updateProfile(
  input: ProfileUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = ProfileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionError(issue?.message ?? "invalid", issue?.path?.[0]?.toString());
  }
  const tenant = await getActiveTenant();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("users")
    .update({
      full_name_ar: parsed.data.full_name_ar ?? null,
      full_name_en: parsed.data.full_name_en ?? null,
      phone: parsed.data.phone ?? null,
    })
    .eq("id", tenant.user_id);
  if (error) return actionError(error.message);

  revalidatePath("/[locale]/(dashboard)/settings", "page");
  return actionOk(undefined);
}

export async function updatePrefs(
  input: PrefsUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = PrefsUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionError(issue?.message ?? "invalid", issue?.path?.[0]?.toString());
  }
  const tenant = await getActiveTenant();
  const supabase = await createSupabaseServerClient();

  // Merge into existing prefs_jsonb so partial updates don't clobber other
  // keys (e.g. saving Appearance shouldn't reset Localisation).
  const { data: existing } = await supabase
    .from("user_settings")
    .select("prefs_jsonb")
    .eq("user_id", tenant.user_id)
    .maybeSingle();

  const merged = {
    ...((existing?.prefs_jsonb as Record<string, unknown> | null) ?? {}),
    ...Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    ),
  };

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: tenant.user_id,
      prefs_jsonb: merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return actionError(error.message);

  revalidatePath("/[locale]/(dashboard)/settings", "page");
  return actionOk(undefined);
}

export async function setNotificationPref(
  input: NotificationPrefInput,
): Promise<ActionResult<void>> {
  const parsed = NotificationPrefSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionError(issue?.message ?? "invalid", issue?.path?.[0]?.toString());
  }
  const tenant = await getActiveTenant();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("user_notification_prefs").upsert(
    {
      user_id: tenant.user_id,
      event_type: parsed.data.event_type,
      channel: parsed.data.channel,
      enabled: parsed.data.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,event_type,channel" },
  );
  if (error) return actionError(error.message);

  revalidatePath("/[locale]/(dashboard)/settings", "page");
  return actionOk(undefined);
}

export async function signOutEverywhere(): Promise<ActionResult<void>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) return actionError(error.message);
  return actionOk(undefined);
}
