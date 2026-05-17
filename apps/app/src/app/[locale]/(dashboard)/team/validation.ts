import { PositiveIntSchema, UuidSchema, z } from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// ─────────────────────────────────────────────
// Squads
// ─────────────────────────────────────────────

export const SquadCreateSchema = z.object({
  name_ar: z.string().trim().min(1).max(120),
  name_en: z.string().trim().min(1).max(120),
  season: z.preprocess(emptyToUndef, z.string().max(20).optional()),
  sport_type: z.string().trim().max(40).default("football"),
  active: z.boolean().default(true),
});

export const SquadUpdateSchema = SquadCreateSchema.extend({
  id: UuidSchema,
});

export const SquadIdSchema = z.object({ id: UuidSchema });

export type SquadCreateInput = z.infer<typeof SquadCreateSchema>;
export type SquadUpdateInput = z.infer<typeof SquadUpdateSchema>;

// ─────────────────────────────────────────────
// Roster
// ─────────────────────────────────────────────

export const RosterCreateSchema = z.object({
  squad_id: UuidSchema,
  member_id: z.preprocess(emptyToUndef, UuidSchema.optional()),
  full_name_ar: z.string().trim().min(1).max(120),
  full_name_en: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  jersey_number: z.preprocess(emptyToUndef, PositiveIntSchema.max(999).optional()),
  position: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  date_of_birth: z.preprocess(emptyToUndef, z.string().date().optional()),
  nationality: z.preprocess(emptyToUndef, z.string().max(40).optional()),
});

export const RosterUpdateSchema = RosterCreateSchema.extend({
  id: UuidSchema,
});

export const RosterRemoveSchema = z.object({ id: UuidSchema });

export type RosterCreateInput = z.infer<typeof RosterCreateSchema>;
export type RosterUpdateInput = z.infer<typeof RosterUpdateSchema>;
export type RosterRemoveInput = z.infer<typeof RosterRemoveSchema>;

// ─────────────────────────────────────────────
// Training plans
// ─────────────────────────────────────────────

export const TrainingCreateSchema = z.object({
  squad_id: UuidSchema,
  title_ar: z.string().trim().min(1).max(120),
  title_en: z.string().trim().min(1).max(120),
  scheduled_at: z.string().datetime({ offset: true }),
  duration_minutes: PositiveIntSchema.max(600),
  facility_id: z.preprocess(emptyToUndef, UuidSchema.optional()),
  notes: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export const TrainingCancelSchema = z.object({ id: UuidSchema });

export type TrainingCreateInput = z.infer<typeof TrainingCreateSchema>;
export type TrainingCancelInput = z.infer<typeof TrainingCancelSchema>;
