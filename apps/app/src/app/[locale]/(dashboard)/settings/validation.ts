import { z } from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// Personal profile fields editable from /settings. Email is read-only and
// sourced from auth.users — not part of this schema.
export const ProfileUpdateSchema = z.object({
  full_name_ar: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  full_name_en: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  phone: z.preprocess(emptyToUndef, z.string().max(40).optional()),
});

export const LocaleSchema = z.enum(["ar", "en"]);
export const DateFormatSchema = z.enum(["iso", "long", "short", "hijri"]);

export const PrefsUpdateSchema = z.object({
  preferred_locale: LocaleSchema.optional(),
  date_format: DateFormatSchema.optional(),
  high_contrast: z.boolean().optional(),
  reduced_motion: z.boolean().optional(),
});

export const NotificationPrefSchema = z.object({
  event_type: z.string().min(1).max(120),
  channel: z.enum(["email", "in_app"]),
  enabled: z.boolean(),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type PrefsUpdateInput = z.infer<typeof PrefsUpdateSchema>;
export type NotificationPrefInput = z.infer<typeof NotificationPrefSchema>;
