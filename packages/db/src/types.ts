// Hand-typed shape of the Day 2 schema. Generate the full `Database` type from
// Supabase once a project exists: `supabase gen types typescript --linked`.

export type Tier = "a" | "b" | "c" | "d" | "e";

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

export type KpiCategory = "b" | "c" | "d" | "e";

export interface Organization {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  tier: Tier | null;
  subdomain: string | null;
  custom_domain: string | null;
  branding_overrides_jsonb: Record<string, unknown>;
  subscription_tier: string;
  created_at: string;
}

export interface Branch {
  id: string;
  org_id: string;
  name_ar: string;
  name_en: string;
  city: string | null;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string | null;
  phone: string | null;
  full_name_ar: string | null;
  full_name_en: string | null;
  role: Role;
  department: Department | null;
  created_at: string;
}

export interface Member {
  id: string;
  org_id: string;
  branch_id: string | null;
  full_name_ar: string;
  full_name_en: string | null;
  email: string | null;
  phone: string | null;
  national_id: string | null;
  date_of_birth: string | null;
  created_at: string;
}

export interface KpiCategoryRow {
  code: string;
  category: KpiCategory;
  title_ar: string;
  title_en: string;
  weight: number;
}

export interface KpiEvent {
  id: string;
  org_id: string;
  branch_id: string | null;
  category: KpiCategory;
  criterion_code: string;
  event_type: string;
  quantitative_value: number | null;
  qualitative_payload_jsonb: Record<string, unknown>;
  source_module: string;
  occurred_at: string;
  recorded_at: string;
}

export interface GovernanceDocument {
  id: string;
  org_id: string;
  quarter: string;
  document_type: string;
  title_ar: string;
  storage_path: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  completeness_score: number | null;
  created_at: string;
}

export interface GovernanceDeadline {
  id: string;
  org_id: string;
  title_ar: string;
  due_at: string;
  warning_at: string | null;
  satisfied_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  org_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload_jsonb: Record<string, unknown>;
  created_at: string;
}
