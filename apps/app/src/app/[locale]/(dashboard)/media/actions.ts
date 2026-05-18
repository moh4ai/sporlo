"use server";

import { revalidatePath } from "next/cache";

import { PermissionDeniedError, requirePrincipal } from "@sporlo/auth";
import { actionError, actionOk, type ActionResult } from "@sporlo/shared";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";

import {
  ArticleCreateSchema,
  ArticleIdSchema,
  ArticleUpdateSchema,
  BroadcastCreateSchema,
  BroadcastSendSchema,
  MessageCreateSchema,
  PageCreateSchema,
  PageIdSchema,
  PageUpdateSchema,
  PrefsUpdateSchema,
  ThreadCreateSchema,
  ThreadResolveSchema,
  type ArticleCreateInput,
  type ArticleUpdateInput,
  type BroadcastCreateInput,
  type MessageCreateInput,
  type PageCreateInput,
  type PageUpdateInput,
  type PrefsUpdateInput,
  type ThreadCreateInput,
  type ThreadResolveInput,
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
// Public pages
// ─────────────────────────────────────────────

export async function createPage(
  input: PageCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = PageCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "public_page");
  if (error) return permissionError("create", "public_page");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("public_pages")
    .insert({
      org_id: tenant!.org_id,
      slug: parsed.data.slug,
      title_ar: parsed.data.title_ar,
      title_en: parsed.data.title_en,
      body_ar: parsed.data.body_ar || null,
      body_en: parsed.data.body_en || null,
      hero_image_path: parsed.data.hero_image_path || null,
      published: parsed.data.published,
    })
    .select("id")
    .single();
  if (insErr || !data) {
    if (insErr?.code === "23505") return actionError("slug-taken", "slug");
    return actionError(insErr?.message ?? "insert-failed");
  }

  await supabase.rpc("record_audit", {
    p_action: "page_created",
    p_target_type: "public_page",
    p_target_id: data.id,
    p_payload: { slug: parsed.data.slug },
  });

  revalidatePath("/[locale]/(dashboard)/media", "page");
  return actionOk({ id: data.id as string });
}

export async function updatePage(
  input: PageUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = PageUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "public_page");
  if (error) return permissionError("update", "public_page");

  const supabase = await createSupabaseServerClient();
  const { id, ...patch } = parsed.data;
  const { error: updErr } = await supabase
    .from("public_pages")
    .update({
      slug: patch.slug,
      title_ar: patch.title_ar,
      title_en: patch.title_en,
      body_ar: patch.body_ar || null,
      body_en: patch.body_en || null,
      hero_image_path: patch.hero_image_path || null,
      published: patch.published,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) {
    if (updErr.code === "23505") return actionError("slug-taken", "slug");
    return actionError(updErr.message);
  }

  revalidatePath("/[locale]/(dashboard)/media", "page");
  return actionOk(undefined);
}

export async function deletePage(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = PageIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "public_page");
  if (error) return permissionError("delete", "public_page");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("public_pages")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  revalidatePath("/[locale]/(dashboard)/media", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// News articles
// ─────────────────────────────────────────────

export async function createArticle(
  input: ArticleCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = ArticleCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "news_article");
  if (error) return permissionError("create", "news_article");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("news_articles")
    .insert({
      org_id: tenant!.org_id,
      slug: parsed.data.slug,
      title_ar: parsed.data.title_ar,
      title_en: parsed.data.title_en,
      excerpt_ar: parsed.data.excerpt_ar || null,
      excerpt_en: parsed.data.excerpt_en || null,
      body_ar: parsed.data.body_ar || null,
      body_en: parsed.data.body_en || null,
      cover_image_path: parsed.data.cover_image_path || null,
      published_at: parsed.data.publish_now ? new Date().toISOString() : null,
      category: parsed.data.category,
      fixture_id: parsed.data.fixture_id || null,
    })
    .select("id")
    .single();
  if (insErr || !data) {
    if (insErr?.code === "23505") return actionError("slug-taken", "slug");
    return actionError(insErr?.message ?? "insert-failed");
  }

  await supabase.rpc("record_audit", {
    p_action: parsed.data.publish_now ? "article_published" : "article_drafted",
    p_target_type: "news_article",
    p_target_id: data.id,
    p_payload: { slug: parsed.data.slug },
  });

  revalidatePath("/[locale]/(dashboard)/media/news", "page");
  return actionOk({ id: data.id as string });
}

export async function updateArticle(
  input: ArticleUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = ArticleUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "news_article");
  if (error) return permissionError("update", "news_article");

  const supabase = await createSupabaseServerClient();
  const { id, ...patch } = parsed.data;

  // Preserve existing published_at unless publish_now flips it on.
  const { data: existing } = await supabase
    .from("news_articles")
    .select("published_at")
    .eq("id", id)
    .eq("org_id", tenant!.org_id)
    .maybeSingle();
  const published_at = patch.publish_now
    ? existing?.published_at ?? new Date().toISOString()
    : null;

  const { error: updErr } = await supabase
    .from("news_articles")
    .update({
      slug: patch.slug,
      title_ar: patch.title_ar,
      title_en: patch.title_en,
      excerpt_ar: patch.excerpt_ar || null,
      excerpt_en: patch.excerpt_en || null,
      body_ar: patch.body_ar || null,
      body_en: patch.body_en || null,
      cover_image_path: patch.cover_image_path || null,
      published_at,
      category: patch.category,
      fixture_id: patch.fixture_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", tenant!.org_id);
  if (updErr) {
    if (updErr.code === "23505") return actionError("slug-taken", "slug");
    return actionError(updErr.message);
  }

  revalidatePath("/[locale]/(dashboard)/media/news", "page");
  return actionOk(undefined);
}

export async function deleteArticle(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = ArticleIdSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("delete", "news_article");
  if (error) return permissionError("delete", "news_article");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("news_articles")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);

  revalidatePath("/[locale]/(dashboard)/media/news", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Broadcasts
// ─────────────────────────────────────────────

export async function createBroadcast(
  input: BroadcastCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = BroadcastCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "broadcast");
  if (error) return permissionError("create", "broadcast");

  const supabase = await createSupabaseServerClient();

  // Count recipients up-front so the operator sees the audience size.
  const recipient_count = await countAudience(
    supabase,
    tenant!.org_id,
    parsed.data.audience,
    parsed.data.channel,
  );

  const { data, error: insErr } = await supabase
    .from("broadcasts")
    .insert({
      org_id: tenant!.org_id,
      channel: parsed.data.channel,
      audience: parsed.data.audience,
      subject: parsed.data.subject || null,
      body_ar: parsed.data.body_ar,
      body_en: parsed.data.body_en || null,
      status: "draft",
      recipient_count,
      created_by: tenant!.user_id,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  await supabase.rpc("record_audit", {
    p_action: "broadcast_drafted",
    p_target_type: "broadcast",
    p_target_id: data.id,
    p_payload: {
      channel: parsed.data.channel,
      audience: parsed.data.audience,
      recipient_count,
    },
  });

  revalidatePath("/[locale]/(dashboard)/media/broadcasts", "page");
  return actionOk({ id: data.id as string });
}

export async function queueBroadcast(
  input: { id: string },
): Promise<ActionResult<void>> {
  const parsed = BroadcastSendSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "broadcast");
  if (error) return permissionError("update", "broadcast");

  const supabase = await createSupabaseServerClient();
  // Move draft → queued. A future worker (Unifonic integration) flips it
  // to sending → sent. For now we record the intent + audit.
  const { error: updErr } = await supabase
    .from("broadcasts")
    .update({
      status: "queued",
      provider_log_jsonb: { queued_at: new Date().toISOString() },
    })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id)
    .eq("status", "draft");
  if (updErr) return actionError(updErr.message);

  await supabase.rpc("record_audit", {
    p_action: "broadcast_queued",
    p_target_type: "broadcast",
    p_target_id: parsed.data.id,
  });

  revalidatePath("/[locale]/(dashboard)/media/broadcasts", "page");
  return actionOk(undefined);
}

async function countAudience(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  org_id: string,
  audience: "members" | "staff" | "all",
  channel: "sms" | "email" | "both",
): Promise<number> {
  let total = 0;
  if (audience === "members" || audience === "all") {
    let q = supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org_id)
      .eq("status", "active");
    // No channel filter here — recipient eligibility is filtered against
    // notification_prefs at send time by the queue worker.
    void channel;
    const { count } = await q;
    total += count ?? 0;
  }
  if (audience === "staff" || audience === "all") {
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org_id);
    total += count ?? 0;
  }
  return total;
}

// ─────────────────────────────────────────────
// Notification prefs
// ─────────────────────────────────────────────

export async function updateNotificationPrefs(
  input: PrefsUpdateInput,
): Promise<ActionResult<void>> {
  const parsed = PrefsUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "notification_pref");
  if (error) return permissionError("update", "notification_pref");

  const supabase = await createSupabaseServerClient();
  const { error: upErr } = await supabase
    .from("notification_prefs")
    .upsert(
      {
        org_id: tenant!.org_id,
        member_id: parsed.data.member_id,
        email_opt_in: parsed.data.email_opt_in,
        sms_opt_in: parsed.data.sms_opt_in,
        whatsapp_opt_in: parsed.data.whatsapp_opt_in,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" },
    );
  if (upErr) return actionError(upErr.message);

  revalidatePath("/[locale]/(dashboard)/media/prefs", "page");
  return actionOk(undefined);
}

// ─────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────

export async function createThread(
  input: ThreadCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = ThreadCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "message_thread");
  if (error) return permissionError("create", "message_thread");

  const supabase = await createSupabaseServerClient();
  const { data, error: insErr } = await supabase
    .from("message_threads")
    .insert({
      org_id: tenant!.org_id,
      subject: parsed.data.subject,
      member_id: parsed.data.member_id || null,
      staff_user_id: tenant!.user_id,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  const { error: msgErr } = await supabase.from("messages").insert({
    org_id: tenant!.org_id,
    thread_id: data.id,
    sender_role: "staff",
    sender_user_id: tenant!.user_id,
    body: parsed.data.initial_body,
  });
  if (msgErr) return actionError(msgErr.message);

  revalidatePath("/[locale]/(dashboard)/media/messages", "page");
  return actionOk({ id: data.id as string });
}

export async function postMessage(
  input: MessageCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = MessageCreateSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("create", "message");
  if (error) return permissionError("create", "message");

  const supabase = await createSupabaseServerClient();
  const sender_role: "staff" | "member" =
    tenant!.user_role === "member" ? "member" : "staff";

  const { data, error: insErr } = await supabase
    .from("messages")
    .insert({
      org_id: tenant!.org_id,
      thread_id: parsed.data.thread_id,
      sender_role,
      sender_user_id: tenant!.user_id,
      body: parsed.data.body,
    })
    .select("id")
    .single();
  if (insErr || !data) return actionError(insErr?.message ?? "insert-failed");

  revalidatePath(`/[locale]/(dashboard)/media/messages/${parsed.data.thread_id}`, "page");
  return actionOk({ id: data.id as string });
}

export async function setThreadStatus(
  input: ThreadResolveInput,
): Promise<ActionResult<void>> {
  const parsed = ThreadResolveSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { tenant, error } = await withPrincipal("update", "message_thread");
  if (error) return permissionError("update", "message_thread");

  const supabase = await createSupabaseServerClient();
  const { error: updErr } = await supabase
    .from("message_threads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("org_id", tenant!.org_id);
  if (updErr) return actionError(updErr.message);

  revalidatePath("/[locale]/(dashboard)/media/messages", "page");
  return actionOk(undefined);
}
