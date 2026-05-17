import { z } from "@sporlo/shared";

const QUARTER_RE = /^\d{4}-Q[1-4]$/;

export const QuarterSchema = z.string().regex(QUARTER_RE);

export const DeadlineCreateSchema = z.object({
  title_ar: z.string().min(2).max(200),
  due_at: z.string().min(1),
  warning_at: z.string().optional().or(z.literal("")),
});
export type DeadlineCreateInput = z.infer<typeof DeadlineCreateSchema>;

export const DeadlineIdSchema = z.object({
  id: z.string().uuid(),
});

export const SatisfyDeadlineSchema = z.object({
  id: z.string().uuid(),
});

export const AppealCreateSchema = z.object({
  penalty_log_id: z.string().uuid().optional().or(z.literal("")),
  narrative: z.string().min(10).max(4000),
});
export type AppealCreateInput = z.infer<typeof AppealCreateSchema>;

export const AppealResolveSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "withdrawn"]),
  resolution_notes: z.string().max(2000).optional().or(z.literal("")),
});
export type AppealResolveInput = z.infer<typeof AppealResolveSchema>;

export const RecomputeScoreSchema = z.object({
  quarter: z.string().regex(QUARTER_RE),
});
export type RecomputeScoreInput = z.infer<typeof RecomputeScoreSchema>;

export const GenerateReportSchema = z.object({
  quarter: z.string().regex(QUARTER_RE),
  format: z.enum(["pdf", "xlsx"]),
});
export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;

export const SubmitReportSchema = z.object({
  id: z.string().uuid(),
});
