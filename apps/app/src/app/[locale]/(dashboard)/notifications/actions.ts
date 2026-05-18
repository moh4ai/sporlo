"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionOk,
  type ActionResult,
} from "@sporlo/shared";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function markNotificationRead(input: {
  id: string;
}): Promise<ActionResult<void>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("no-session");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("recipient_user_id", user.id)
    .is("read_at", null);
  if (error) return actionError(error.message);

  revalidatePath("/[locale]/(dashboard)/notifications", "page");
  return actionOk(undefined);
}

export async function markAllNotificationsRead(): Promise<ActionResult<void>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("no-session");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", user.id)
    .is("read_at", null);
  if (error) return actionError(error.message);

  revalidatePath("/[locale]/(dashboard)/notifications", "page");
  return actionOk(undefined);
}
