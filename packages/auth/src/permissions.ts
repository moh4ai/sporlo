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
  | "hr"
  | "account"
  | "users"
  | "settings"
  | "integrations"
  | "fans";

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
  "account",
  "users",
  "settings",
  "integrations",
  "fans",
];

export interface Principal {
  role: Role;
  department?: Department | null;
}

export function visibleModules(p: Principal): ReadonlyArray<ModuleKey> {
  // Every staff role gets the personal Settings entry. Members are excluded
  // — they live in the member portal, not the dashboard.
  const withSettings = (mods: ReadonlyArray<ModuleKey>): ReadonlyArray<ModuleKey> =>
    mods.includes("settings") ? mods : [...mods, "settings"];

  switch (p.role) {
    case "super_admin":
    case "club_admin":
      return ALL_MODULES;
    case "auditor":
      return withSettings(["governance"]);
    case "dept_manager":
      return withSettings(p.department ? DEPT_MODULES[p.department] : []);
    case "coach":
      return withSettings(["team", "academy"]);
    case "staff":
      return withSettings(["governance"]);
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
  | "hospitality_package"
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
  | "penalty"
  | "appeal"
  | "ministry_report"
  | "public_page"
  | "news_article"
  | "media_gallery"
  | "broadcast"
  | "notification_pref"
  | "message_thread"
  | "message"
  | "audit_log"
  | "revenue_summary"
  | "finance_summary"
  | "member_pii"
  | "user"
  | "invitation"
  | "integration"
  | "fan_portal"
  | "honour"
  | "sponsor"
  | "stadium";

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
  events: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "sports" || p.department === "events")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "coach" ||
      (p.role === "dept_manager" &&
        (p.department === "sports" || p.department === "events")),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "events"),
  },
  finance: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "finance"),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "finance"),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "finance"),
  },
  store: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "store"),
  },
  facilities: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "events" || p.department === "sports")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "events" || p.department === "sports")),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "facilities"),
  },
  team: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "sports"),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "coach" ||
      (p.role === "dept_manager" && p.department === "sports"),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "team"),
  },
  academy: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "academy"),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "coach" ||
      (p.role === "dept_manager" && p.department === "academy"),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "academy"),
  },
  hr: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "hr"),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "hr"),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "hr"),
  },
  governance: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "legal")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "legal")),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "governance") || p.role === "auditor",
    export: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "auditor" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "legal")),
  },
  governance_deadline: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "legal")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "legal")),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "governance") || p.role === "auditor",
  },
  penalty: {
    create: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin"],
    read: (p) => canAccessModule(p, "governance") || p.role === "auditor",
  },
  appeal: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "legal")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "legal")),
    read: (p) => canAccessModule(p, "governance") || p.role === "auditor",
  },
  ministry_report: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "legal")),
    read: (p) => canAccessModule(p, "governance") || p.role === "auditor",
    export: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "auditor" ||
      (p.role === "dept_manager" &&
        (p.department === "governance" || p.department === "legal")),
  },
  audit_log: {
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "auditor",
  },
  // Account module — org-level config. Only club_admin + super_admin.
  // `update` covers every editable field (name, branding, subdomain, archive
  // flag). No `create` (orgs are created via super-admin onboarding) and no
  // `delete` (archive is an update; hard-delete is super-admin-only).
  account: {
    read: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin"],
  },
  // Users module entry visibility — only club_admin + super_admin see the
  // sidebar link. dept_manager keeps a read scope on individual `user`
  // resources below (to power a future dept-scoped roster view).
  users: {
    read: ["super_admin", "club_admin"],
  },
  // Per-user row CRUD. Invitations are a separate resource so revoking
  // doesn't require the same blast radius as editing a teammate.
  user: {
    create: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin", "club_admin"],
    read: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "dept_manager",
  },
  invitation: {
    create: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin", "club_admin"],
    read: ["super_admin", "club_admin"],
  },
  // Settings — everyone with a dashboard seat can read/update their own
  // settings row. The Server Action enforces "you can only touch your own
  // user_id" so coarse-grained "*" is safe here.
  settings: {
    read: "*",
    update: "*",
  },
  // Integrations module — club_admin + super_admin only. Real provider
  // wiring lands in Phase 3+; for now this gates the catalog + the
  // install/uninstall affordances.
  integrations: {
    read: ["super_admin", "club_admin"],
  },
  integration: {
    create: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin", "club_admin"],
    read: ["super_admin", "club_admin"],
  },
  // Fan portal settings — club_admin manages which sections fans see on
  // /welcome and which news/products are pinned to position 0.
  fans: {
    read: ["super_admin", "club_admin"],
  },
  fan_portal: {
    read: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
  },
  honour: {
    create: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin", "club_admin"],
    read: ["super_admin", "club_admin"],
  },
  sponsor: {
    create: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
    delete: ["super_admin", "club_admin"],
    read: ["super_admin", "club_admin"],
  },
  stadium: {
    read: ["super_admin", "club_admin"],
    update: ["super_admin", "club_admin"],
  },
  hospitality_package: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "events" || p.department === "marketing")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "events" || p.department === "marketing")),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "events"),
  },
  media: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "marketing" || p.department === "csr")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "marketing" || p.department === "csr")),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "media"),
  },
  public_page: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "media"),
  },
  news_article: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "marketing" || p.department === "csr")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "marketing" || p.department === "csr")),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "media"),
  },
  broadcast: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "media"),
  },
  media_gallery: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "marketing" || p.department === "csr")),
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" &&
        (p.department === "marketing" || p.department === "csr")),
    delete: ["super_admin", "club_admin"],
    read: (p) => canAccessModule(p, "media"),
  },
  notification_pref: {
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      (p.role === "dept_manager" && p.department === "marketing"),
    read: (p) => canAccessModule(p, "media"),
  },
  message_thread: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "dept_manager" ||
      p.role === "staff" ||
      p.role === "member",
    update: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "dept_manager" ||
      p.role === "staff",
    read: (p) =>
      canAccessModule(p, "media") ||
      p.role === "member" ||
      p.role === "staff",
  },
  message: {
    create: (p) =>
      p.role === "super_admin" ||
      p.role === "club_admin" ||
      p.role === "dept_manager" ||
      p.role === "staff" ||
      p.role === "member",
    read: (p) =>
      canAccessModule(p, "media") ||
      p.role === "member" ||
      p.role === "staff",
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
