-- Sporlo Phase 3 — HR (staff profiles, org chart, JDs, certifications).

-- ─────────────────────────────────────────────
-- 1. staff_profiles — directory + org chart
-- ─────────────────────────────────────────────

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  full_name_ar text not null,
  full_name_en text,
  job_title_ar text,
  job_title_en text,
  department text,
  email text,
  phone text,
  manager_id uuid references public.staff_profiles(id) on delete set null,
  hire_date date,
  bio text,
  photo_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists staff_profiles_org_idx on public.staff_profiles(org_id);
create index if not exists staff_profiles_manager_idx on public.staff_profiles(manager_id);

alter table public.staff_profiles enable row level security;
create policy staff_profiles_tenant on public.staff_profiles
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy staff_profiles_super_admin on public.staff_profiles
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 2. job_descriptions
-- ─────────────────────────────────────────────

create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title_ar text not null,
  title_en text not null,
  department text,
  level text,
  responsibilities_ar text,
  responsibilities_en text,
  requirements_ar text,
  requirements_en text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists job_descriptions_org_idx on public.job_descriptions(org_id);

alter table public.job_descriptions enable row level security;
create policy job_descriptions_tenant on public.job_descriptions
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy job_descriptions_super_admin on public.job_descriptions
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 3. certifications
-- ─────────────────────────────────────────────

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  name text not null,
  issuer text,
  issued_at date,
  expires_at date,
  document_path text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists certifications_staff_idx
  on public.certifications(staff_profile_id);
create index if not exists certifications_expires_idx
  on public.certifications(org_id, expires_at);

alter table public.certifications enable row level security;
create policy certifications_tenant on public.certifications
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy certifications_super_admin on public.certifications
  for all using (public.is_super_admin()) with check (public.is_super_admin());
