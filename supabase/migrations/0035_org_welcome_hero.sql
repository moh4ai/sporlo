-- Phase 9.4 — Welcome page hero image
-- The public landing only had primary_color as the hero background. This
-- adds a dedicated full-bleed image column so each tenant can ship a real
-- match-day photo behind the logo + tagline block.

alter table public.organizations
  add column if not exists welcome_hero_image_path text;
