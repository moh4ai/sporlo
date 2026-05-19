import type { SupabaseClient } from "@supabase/supabase-js";

// Resolve a media reference to a renderable URL. Public-facing columns like
// news_articles.cover_image_path and roster_entries.photo_path were initially
// seeded with full URLs but the column names imply Supabase Storage paths.
// This helper accepts both: pass-through for anything that already looks like
// a URL, otherwise hand off to storage.getPublicUrl on the named bucket.
export function resolvePublicMediaSrc(
  value: string | null | undefined,
  admin: SupabaseClient,
  bucket: string,
): string | null {
  if (!value) return null;
  if (/^(https?:|data:|blob:|\/)/.test(value)) return value;
  return admin.storage.from(bucket).getPublicUrl(value).data.publicUrl;
}
