-- Phase 9.1 — Multi-image product galleries
-- Extends products.image_path (single cover) with an ordered jsonb array of
-- additional image paths. The cover image stays in image_path for backwards
-- compatibility with existing reads; new readers consume image_paths and
-- fall back to [image_path] when the array is empty.

alter table public.products
  add column if not exists image_paths jsonb not null default '[]'::jsonb;

create index if not exists products_image_paths_gin
  on public.products using gin (image_paths);

-- Backfill: products that already have an image_path also expose it as the
-- first entry of image_paths so new readers work without a code split.
update public.products
   set image_paths = jsonb_build_array(image_path)
 where image_path is not null
   and (image_paths is null or jsonb_array_length(image_paths) = 0);
