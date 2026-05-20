-- Phase 9.5 — Opponent logos on fixtures
-- The public welcome + fixtures pages only had the opponent's name in text.
-- This adds a nullable storage path so each fixture can ship a real
-- opponent crest beside the matchup. Stored in the existing org-branding
-- bucket (reuses its public-read policy).

alter table public.fixtures
  add column if not exists opponent_logo_path text;
