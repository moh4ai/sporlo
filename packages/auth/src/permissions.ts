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

// ─────────────────────────────────────────────
// Fine-grained ACL — Phase 1+
// ─────────────────────────────────────────────

export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "approve"
  | "refund"
  | "export";

// Logical resource keys. Most are entity-level; a few are aggregate views
// (revenue_summary, finance_summary, member_pii).
export type Resource =
  | ModuleKey
  | "member"
  | "plan"
  | "subscription"
  | "payment"
  | "refund"
  | "coupon"
  | "fixture"
  | "ticket"
  | "product"
  | "order"
  | "facility"
  | "booking"
  | "session"
  | "squad_entry"
  | "staff_profile"
  | "certification"
  | "kpi_event"
  | "governance_document"
  | "governance_deadline"
  | "audit_log"
  | "revenue_summary"
  | "finance_summary"
  | "member_pii";

type Allow = Role[] | "*";
type RoleRule = Allow | ((p: Principal) => boolean);

// "*" means every role (including super_admin). Function rules let us scope
// by department (e.g. only dept_manager:finance can refund payments).
const ACL: Partial<Record<Resource, Partial<Record<Action, RoleRule>>>> = {
  // Membership module entities
  plan: {
    create: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin", "club_admin"],
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "finance" || p.department === "marketing")),
  },
  member: {
    create: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin", "club_admin"],
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "dept_manager",
  },
  subscription: {
    create: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin", "club_admin"],
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "finance"),
  },
  payment: {
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "finance"),
    refund: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "finance"),
  },
  coupon: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    delete: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "marketing" || p.department === "finance")),
  },
  revenue_summary: {
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "auditor" ||
      (p.role === "dept_manager" &&
        (p.department === "finance" || p.department === "marketing")),
    export: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "finance"),
  },
  // Aggregate finance view — never PII.
  finance_summary: {
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "auditor" ||
      (p.role === "dept_manager" && p.department === "finance"),
  },
  // Member PII — strictly limited.
  member_pii: {
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "finance" || p.department === "hr")),
    export: ["super_admin", "club_admin"],
  },
  // KPI events: emitted server-side from any module; read by anyone with
  // governance visibility. Direct mutation is governance/super_admin only.
  kpi_event: {
    read: (p) => canAccessModule(p, "governance"),
    create: ["super_admin", "club_admin"],
    update: ["super_admin"],
    delete: ["super_admin"],
  },
  governance_document: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" ||
          p.department === "legal" ||
          p.department === "finance")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "finance")),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "governance") || p.role === "auditor",
    export: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "auditor",
  },
  // Refund approval workflow: anyone with refund permission on payment can
  // request; only club_admin / super_admin can approve. Finance manager can
  // request but not self-approve (avoid one-person-circumvention).
  refund: {
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "finance"),
    approve: ["super_admin", "club_admin"],
  },
  audit_log: {
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "auditor",
  },
};

function matchAllow(allow: Allow, p: Principal): boolean {
  return allow === "*" || allow.includes(p.role);
}

export function canPerform(
  p: Principal,
  action: Action,
  resource: Resource,
): boolean {
  if (p.role === "super_admin") return true;

  // Module-level read is the fallback for resources without explicit rules.
  const rules = ACL[resource];
  if (!rules || !rules[action]) {
    if (action === "read" && isModuleKey(resource)) {
      return canAccessModule(p, resource);
    }
    return false;
  }

  const rule = rules[action]!;
  return typeof rule === "function" ? rule(p) : matchAllow(rule, p);
}

function isModuleKey(r: Resource): r is ModuleKey {
  return (ALL_MODULES as ReadonlyArray<string>).includes(r);
}

// Server guard — call from a Server Action; throws on denial. The thrown
// error message is safe to surface as the ActionResult error.
export class PermissionDeniedError extends Error {
  constructor(action: Action, resource: Resource) {
    super(`permission-denied:${action}:${resource}`);
    this.name = "PermissionDeniedError";
  }
}

export function requirePrincipal(
  p: Principal | null,
  action: Action,
  resource: Resource,
): asserts p is Principal {
  if (!p) throw new PermissionDeniedError(action, resource);
  if (!canPerform(p, action, resource)) {
    throw new PermissionDeniedError(action, resource);
  }
}

// Coarse helpers kept for backward compatibility (callers still in the codebase).
export function canWriteOrg(p: Principal): boolean {
  return p.role === "super_admin" || p.role === "club_admin";
}

export function isReadOnly(p: Principal): boolean {
  return p.role === "auditor" || p.role === "member";
}
