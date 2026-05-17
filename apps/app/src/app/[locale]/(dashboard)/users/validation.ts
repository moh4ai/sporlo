import { EmailSchema, UuidSchema, z } from "@sporlo/shared";

const emptyToUndef = (s: unknown) =>
  typeof s === "string" && s.trim() === "" ? undefined : s;

// Roles a club_admin can grant. `super_admin` and `member` are intentionally
// excluded — super_admin is Sporlo HQ only, and member identity comes from
// the memberships flow, not from staff invites.
export const InvitableRoleSchema = z.enum([
  "club_admin",
  "dept_manager",
  "staff",
  "coach",
  "auditor",
]);

export const DepartmentSchema = z.enum([
  "finance",
  "hr",
  "marketing",
  "sports",
  "legal",
  "it",
  "academy",
  "events",
  "csr",
  "governance",
]);

export const InviteUserSchema = z.object({
  email: EmailSchema,
  role: InvitableRoleSchema,
  department: z.preprocess(emptyToUndef, DepartmentSchema.optional()),
});

export const UpdateUserSchema = z.object({
  id: UuidSchema,
  role: InvitableRoleSchema,
  department: z.preprocess(emptyToUndef, DepartmentSchema.optional()),
});

export const UserIdSchema = z.object({ id: UuidSchema });
export const InvitationIdSchema = z.object({ id: UuidSchema });

export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
