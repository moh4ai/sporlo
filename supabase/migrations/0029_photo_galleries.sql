-- Phase 7.3 — Photo galleries
-- Adds the "Behind the scenes" carousel surface that every real club site has
-- on its homepage. Two tables (galleries + items), one storage bucket
-- (media-galleries — mirrors sponsor-logos), and one fan_portal_settings
-- toggle so each club can hide the section if they have no photos to show.

-- ─────────────────────────────────────────────
-- 1. media_galleries
-- ─────────────────────────────────────────────

create table public.media_galleries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title_ar text not null,
  title_en text not null,
  description_ar text,
  description_en text,
  cover_image_path text,
  published_at timestamptz,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index media_galleries_org_published_idx
  on public.media_galleries(org_id, published_at desc nulls last, display_order);

alter table public.media_galleries enable row level security;
create policy media_galleries_tenant on public.media_galleries
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy media_galleries_super_admin on public.media_galleries
  for all using (public.is_super_admin())
  with check (public.is_super_admin());
create policy media_galleries_public_read on public.media_galleries
  for select to anon using (published_at is not null);

-- ─────────────────────────────────────────────
-- 2. media_gallery_items
-- ─────────────────────────────────────────────

create table public.media_gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.media_galleries(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  image_path text not null,
  caption_ar text,
  caption_en text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index media_gallery_items_gallery_idx
  on public.media_gallery_items(gallery_id, display_order);

alter table public.media_gallery_items enable row level security;
create policy media_gallery_items_tenant on public.media_gallery_items
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy media_gallery_items_super_admin on public.media_gallery_items
  for all using (public.is_super_admin())
  with check (public.is_super_admin());
-- Anon reads items that belong to a published gallery.
create policy media_gallery_items_public_read on public.media_gallery_items
  for select to anon using (
    exists (
      select 1 from public.media_galleries g
      where g.id = media_gallery_items.gallery_id
        and g.published_at is not null
    )
  );

-- ─────────────────────────────────────────────
-- 3. media-galleries storage bucket
-- ─────────────────────────────────────────────
-- Mirrors sponsor-logos: public read, tenant-scoped writes/deletes by
-- folder prefix = org_id.

insert into storage.buckets (id, name, public)
values ('media-galleries', 'media-galleries', true)
on conflict (id) do nothing;

drop policy if exists "media_galleries_public_read" on storage.objects;
drop policy if exists "media_galleries_tenant_write" on storage.objects;
drop policy if exists "media_galleries_tenant_delete" on storage.objects;

create policy "media_galleries_public_read"
  on storage.objects for select
  using (bucket_id = 'media-galleries');

create policy "media_galleries_tenant_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media-galleries'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "media_galleries_tenant_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media-galleries'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

-- ─────────────────────────────────────────────
-- 4. fan_portal_settings: galleries toggle
-- ─────────────────────────────────────────────

alter table public.fan_portal_settings
  add column if not exists galleries_enabled boolean not null default true;
