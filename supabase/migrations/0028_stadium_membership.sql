-- Phase 8 — Stadium info + public membership tiers
--
-- 1. stadium_info — one row per org. Used by the new /welcome/stadium
--    public page. Anon read so unauthenticated fans can see it.
-- 2. plans.public_visible — surfaces a plan on the /membership marketing
--    page when true; existing internal plans default to false to preserve
--    behaviour.
-- 3. plans.benefits_jsonb — array of benefit strings shown in tier cards
--    on /membership. Defaults to empty array.

create table public.stadium_info (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  name_ar text,
  name_en text,
  address_ar text,
  address_en text,
  city_ar text,
  city_en text,
  capacity integer check (capacity is null or capacity > 0),
  opened_year integer check (opened_year is null or opened_year between 1800 and 2200),
  map_lat numeric(9, 6),
  map_lng numeric(9, 6),
  parking_notes_ar text,
  parking_notes_en text,
  accessibility_notes_ar text,
  accessibility_notes_en text,
  photo_path text,
  updated_at timestamptz not null default now()
);

alter table public.stadium_info enable row level security;

create policy stadium_info_tenant on public.stadium_info
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy stadium_info_super_admin on public.stadium_info
  for all using (public.is_super_admin())
  with check (public.is_super_admin());
create policy stadium_info_public_read on public.stadium_info
  for select to anon using (true);

-- ─────────────────────────────────────────────
-- plans extensions
-- ─────────────────────────────────────────────
-- benefits_jsonb is an array of bilingual benefit lines:
--   [{ "ar": "تذكرة موسم مجانية", "en": "Free season ticket" }, ...]

alter table public.plans
  add column if not exists public_visible boolean not null default false,
  add column if not exists benefits_jsonb jsonb not null default '[]'::jsonb;

-- Allow anon to read just the publicly-visible plans (rendered on /membership).
-- Tenant + super_admin policies from migration 0007 still apply for all rows.
create policy plans_public_read on public.plans
  for select to anon using (public_visible = true);
