-- Sporlo Phase 3 — Facilities (booking with no-overlap, maintenance windows).

create extension if not exists btree_gist;

-- ─────────────────────────────────────────────
-- 1. facilities
-- ─────────────────────────────────────────────

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name_ar text not null,
  name_en text not null,
  facility_type text,
  capacity integer,
  hourly_rate_sar numeric(10,2),
  member_hourly_rate_sar numeric(10,2),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists facilities_org_idx on public.facilities(org_id);

alter table public.facilities enable row level security;
create policy facilities_tenant on public.facilities
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy facilities_super_admin on public.facilities
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 2. facility_bookings — with no-overlap EXCLUDE constraint
-- ─────────────────────────────────────────────

create table if not exists public.facility_bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  booked_by_name text,
  booked_by_email text,
  booked_by_phone text,
  time_range tstzrange not null,
  status text not null default 'confirmed'
    check (status in ('held', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists facility_bookings_facility_idx
  on public.facility_bookings(facility_id);
create index if not exists facility_bookings_range_idx
  on public.facility_bookings using gist(time_range);

-- Prevent overlapping bookings on the same facility for active states.
-- Excludes cancelled bookings from the constraint via a partial WHERE.
alter table public.facility_bookings
  drop constraint if exists facility_bookings_no_overlap;
alter table public.facility_bookings
  add constraint facility_bookings_no_overlap
  exclude using gist (
    facility_id with =,
    time_range with &&
  ) where (status in ('held', 'confirmed'));

alter table public.facility_bookings enable row level security;
create policy facility_bookings_tenant on public.facility_bookings
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy facility_bookings_super_admin on public.facility_bookings
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 3. maintenance_windows
-- ─────────────────────────────────────────────

create table if not exists public.maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  time_range tstzrange not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists maintenance_windows_facility_idx
  on public.maintenance_windows(facility_id);
create index if not exists maintenance_windows_range_idx
  on public.maintenance_windows using gist(time_range);

alter table public.maintenance_windows enable row level security;
create policy maintenance_windows_tenant on public.maintenance_windows
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy maintenance_windows_super_admin on public.maintenance_windows
  for all using (public.is_super_admin()) with check (public.is_super_admin());
