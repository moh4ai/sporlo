-- Phase 8.5 — Product + facility imagery
-- Adds image_path columns to products and facilities so the public shop and
-- admin facility list can render real photos. Mirrors the hospitality-covers
-- pattern from 0030 for storage buckets.

alter table public.products
  add column if not exists image_path text;

alter table public.facilities
  add column if not exists image_path text;

-- ─────────────────────────────────────────────
-- product-images storage bucket
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_tenant_write" on storage.objects;
drop policy if exists "product_images_tenant_delete" on storage.objects;

create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product_images_tenant_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "product_images_tenant_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

-- ─────────────────────────────────────────────
-- facility-images storage bucket
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('facility-images', 'facility-images', true)
on conflict (id) do nothing;

drop policy if exists "facility_images_public_read" on storage.objects;
drop policy if exists "facility_images_tenant_write" on storage.objects;
drop policy if exists "facility_images_tenant_delete" on storage.objects;

create policy "facility_images_public_read"
  on storage.objects for select
  using (bucket_id = 'facility-images');

create policy "facility_images_tenant_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'facility-images'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "facility_images_tenant_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'facility-images'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );
