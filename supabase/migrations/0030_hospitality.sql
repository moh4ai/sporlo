-- Phase 8.2 — Hospitality packages
-- Premium VIP packages clubs sell alongside regular tickets. Mirrors the
-- pattern from products + plans: org-scoped, RLS, anon-readable when
-- active, dedicated storage bucket for cover images.

create table public.hospitality_packages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  body_ar text,
  body_en text,
  price_sar numeric(12, 2) not null check (price_sar >= 0),
  capacity integer check (capacity is null or capacity > 0),
  cover_image_path text,
  -- "all"     → available on every fixture
  -- "season"  → bundled as a season package
  -- "specific" → only on specific fixture(s); fixture filter not modeled yet
  fixture_filter text not null default 'all'
    check (fixture_filter in ('all', 'season', 'specific')),
  contact_url text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hospitality_packages_org_idx
  on public.hospitality_packages(org_id, display_order);

alter table public.hospitality_packages enable row level security;
create policy hospitality_packages_tenant on public.hospitality_packages
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy hospitality_packages_super_admin on public.hospitality_packages
  for all using (public.is_super_admin())
  with check (public.is_super_admin());
create policy hospitality_packages_public_read on public.hospitality_packages
  for select to anon using (active = true);

-- ─────────────────────────────────────────────
-- hospitality-covers storage bucket
-- ─────────────────────────────────────────────
-- Mirrors sponsor-logos + media-galleries.

insert into storage.buckets (id, name, public)
values ('hospitality-covers', 'hospitality-covers', true)
on conflict (id) do nothing;

drop policy if exists "hospitality_covers_public_read" on storage.objects;
drop policy if exists "hospitality_covers_tenant_write" on storage.objects;
drop policy if exists "hospitality_covers_tenant_delete" on storage.objects;

create policy "hospitality_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'hospitality-covers');

create policy "hospitality_covers_tenant_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hospitality-covers'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "hospitality_covers_tenant_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hospitality-covers'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );
