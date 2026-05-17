// Role + department permission matrix. Server-side enforcement is in RLS
// (supabase/migrations/0001_init.sql); these helpers exist for the UI to hide
// what the user can't act on, and for API guards in route handlers.

export type Role =
  | "super_admin"
  | "club_admin"
  | "dept_manager"
  | "staff"
  | "coach"
  | "member"
  | "auditor";

export type Department =
  | "finance"
  | "hr"
  | "marketing"
  | "sports"
  | "legal"
  | "it"
  | "academy"
  | "events"
  | "csr"
  | "governance";

export type ModuleKey =
  | "governance"
  | "team"
  | "memberships"
  | "finance"
  | "facilities"
  | "academy"
  | "events"
  | "store"
  | "media"
  | "hr";

// Department -> which modules they can OPEN (read). Dept managers see a scoped
// subset; club_admin always sees all; auditor sees governance only.
const DEPT_MODULES: Record<Department, ReadonlyArray<ModuleKey>> = {
  finance: ["finance", "memberships", "governance"],
  hr: ["hr", "governance"],
  marketing: ["media", "store"],
  sports: ["team", "academy", "events"],
  legal: ["governance"],
  it: ["governance"],
  academy: ["academy"],
  events: ["events", "facilities"],
  csr: ["media", "governance"],
  governance: ["governance", "finance", "hr"],
};

const ALL_MODULES: ReadonlyArray<ModuleKey> = [
  "governance",
  "team",
  "memberships",
  "finance",
  "facilities",
  "academy",
  "events",
  "store",
  "media",
  "hr",
];

export interface Principal {
  role: Role;
  department?: Department | null;
}

export function visibleModules(p: Principal): ReadonlyArray<ModuleKey> {
  switch (p.role) {
    case "super_admin":
    case "club_admin":
      return ALL_MODULES;
    case "auditor":
      return ["governance"];
    case "dept_manager":
      return p.department ? DEPT_MODULES[p.department] : [];
    case "coach":
      return ["team", "academy"];
    case "staff":
      return ["governance"];
    case "member":
      return [];
  }
}

export function canAccessModule(p: Principal, mod: ModuleKey): boolean {
  return visibleModules(p).includes(mod);
}

// Coarse write capability — full per-action ACLs land in Phase 1.
export function canWriteOrg(p: Principal): boolean {
  return p.role === "super_admin" || p.role === "club_admin";
}

export function isReadOnly(p: Principal): boolean {
  return p.role === "auditor" || p.role === "member";
}
