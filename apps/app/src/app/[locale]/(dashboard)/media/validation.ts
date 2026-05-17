import { z } from "@sporlo/shared";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SlugSchema = z.string().min(2).max(80).regex(SLUG_RE);

// ─── Public pages ────────────────────────────────────────────────────────

export const PageCreateSchema = z.object({
  slug: SlugSchema,
  title_ar: z.string().min(2).max(200),
  title_en: z.string().min(2).max(200),
  body_ar: z.string().max(20000).optional().or(z.literal("")),
  body_en: z.string().max(20000).optional().or(z.literal("")),
  hero_image_path: z.string().max(500).optional().or(z.literal("")),
  published: z.boolean().default(false),
});
export type PageCreateInput = z.infer<typeof PageCreateSchema>;

export const PageUpdateSchema = PageCreateSchema.extend({
  id: z.string().uuid(),
});
export type PageUpdateInput = z.infer<typeof PageUpdateSchema>;

export const PageIdSchema = z.object({ id: z.string().uuid() });

// ─── News articles ────────────────────────────────────────────────────────

export const ArticleCreateSchema = z.object({
  slug: SlugSchema,
  title_ar: z.string().min(2).max(200),
  title_en: z.string().min(2).max(200),
  excerpt_ar: z.string().max(500).optional().or(z.literal("")),
  excerpt_en: z.string().max(500).optional().or(z.literal("")),
  body_ar: z.string().max(50000).optional().or(z.literal("")),
  body_en: z.string().max(50000).optional().or(z.literal("")),
  cover_image_path: z.string().max(500).optional().or(z.literal("")),
  publish_now: z.boolean().default(false),
});
export type ArticleCreateInput = z.infer<typeof ArticleCreateSchema>;

export const ArticleUpdateSchema = ArticleCreateSchema.extend({
  id: z.string().uuid(),
});
export type ArticleUpdateInput = z.infer<typeof ArticleUpdateSchema>;

export const ArticleIdSchema = z.object({ id: z.string().uuid() });

// ─── Broadcasts ────────────────────────────────────────────────────────

export const BroadcastCreateSchema = z.object({
  channel: z.enum(["sms", "email", "both"]),
  audience: z.enum(["members", "staff", "all"]),
  subject: z.string().max(200).optional().or(z.literal("")),
  body_ar: z.string().min(1).max(4000),
  body_en: z.string().max(4000).optional().or(z.literal("")),
});
export type BroadcastCreateInput = z.infer<typeof BroadcastCreateSchema>;

export const BroadcastSendSchema = z.object({
  id: z.string().uuid(),
});

// ─── Notification prefs ────────────────────────────────────────────────────────

export const PrefsUpdateSchema = z.object({
  member_id: z.string().uuid(),
  email_opt_in: z.boolean(),
  sms_opt_in: z.boolean(),
  whatsapp_opt_in: z.boolean(),
});
export type PrefsUpdateInput = z.infer<typeof PrefsUpdateSchema>;

// ─── Messages ────────────────────────────────────────────────────────

export const ThreadCreateSchema = z.object({
  subject: z.string().min(2).max(200),
  member_id: z.string().uuid().optional().or(z.literal("")),
  initial_body: z.string().min(1).max(4000),
});
export type ThreadCreateInput = z.infer<typeof ThreadCreateSchema>;

export const MessageCreateSchema = z.object({
  thread_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
});
export type MessageCreateInput = z.infer<typeof MessageCreateSchema>;

export const ThreadResolveSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "resolved", "archived"]),
});
export type ThreadResolveInput = z.infer<typeof ThreadResolveSchema>;
