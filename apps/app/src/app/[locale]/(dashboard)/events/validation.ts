import {
  BilingualNameSchema,
  EmailSchema,
  PositiveIntSchema,
  SarAmountSchema,
  UuidSchema,
  z,
} from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

export const FixtureStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const FixtureCreateSchema = z.object({
  opponent_ar: z.string().trim().min(1).max(120),
  opponent_en: z.string().trim().min(1).max(120),
  kickoff_at: z.string().datetime({ offset: true }),
  venue: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  sport_type: z.string().trim().max(40).default("football"),
  status: FixtureStatusSchema.default("scheduled"),
});

export const FixtureUpdateSchema = FixtureCreateSchema.extend({
  id: UuidSchema,
  home_score: z.preprocess(emptyToUndef, PositiveIntSchema.optional()),
  away_score: z.preprocess(emptyToUndef, PositiveIntSchema.optional()),
});

export const FixtureIdSchema = z.object({ id: UuidSchema });

export type FixtureCreateInput = z.infer<typeof FixtureCreateSchema>;
export type FixtureUpdateInput = z.infer<typeof FixtureUpdateSchema>;

// ─────────────────────────────────────────────
// Sections + pricing
// ─────────────────────────────────────────────

export const SectionCreateSchema = z.object({
  fixture_id: UuidSchema,
  label: z.string().trim().min(1).max(40),
  rows_count: PositiveIntSchema.max(200),
  seats_per_row: PositiveIntSchema.max(200),
  display_order: z.number().int().min(0).default(0),
});

export const SectionDeleteSchema = z.object({ id: UuidSchema });

export const PricingSetSchema = z.object({
  fixture_id: UuidSchema,
  section_id: UuidSchema,
  label: z.string().trim().min(1).max(40),
  price_sar: SarAmountSchema,
  member_price_sar: z.preprocess(emptyToUndef, SarAmountSchema.optional()),
});

export type SectionCreateInput = z.infer<typeof SectionCreateSchema>;
export type SectionDeleteInput = z.infer<typeof SectionDeleteSchema>;
export type PricingSetInput = z.infer<typeof PricingSetSchema>;

// ─────────────────────────────────────────────
// Public ticket purchase
// ─────────────────────────────────────────────

export const PublicTicketIntentSchema = z.object({
  fixture_id: UuidSchema,
  section_id: UuidSchema,
  quantity: PositiveIntSchema.max(10),
  buyer_email: EmailSchema,
  buyer_phone: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  payment_method: z.enum(["moyasar", "manual"]).default("moyasar"),
});

export type PublicTicketIntentInput = z.infer<typeof PublicTicketIntentSchema>;

// ─────────────────────────────────────────────
// Gate scan
// ─────────────────────────────────────────────

export const ScanTicketSchema = z.object({
  qr_code: z.string().min(4).max(200),
});

export type ScanTicketInput = z.infer<typeof ScanTicketSchema>;

// ─────────────────────────────────────────────
// Match events
// ─────────────────────────────────────────────

export const MatchEventTypeSchema = z.enum([
  "goal",
  "own_goal",
  "penalty",
  "yellow_card",
  "red_card",
  "substitution",
  "injury",
  "note",
]);

export const MatchEventRecordSchema = z.object({
  fixture_id: UuidSchema,
  minute: z.number().int().min(0).max(200),
  type: MatchEventTypeSchema,
  team: z.enum(["home", "away"]),
  player_name: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  client_id: z.string().min(1).max(80),
  recorded_offline: z.boolean().default(false),
});

export type MatchEventRecordInput = z.infer<typeof MatchEventRecordSchema>;

// Use BilingualNameSchema for fixtures? No, opponent_ar/opponent_en are
// independently free-form here. Re-export for downstream forms anyway.
export { BilingualNameSchema };
