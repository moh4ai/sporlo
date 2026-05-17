import {
  EmailSchema,
  PositiveIntSchema,
  SarAmountSchema,
  UuidSchema,
  z,
} from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// ─────────────────────────────────────────────
// Facilities
// ─────────────────────────────────────────────

export const FacilityCreateSchema = z.object({
  name_ar: z.string().trim().min(1).max(120),
  name_en: z.string().trim().min(1).max(120),
  facility_type: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  capacity: z.preprocess(emptyToUndef, PositiveIntSchema.optional()),
  hourly_rate_sar: z.preprocess(emptyToUndef, SarAmountSchema.optional()),
  member_hourly_rate_sar: z.preprocess(emptyToUndef, SarAmountSchema.optional()),
  notes: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  active: z.boolean().default(true),
});

export const FacilityUpdateSchema = FacilityCreateSchema.extend({
  id: UuidSchema,
});

export const FacilityIdSchema = z.object({ id: UuidSchema });

export type FacilityCreateInput = z.infer<typeof FacilityCreateSchema>;
export type FacilityUpdateInput = z.infer<typeof FacilityUpdateSchema>;

// ─────────────────────────────────────────────
// Bookings
// ─────────────────────────────────────────────

export const BookingCreateSchema = z.object({
  facility_id: UuidSchema,
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  member_id: z.preprocess(emptyToUndef, UuidSchema.optional()),
  booked_by_name: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  booked_by_email: z.preprocess(emptyToUndef, EmailSchema.optional()),
  booked_by_phone: z.preprocess(emptyToUndef, z.string().max(40).optional()),
  notes: z.preprocess(emptyToUndef, z.string().max(500).optional()),
});

export const BookingCancelSchema = z.object({ id: UuidSchema });

export type BookingCreateInput = z.infer<typeof BookingCreateSchema>;
export type BookingCancelInput = z.infer<typeof BookingCancelSchema>;

// ─────────────────────────────────────────────
// Maintenance windows
// ─────────────────────────────────────────────

export const MaintenanceCreateSchema = z.object({
  facility_id: UuidSchema,
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  reason: z.preprocess(emptyToUndef, z.string().max(200).optional()),
});

export const MaintenanceDeleteSchema = z.object({ id: UuidSchema });

export type MaintenanceCreateInput = z.infer<typeof MaintenanceCreateSchema>;
export type MaintenanceDeleteInput = z.infer<typeof MaintenanceDeleteSchema>;
