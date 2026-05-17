-- Sporlo Sprint 0 — Day 2 schema
-- Full multi-tenant schema with RLS. Applied via `supabase db push` or via the
-- Supabase SQL editor on a fresh project. See packages/db/README.md.
--
-- Tenancy invariant: every row in a tenant-scoped table carries `org_id`. RLS
-- restricts reads/writes to rows where `org_id` matches the caller's JWT claim.
-- Super Admin (Sporlo HQ) bypasses this via a separate policy on the same tables.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Helper functions for RLS
-- ─────────────────────────────────────────────

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', '')::uuid
$$;

create or replace function public.current_role_claim()
returns text
language sql
stable
as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'role'
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_role_claim() = 'super_admin', false)
$$;

-- ─────────────────────────────────────────────
-- Tenant root: organizations + branches
-- ─────────────────────────────────────────────

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  tier text check (tier in ('a', 'b', 'c', 'd', 'e')),
  subdomain text unique,
  custom_domain text unique,
  branding_overrides_jsonb jsonb not null default '{}'::jsonb,
  subscription_tier text not null default 'trial',
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  city text,
  created_at timestamptz not null default now()
);
create index branches_org_id_idx on public.branches(org_id);

-- ─────────────────────────────────────────────
-- People: staff users (linked to auth.users) + club members
-- ─────────────────────────────────────────────

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text,
  phone text,
  full_name_ar text,
  full_name_en text,
  role text not null check (role in (
    'super_admin', 'club_admin', 'dept_manager', 'staff', 'coach', 'member', 'auditor'
  )),
  department text check (department in (
    'finance', 'hr', 'marketing', 'sports', 'legal', 'it',
    'academy', 'events', 'csr', 'governance'
  )),
  created_at timestamptz not null default now()
);
create index users_org_id_idx on public.users(org_id);
create index users_role_idx on public.users(role);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  full_name_ar text not null,
  full_name_en text,
  email text,
  phone text,
  national_id text,
  date_of_birth date,
  created_at timestamptz not null default now()
);
create index members_org_id_idx on public.members(org_id);
create index members_branch_id_idx on public.members(branch_id);

-- ─────────────────────────────────────────────
-- Governance / KPI engine (Phase 0 seed, Phase 1+ accumulates)
-- ─────────────────────────────────────────────

-- 27+ Ministry criteria. Seeded below with 5 placeholders; full set lands in Phase 0 proper.
create table public.kpi_categories (
  code text primary key,
  category text not null check (category in ('b', 'c', 'd', 'e')),
  title_ar text not null,
  title_en text not null,
  weight numeric(5,2) not null default 1.0
);

-- Immutable append-only event log. Modules emit events; never modify them.
create table public.kpi_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  category text not null check (category in ('b', 'c', 'd', 'e')),
  criterion_code text not null references public.kpi_categories(code),
  event_type text not null,
  quantitative_value numeric,
  qualitative_payload_jsonb jsonb not null default '{}'::jsonb,
  source_module text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now()
);
create index kpi_events_org_id_idx on public.kpi_events(org_id);
create index kpi_events_criterion_idx on public.kpi_events(criterion_code);
create index kpi_events_occurred_at_idx on public.kpi_events(occurred_at desc);

create table public.governance_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  quarter text not null,
  document_type text not null,
  title_ar text not null,
  storage_path text,
  submitted_at timestamptz,
  validated_at timestamptz,
  completeness_score numeric(5,2),
  created_at timestamptz not null default now()
);
create index governance_documents_org_id_idx on public.governance_documents(org_id);

create table public.governance_deadlines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title_ar text not null,
  due_at timestamptz not null,
  warning_at timestamptz,
  satisfied_at timestamptz,
  created_at timestamptz not null default now()
);
create index governance_deadlines_org_id_idx on public.governance_deadlines(org_id);

-- Append-only audit log. Super Admin actions + governance document changes.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  org_id uuid references public.organizations(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  payload_jsonb jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_id_idx on public.audit_logs(org_id);
create index audit_logs_actor_idx on public.audit_logs(actor_user_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- ─────────────────────────────────────────────
-- RLS — enable on every tenant-scoped table
-- ─────────────────────────────────────────────
-- Pattern: tenant_isolation policy reads `org_id` from the JWT and restricts
-- both SELECT and write actions to matching rows. super_admin_override is a
-- second policy that lets Sporlo HQ act across tenants (audit-logged at the
-- application layer).

alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.users enable row level security;
alter table public.members enable row level security;
alter table public.kpi_categories enable row level security;
alter table public.kpi_events enable row level security;
alter table public.governance_documents enable row level security;
alter table public.governance_deadlines enable row level security;
alter table public.audit_logs enable row level security;

-- organizations: a tenant sees only their own org row; super_admin sees all.
create policy organizations_tenant_select on public.organizations
  for select using (id = public.current_org_id());
create policy organizations_super_admin_all on public.organizations
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Generic tenant_isolation policies (SELECT + INSERT + UPDATE + DELETE).
create policy branches_tenant on public.branches
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy branches_super_admin on public.branches
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy users_tenant on public.users
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy users_super_admin on public.users
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy members_tenant on public.members
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy members_super_admin on public.members
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- kpi_categories is global reference data — readable by every authenticated user.
create policy kpi_categories_read on public.kpi_categories
  for select using (auth.role() = 'authenticated');
create policy kpi_categories_super_admin_write on public.kpi_categories
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy kpi_events_tenant on public.kpi_events
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy kpi_events_super_admin on public.kpi_events
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy governance_documents_tenant on public.governance_documents
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy governance_documents_super_admin on public.governance_documents
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy governance_deadlines_tenant on public.governance_deadlines
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy governance_deadlines_super_admin on public.governance_deadlines
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- audit_logs: tenants see their own; super_admin sees all; inserts allowed via
-- service-role from the application layer only.
create policy audit_logs_tenant_select on public.audit_logs
  for select using (org_id = public.current_org_id());
create policy audit_logs_super_admin_all on public.audit_logs
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- Seed: 5 placeholder Ministry criteria (full 27+ lands in Phase 0 proper)
-- ─────────────────────────────────────────────

insert into public.kpi_categories (code, category, title_ar, title_en, weight) values
  ('B1', 'b', 'الحوكمة المؤسسية', 'Institutional governance', 1.5),
  ('B2', 'b', 'إفصاح الميزانية الفصلية', 'Quarterly financial disclosure', 1.0),
  ('C1', 'c', 'تطوير الأكاديميات الرياضية', 'Sports academy development', 1.2),
  ('D1', 'd', 'المسؤولية المجتمعية', 'Community engagement', 0.8),
  ('E1', 'e', 'استدامة البنية التحتية', 'Infrastructure sustainability', 1.0);
