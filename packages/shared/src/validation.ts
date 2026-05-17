import { z } from "zod";

// Shared primitives. Per-module entity schemas live with the module
// (e.g. apps/app/src/app/[locale]/(dashboard)/memberships/validation.ts) and
// import from here for common building blocks.

export const SlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, or hyphens");

export const UuidSchema = z.string().uuid();

export const NonEmptyStringSchema = z.string().trim().min(1);

export const PositiveIntSchema = z.number().int().positive();

export const PositiveDecimalSchema = z.number().positive().finite();

export const IsoDateTimeSchema = z.string().datetime({ offset: true });

// Money in SAR — stored as numeric(10,2) in Postgres. Accept up to 99,999,999.99.
export const SarAmountSchema = z
  .number()
  .nonnegative()
  .finite()
  .max(99_999_999.99)
  .refine((n) => Math.round(n * 100) === n * 100, "Max 2 decimal places");

// Bilingual name fields. Either may be empty as long as the other isn't.
export const BilingualNameSchema = z
  .object({
    name_ar: z.string().trim().max(200),
    name_en: z.string().trim().max(200),
  })
  .refine(
    (v) => v.name_ar.length > 0 || v.name_en.length > 0,
    "Provide at least one of name_ar / name_en",
  );

export const EmailSchema = z.string().email().max(255);

// Saudi national ID — 10 digits, first digit 1 or 2 (citizen/resident).
export const SaudiNationalIdSchema = z
  .string()
  .regex(/^[12]\d{9}$/, "National ID must be 10 digits starting with 1 or 2");

// Saudi phone — accept E.164 (+9665…) or local (05…).
export const SaudiPhoneSchema = z
  .string()
  .regex(/^(\+9665|05)\d{8}$/, "Saudi mobile must start with +9665… or 05…");

// Re-export zod for downstream packages so they don't need their own dependency.
export { z };
