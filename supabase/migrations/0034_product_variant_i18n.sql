-- Phase 9.3 — Bilingual product attributes
-- products.category and product_variants.size/color were single text columns.
-- The Arabic public pages were showing the English values verbatim. This
-- migration adds nullable _ar/_en pairs, keeps the legacy columns as
-- backwards-compatible fallback, and backfills the existing values into _en
-- so the English surface stays unchanged.

alter table public.products
  add column if not exists category_ar text,
  add column if not exists category_en text;

update public.products
   set category_en = category
 where category is not null and category_en is null;

alter table public.product_variants
  add column if not exists size_ar text,
  add column if not exists size_en text,
  add column if not exists color_ar text,
  add column if not exists color_en text;

update public.product_variants
   set size_en = size
 where size is not null and size_en is null;

update public.product_variants
   set color_en = color
 where color is not null and color_en is null;
