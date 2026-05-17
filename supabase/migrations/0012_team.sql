-- Sporlo Phase 3 — Team (squads, roster, training plans, player stats).

-- ─────────────────────────────────────────────
-- 1. squads
-- ─────────────────────────────────────────────

create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name_ar text not null,
  name_en text not null,
  season text,
  sport_type text not null default 'football',
  coach_user_id uuid references public.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists squads_org_idx on public.squads(org_id);
create index if not exists squads_active_idx on public.squads(org_id, active) where active = true;

alter table public.squads enable row level security;
create policy squads_tenant on public.squads
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy squads_super_admin on public.squads
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy squads_public_read on public.squads
  for select to anon using (active = true);

-- ─────────────────────────────────────────────
-- 2. roster_entries
-- ─────────────────────────────────────────────

create table if not exists public.roster_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  squad_id uuid not null references public.squads(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  full_name_ar text not null,
  full_name_en text,
  jersey_number integer,
  position text,
  date_of_birth date,
  nationality text,
  photo_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists roster_entries_squad_idx on public.roster_entries(squad_id);
create unique index if not exists roster_entries_jersey_uniq
  on public.roster_entries(squad_id, jersey_number)
  where jersey_number is not null and active = true;

alter table public.roster_entries enable row level security;
create policy roster_entries_tenant on public.roster_entries
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy roster_entries_super_admin on public.roster_entries
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy roster_entries_public_read on public.roster_entries
  for select to anon using (active = true);

-- ─────────────────────────────────────────────
-- 3. training_plans
-- ─────────────────────────────────────────────

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  squad_id uuid not null references public.squads(id) on delete cascade,
  title_ar text not null,
  title_en text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  facility_id uuid references public.facilities(id) on delete set null,
  notes text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists training_plans_squad_idx on public.training_plans(squad_id);
create index if not exists training_plans_scheduled_idx
  on public.training_plans(org_id, scheduled_at desc);

alter table public.training_plans enable row level security;
create policy training_plans_tenant on public.training_plans
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy training_plans_super_admin on public.training_plans
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 4. player_stats (per-fixture per-player tallies)
-- ─────────────────────────────────────────────

create table if not exists public.player_stats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  roster_entry_id uuid not null references public.roster_entries(id) on delete cascade,
  fixture_id uuid references public.fixtures(id) on delete set null,
  minutes_played integer not null default 0,
  goals integer not null default 0,
  assists integer not null default 0,
  yellow_cards integer not null default 0,
  red_cards integer not null default 0,
  created_at timestamptz not null default now(),
  unique (roster_entry_id, fixture_id)
);
create index if not exists player_stats_roster_idx on public.player_stats(roster_entry_id);

alter table public.player_stats enable row level security;
create policy player_stats_tenant on public.player_stats
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy player_stats_super_admin on public.player_stats
  for all using (public.is_super_admin()) with check (public.is_super_admin());
