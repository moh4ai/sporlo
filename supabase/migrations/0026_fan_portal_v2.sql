-- Phase 6 — Fan Portal v2
-- Adds the surfaces every real club site has and Sporlo lacked:
--   1. honours      — trophy cabinet ("Proud to be X" carousel)
--   2. sponsors     — multi-tier partner grid + sponsor-logos bucket
--   3. organizations metadata — social URLs, app store links, newsletter provider
--   4. newsletter_subscribers — captures the public signup form
--   5. fan_portal_settings — three new toggles for the new sections

-- ─────────────────────────────────────────────
-- 1. honours
-- ─────────────────────────────────────────────

create table public.honours (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  competition_ar text not null,
  competition_en text not null,
  kind text not null check (kind in (
    'league', 'domestic_cup', 'continental', 'international', 'regional', 'other'
  )),
  win_count integer not null default 1 check (win_count > 0),
  last_won_year integer check (last_won_year between 1900 and 2200),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index honours_org_idx on public.honours(org_id, display_order);

alter table public.honours enable row level security;
create policy honours_tenant on public.honours
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy honours_super_admin on public.honours
  for all using (public.is_super_admin())
  with check (public.is_super_admin());
create policy honours_public_read on public.honours
  for select to anon using (true);

-- ─────────────────────────────────────────────
-- 2. sponsors
-- ─────────────────────────────────────────────

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  logo_path text,
  url text,
  tier text not null default 'official' check (tier in (
    'strategic', 'main', 'official', 'supporter'
  )),
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index sponsors_org_idx on public.sponsors(org_id, tier, display_order);

alter table public.sponsors enable row level security;
create policy sponsors_tenant on public.sponsors
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy sponsors_super_admin on public.sponsors
  for all using (public.is_super_admin())
  with check (public.is_super_admin());
create policy sponsors_public_read on public.sponsors
  for select to anon using (active = true);

-- sponsor-logos bucket — mirrors org-branding (public read, tenant-scoped writes).
insert into storage.buckets (id, name, public)
values ('sponsor-logos', 'sponsor-logos', true)
on conflict (id) do nothing;

drop policy if exists "sponsor_logos_public_read" on storage.objects;
drop policy if exists "sponsor_logos_tenant_write" on storage.objects;
drop policy if exists "sponsor_logos_tenant_delete" on storage.objects;

create policy "sponsor_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'sponsor-logos');

create policy "sponsor_logos_tenant_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'sponsor-logos'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "sponsor_logos_tenant_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'sponsor-logos'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

-- ─────────────────────────────────────────────
-- 3. organizations metadata
-- ─────────────────────────────────────────────
-- social_jsonb shape (all optional strings):
--   { twitter, instagram, tiktok, youtube, facebook, snapchat, linkedin, whatsapp }
-- All values are full URLs.

alter table public.organizations
  add column if not exists social_jsonb jsonb not null default '{}'::jsonb,
  add column if not exists app_store_url text,
  add column if not exists play_store_url text,
  add column if not exists newsletter_provider text
    check (newsletter_provider in ('mailchimp', 'resend', 'brevo'));

-- ─────────────────────────────────────────────
-- 4. newsletter_subscribers
-- ─────────────────────────────────────────────

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  source text not null default 'fan_portal',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  unique (org_id, email)
);
create index newsletter_subscribers_org_idx on public.newsletter_subscribers(org_id);

alter table public.newsletter_subscribers enable row level security;

-- Tenant + super-admin read. Public anon INSERTs are gated by an explicit
-- policy (anon needs to insert their own email; we sanitise + de-dupe at
-- the Server Action layer too).
create policy newsletter_subscribers_tenant on public.newsletter_subscribers
  for select using (org_id = public.current_org_id());
create policy newsletter_subscribers_super_admin on public.newsletter_subscribers
  for select using (public.is_super_admin());
create policy newsletter_subscribers_anon_insert on public.newsletter_subscribers
  for insert to anon with check (true);

-- ─────────────────────────────────────────────
-- 5. fan_portal_settings: 3 new toggles
-- ─────────────────────────────────────────────

alter table public.fan_portal_settings
  add column if not exists match_center_enabled boolean not null default true,
  add column if not exists honours_enabled boolean not null default true,
  add column if not exists sponsors_enabled boolean not null default true;
