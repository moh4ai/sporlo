import { SlugSchema, UuidSchema, z } from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// Hex colour (#rgb or #rrggbb). Optional, so empty string becomes undefined.
const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use #rgb or #rrggbb");

// FQDN — at least one dot, ASCII letters/digits/hyphens per label, no
// trailing dot, no scheme. We're lenient on length (255 is the practical max).
const DomainSchema = z
  .string()
  .regex(
    /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
    "Enter a bare domain (no http://, no trailing slash)",
  );

// Optional URL — empty string → undefined, otherwise must parse as a URL.
const OptionalUrlSchema = z.preprocess(
  emptyToUndef,
  z.string().url().max(500).optional(),
);

// Each social handle is a full URL (twitter.com/handle, instagram.com/handle).
// Empty fields are stripped server-side before persisting.
export const SocialLinksSchema = z.object({
  twitter: OptionalUrlSchema,
  instagram: OptionalUrlSchema,
  tiktok: OptionalUrlSchema,
  youtube: OptionalUrlSchema,
  facebook: OptionalUrlSchema,
  snapchat: OptionalUrlSchema,
  linkedin: OptionalUrlSchema,
  whatsapp: OptionalUrlSchema,
});

export type SocialLinks = z.infer<typeof SocialLinksSchema>;

export const OrgUpdateSchema = z.object({
  name_ar: z.string().trim().min(1).max(200),
  name_en: z.string().trim().min(1).max(200),
  tagline_ar: z.preprocess(emptyToUndef, z.string().max(280).optional()),
  tagline_en: z.preprocess(emptyToUndef, z.string().max(280).optional()),
  subdomain: z.preprocess(emptyToUndef, SlugSchema.optional()),
  custom_domain: z.preprocess(emptyToUndef, DomainSchema.optional()),
  primary_color: z.preprocess(emptyToUndef, HexColorSchema.optional()),
  social: SocialLinksSchema.optional(),
  app_store_url: OptionalUrlSchema,
  play_store_url: OptionalUrlSchema,
  newsletter_provider: z.preprocess(
    emptyToUndef,
    z.enum(["mailchimp", "resend", "brevo"]).optional(),
  ),
});

export const OrgArchiveSchema = z.object({ id: UuidSchema });

export type OrgUpdateInput = z.infer<typeof OrgUpdateSchema>;
