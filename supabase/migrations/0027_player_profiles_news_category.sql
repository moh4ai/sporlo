-- Phase 7 — Player profiles + match-report category
--
-- 1. Roster bio extension: adds bio, physical stats, joined date, previous
--    clubs, and Instagram handle so each player can have a real profile
--    page rather than just a roster card.
-- 2. News article category: enum-style text column with a fixture_id link
--    so "match_report" articles can attach to a specific fixture. The
--    /welcome Match Center shows a "Read match report" link when present.

-- ─────────────────────────────────────────────
-- 1. roster_entries extensions
-- ─────────────────────────────────────────────

alter table public.roster_entries
  add column if not exists bio_ar text,
  add column if not exists bio_en text,
  add column if not exists nationality_flag text,
  add column if not exists height_cm integer check (height_cm between 100 and 250),
  add column if not exists weight_kg integer check (weight_kg between 30 and 250),
  add column if not exists instagram_handle text,
  add column if not exists joined_club_at date,
  add column if not exists previous_clubs_jsonb jsonb not null default '[]'::jsonb;

-- ─────────────────────────────────────────────
-- 2. news_articles.category + fixture link
-- ─────────────────────────────────────────────

alter table public.news_articles
  add column if not exists category text not null default 'general'
    check (category in ('general', 'match_report', 'press', 'transfer', 'community', 'youth')),
  add column if not exists fixture_id uuid references public.fixtures(id) on delete set null;

create index if not exists news_articles_category_idx
  on public.news_articles(org_id, category, published_at desc);
create index if not exists news_articles_fixture_idx
  on public.news_articles(fixture_id)
  where fixture_id is not null;
