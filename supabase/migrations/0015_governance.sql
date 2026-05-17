-- Module 9 — Governance (Phase 3 MVP + Phase 4 full)
-- Apply via the Supabase SQL editor.
-- Builds on the existing kpi_events / kpi_categories / governance_deadlines /
-- governance_documents tables that ship in 0001_init.sql. Adds the consumer
-- side: penalty estimates, financial support estimates, appeals, and a
-- generated-reports log.

-- ─────────────────────────────────────────────
-- 1. penalty_log
--    Per-quarter, per-criterion deduction estimates. status moves
--    estimated → confirmed | waived | appealed.
-- ─────────────────────────────────────────────

create table public.penalty_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  quarter text not null,
  criterion_code text references public.kpi_categories(code),
  percent_deducted numeric(5,2) not null,
  amount_sar numeric(12,2) not null default 0,
  reason text not null,
  status text not null default 'estimated' check (status in ('estimated', 'confirmed', 'waived', 'appealed')),
  created_at timestamptz not null default now()
);
create index penalty_log_org_quarter_idx on public.penalty_log(org_id, quarter);

alter table public.penalty_log enable row level security;
create policy penalty_log_tenant on public.penalty_log
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy penalty_log_super_admin on public.penalty_log
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 2. appeal_log
--    Appeals against a penalty entry. resolution_notes filled when
--    Ministry sustains or rejects.
-- ─────────────────────────────────────────────

create table public.appeal_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  penalty_log_id uuid references public.penalty_log(id) on delete set null,
  filed_by uuid references auth.users(id) on delete set null,
  filed_at timestamptz not null default now(),
  narrative text not null,
  status text not null default 'open' check (status in ('open', 'approved', 'rejected', 'withdrawn')),
  resolved_at timestamptz,
  resolution_notes text
);
create index appeal_log_org_idx on public.appeal_log(org_id);
create index appeal_log_penalty_idx on public.appeal_log(penalty_log_id);

alter table public.appeal_log enable row level security;
create policy appeal_log_tenant on public.appeal_log
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy appeal_log_super_admin on public.appeal_log
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 3. financial_support_estimates
--    Per-quarter financial support amount Ministry would pay the club based
--    on tier + quarterly score. Filled by computeFinancialSupport().
-- ─────────────────────────────────────────────

create table public.financial_support_estimates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  quarter text not null,
  tier text check (tier in ('a', 'b', 'c', 'd', 'e')),
  amount_sar numeric(12,2) not null default 0,
  total_score numeric(10,2),
  basis_jsonb jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, quarter)
);
create index financial_support_org_idx on public.financial_support_estimates(org_id);

alter table public.financial_support_estimates enable row level security;
create policy fin_support_tenant on public.financial_support_estimates
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy fin_support_super_admin on public.financial_support_estimates
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 4. ministry_reports
--    Generated PDF/Excel exports for the Ministry. The actual file lives in
--    Storage; this table just tracks generation + submission.
-- ─────────────────────────────────────────────

create table public.ministry_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  quarter text not null,
  format text not null check (format in ('pdf', 'xlsx')),
  storage_path text,
  total_score numeric(10,2),
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index ministry_reports_org_quarter_idx on public.ministry_reports(org_id, quarter);

alter table public.ministry_reports enable row level security;
create policy ministry_reports_tenant on public.ministry_reports
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy ministry_reports_super_admin on public.ministry_reports
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 5. Seed the rest of the Ministry criteria (Phase 3 extends the 5 from init)
--    on conflict do nothing so re-applies are safe.
-- ─────────────────────────────────────────────

insert into public.kpi_categories (code, category, title_ar, title_en, weight) values
  ('B3', 'b', 'الإفصاح عن الرعاة', 'Sponsorship disclosure', 0.8),
  ('B4', 'b', 'الضوابط المالية', 'Financial controls', 1.0),
  ('C2', 'c', 'برامج التطوع المجتمعي', 'Community volunteering programmes', 1.0),
  ('C3', 'c', 'استقطاب الشباب', 'Youth recruitment', 1.0),
  ('D2', 'd', 'الفعاليات الجماهيرية', 'Fan engagement events', 0.8),
  ('D3', 'd', 'البرامج النسائية', 'Women''s programmes', 1.2),
  ('E2', 'e', 'كفاءة المرافق', 'Facility utilisation', 1.0),
  ('E3', 'e', 'صيانة المنشآت', 'Facility maintenance', 0.8),
  ('E4', 'e', 'تطوير الكوادر', 'Staff development', 1.0)
on conflict (code) do nothing;
