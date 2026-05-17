import { EmailSchema, UuidSchema, z } from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// ─────────────────────────────────────────────
// Staff profiles
// ─────────────────────────────────────────────

export const StaffCreateSchema = z.object({
  full_name_ar: z.string().trim().min(1).max(120),
  full_name_en: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  job_title_ar: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  job_title_en: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  department: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  email: z.preprocess(emptyToUndef, EmailSchema.optional()),
  phone: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  manager_id: z.preprocess(emptyToUndef, UuidSchema.optional()),
  hire_date: z.preprocess(emptyToUndef, z.string().date().optional()),
  bio: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  active: z.boolean().default(true),
});

export const StaffUpdateSchema = StaffCreateSchema.extend({
  id: UuidSchema,
});

export const StaffIdSchema = z.object({ id: UuidSchema });

export type StaffCreateInput = z.infer<typeof StaffCreateSchema>;
export type StaffUpdateInput = z.infer<typeof StaffUpdateSchema>;

// ─────────────────────────────────────────────
// Job descriptions
// ─────────────────────────────────────────────

export const JDCreateSchema = z.object({
  title_ar: z.string().trim().min(1).max(120),
  title_en: z.string().trim().min(1).max(120),
  department: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  level: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  responsibilities_ar: z.preprocess(emptyToUndef, z.string().max(4000).optional()),
  responsibilities_en: z.preprocess(emptyToUndef, z.string().max(4000).optional()),
  requirements_ar: z.preprocess(emptyToUndef, z.string().max(4000).optional()),
  requirements_en: z.preprocess(emptyToUndef, z.string().max(4000).optional()),
  active: z.boolean().default(true),
});

export const JDUpdateSchema = JDCreateSchema.extend({
  id: UuidSchema,
});

export const JDIdSchema = z.object({ id: UuidSchema });

export type JDCreateInput = z.infer<typeof JDCreateSchema>;
export type JDUpdateInput = z.infer<typeof JDUpdateSchema>;

// ─────────────────────────────────────────────
// Certifications
// ─────────────────────────────────────────────

export const CertCreateSchema = z.object({
  staff_profile_id: UuidSchema,
  name: z.string().trim().min(1).max(120),
  issuer: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  issued_at: z.preprocess(emptyToUndef, z.string().date().optional()),
  expires_at: z.preprocess(emptyToUndef, z.string().date().optional()),
  notes: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export const CertDeleteSchema = z.object({ id: UuidSchema });

export type CertCreateInput = z.infer<typeof CertCreateSchema>;
export type CertDeleteInput = z.infer<typeof CertDeleteSchema>;
