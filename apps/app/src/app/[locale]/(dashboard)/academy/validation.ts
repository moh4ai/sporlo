import { PositiveIntSchema, UuidSchema, z, EmailSchema } from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// ─────────────────────────────────────────────
// Coaches
// ─────────────────────────────────────────────

export const CoachCreateSchema = z.object({
  full_name_ar: z.string().trim().min(1).max(120),
  full_name_en: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  email: z.preprocess(emptyToUndef, EmailSchema.optional()),
  phone: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  bio: z.preprocess(emptyToUndef, z.string().max(1000).optional()),
  active: z.boolean().default(true),
});

export const CoachUpdateSchema = CoachCreateSchema.extend({
  id: UuidSchema,
});

export const CoachIdSchema = z.object({ id: UuidSchema });

export type CoachCreateInput = z.infer<typeof CoachCreateSchema>;
export type CoachUpdateInput = z.infer<typeof CoachUpdateSchema>;

// ─────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────

export const SessionCreateSchema = z.object({
  title_ar: z.string().trim().min(1).max(120),
  title_en: z.string().trim().min(1).max(120),
  scheduled_at: z.string().datetime({ offset: true }),
  duration_minutes: PositiveIntSchema.max(600),
  coach_id: z.preprocess(emptyToUndef, UuidSchema.optional()),
  facility_id: z.preprocess(emptyToUndef, UuidSchema.optional()),
  age_group: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  notes: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export const SessionCancelSchema = z.object({ id: UuidSchema });

export type SessionCreateInput = z.infer<typeof SessionCreateSchema>;
export type SessionCancelInput = z.infer<typeof SessionCancelSchema>;

// ─────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────

export const AttendanceRecordSchema = z.object({
  session_id: UuidSchema,
  member_id: UuidSchema,
  present: z.boolean(),
  note: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  client_id: z.string().min(1).max(80),
  recorded_offline: z.boolean().default(false),
});

export type AttendanceRecordInput = z.infer<typeof AttendanceRecordSchema>;

// ─────────────────────────────────────────────
// Progress notes
// ─────────────────────────────────────────────

export const ProgressNoteCreateSchema = z.object({
  member_id: UuidSchema,
  coach_id: z.preprocess(emptyToUndef, UuidSchema.optional()),
  session_id: z.preprocess(emptyToUndef, UuidSchema.optional()),
  note_ar: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  note_en: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  rating: z.preprocess(emptyToUndef, z.number().int().min(1).max(5).optional()),
  parent_visible: z.boolean().default(true),
});

export const ProgressNoteDeleteSchema = z.object({ id: UuidSchema });

export type ProgressNoteCreateInput = z.infer<typeof ProgressNoteCreateSchema>;
export type ProgressNoteDeleteInput = z.infer<typeof ProgressNoteDeleteSchema>;
