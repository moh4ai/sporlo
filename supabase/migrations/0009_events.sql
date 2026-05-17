-- Sporlo Phase 2 — Events (fixtures + ticketing + match events).
-- Apply via the Supabase SQL editor at:
--   https://supabase.com/dashboard/project/sveqkaemfnvlqfgkbryu/sql/new
-- Run each section as a separate query if the SQL editor rejects the full block.

-- ─────────────────────────────────────────────
-- 1. fixtures — matches the club is playing / hosting
-- ─────────────────────────────────────────────

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  opponent_ar text not null,
  opponent_en text not null,
  kickoff_at timestamptz not null,
  venue text,
  sport_type text not null default 'football',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  home_score integer,
  away_score integer,
  created_at timestamptz not null default now()
);
create index if not exists fixtures_org_id_idx on public.fixtures(org_id);
create index if not exists fixtures_kickoff_idx on public.fixtures(org_id, kickoff_at desc);

alter table public.fixtures enable row level security;
create policy fixtures_tenant on public.fixtures
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy fixtures_super_admin on public.fixtures
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Public read for fixture metadata so the public-facing listing can render
-- without auth. Only non-PII columns are exposed; pricing + ticket counts
-- come from joins guarded by their own policies.
create policy fixtures_public_read on public.fixtures
  for select to anon
  using (status in ('scheduled', 'in_progress', 'completed'));

-- ─────────────────────────────────────────────
-- 2. venue_sections — seating sections per fixture
-- ─────────────────────────────────────────────

create table if not exists public.venue_sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  label text not null,
  rows_count integer not null check (rows_count > 0),
  seats_per_row integer not null check (seats_per_row > 0),
  capacity integer generated always as (rows_count * seats_per_row) stored,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (fixture_id, label)
);
create index if not exists venue_sections_fixture_idx
  on public.venue_sections(fixture_id);

alter table public.venue_sections enable row level security;
create policy venue_sections_tenant on public.venue_sections
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy venue_sections_super_admin on public.venue_sections
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy venue_sections_public_read on public.venue_sections
  for select to anon
  using (true);

-- ─────────────────────────────────────────────
-- 3. seats — individual seat inventory
-- ─────────────────────────────────────────────

create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  section_id uuid not null references public.venue_sections(id) on delete cascade,
  row_label text not null,
  seat_number integer not null,
  status text not null default 'available'
    check (status in ('available', 'held', 'sold', 'blocked')),
  held_until timestamptz,
  created_at timestamptz not null default now(),
  unique (section_id, row_label, seat_number)
);
create index if not exists seats_section_idx on public.seats(section_id);
create index if not exists seats_status_idx on public.seats(section_id, status);

alter table public.seats enable row level security;
create policy seats_tenant on public.seats
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy seats_super_admin on public.seats
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 4. pricing_tiers — price per section per fixture
-- ─────────────────────────────────────────────

create table if not exists public.pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  section_id uuid not null references public.venue_sections(id) on delete cascade,
  label text not null,
  price_sar numeric(10,2) not null check (price_sar >= 0),
  member_price_sar numeric(10,2) check (member_price_sar is null or member_price_sar >= 0),
  created_at timestamptz not null default now(),
  unique (fixture_id, section_id)
);
create index if not exists pricing_tiers_fixture_idx
  on public.pricing_tiers(fixture_id);

alter table public.pricing_tiers enable row level security;
create policy pricing_tiers_tenant on public.pricing_tiers
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy pricing_tiers_super_admin on public.pricing_tiers
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy pricing_tiers_public_read on public.pricing_tiers
  for select to anon
  using (true);

-- ─────────────────────────────────────────────
-- 5. tickets — sold tickets with QR codes
-- ─────────────────────────────────────────────

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  seat_id uuid references public.seats(id) on delete set null,
  buyer_member_id uuid references public.members(id) on delete set null,
  buyer_email text,
  buyer_phone text,
  qr_code text not null,
  price_sar numeric(10,2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  payment_id uuid references public.payments(id) on delete set null,
  sold_at timestamptz,
  scanned_at timestamptz,
  scanned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (qr_code)
);
create index if not exists tickets_fixture_idx on public.tickets(fixture_id);
create index if not exists tickets_org_idx on public.tickets(org_id);
create index if not exists tickets_buyer_idx on public.tickets(buyer_member_id);
create index if not exists tickets_status_idx on public.tickets(org_id, status);

alter table public.tickets enable row level security;
create policy tickets_tenant on public.tickets
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy tickets_super_admin on public.tickets
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 6. match_events — goal/card/sub log (offline-capable)
-- ─────────────────────────────────────────────

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  minute integer not null check (minute >= 0 and minute <= 200),
  type text not null check (type in ('goal', 'own_goal', 'penalty', 'yellow_card', 'red_card', 'substitution', 'injury', 'note')),
  team text not null check (team in ('home', 'away')),
  player_name text,
  payload_jsonb jsonb not null default '{}'::jsonb,
  recorded_offline boolean not null default false,
  recorded_by uuid references auth.users(id) on delete set null,
  client_id text,
  created_at timestamptz not null default now(),
  unique (fixture_id, client_id)
);
create index if not exists match_events_fixture_idx
  on public.match_events(fixture_id, minute);

alter table public.match_events enable row level security;
create policy match_events_tenant on public.match_events
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy match_events_super_admin on public.match_events
  for all using (public.is_super_admin()) with check (public.is_super_admin());
