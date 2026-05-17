// Parse Sporlo's custom claims out of a Supabase JWT. Supabase populates the
// JWT's `role` claim with `authenticated` by default; we add `org_id`, our
// product `role`, and (for dept_manager) `department` via a Supabase Auth Hook.
//
// The hook itself lives in the Supabase project as a database function — see
// packages/db/README.md.

import type { Role, Department } from "./permissions";

export interface SporloClaims {
  sub: string;
  email?: string;
  org_id: string | null;
  role: Role | null;
  department: Department | null;
}

interface RawClaims {
  sub?: string;
  email?: string;
  org_id?: string;
  user_role?: string;
  department?: string;
}

const ROLES: ReadonlyArray<Role> = [
  "super_admin",
  "club_admin",
  "dept_manager",
  "staff",
  "coach",
  "member",
  "auditor",
];

const DEPARTMENTS: ReadonlyArray<Department> = [
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
];

export function parseClaims(jwt: string): SporloClaims {
  const parts = jwt.split(".");
  if (parts.length !== 3 || !parts[1]) {
    throw new Error("Invalid JWT");
  }
  const payload = parts[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), "=");
  const raw = JSON.parse(
    Buffer.from(payload, "base64").toString("utf-8"),
  ) as RawClaims;

  if (!raw.sub) throw new Error("JWT missing sub");

  const role =
    raw.user_role && (ROLES as ReadonlyArray<string>).includes(raw.user_role)
      ? (raw.user_role as Role)
      : null;
  const department =
    raw.department &&
    (DEPARTMENTS as ReadonlyArray<string>).includes(raw.department)
      ? (raw.department as Department)
      : null;

  return {
    sub: raw.sub,
    email: raw.email,
    org_id: raw.org_id ?? null,
    role,
    department,
  };
}
