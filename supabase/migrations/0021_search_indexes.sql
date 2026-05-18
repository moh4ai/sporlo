-- Phase 2.1 — Cmd+K Search palette: FTS indexes
--
-- Adds a generated `search_vector` tsvector column + GIN index to the 8
-- tables that power the Cmd+K palette. Config is 'simple' (no stemming)
-- because:
--   1. 'simple' is IMMUTABLE — required for stored generated columns.
--   2. Sporlo's content is bilingual (ar+en). Postgres ships no Arabic
--      stemmer; using 'english' would corrupt Arabic tokens and would
--      not help English much for short titles/names anyway.
--
-- Each search_vector concatenates the table's bilingual text fields plus
-- relevant identifiers, weighted A for the primary label and B for
-- supporting fields so ts_rank prefers name matches over description hits.

-- ─────────────────────────────────────────────
-- members
-- ─────────────────────────────────────────────
alter table public.members
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(full_name_ar, '') || ' ' || coalesce(full_name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(email, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(national_id, '')), 'B')
  ) stored;
create index if not exists members_search_idx on public.members using gin (search_vector);

-- ─────────────────────────────────────────────
-- plans
-- ─────────────────────────────────────────────
alter table public.plans
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name_ar, '') || ' ' || coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(code, '')), 'B')
  ) stored;
create index if not exists plans_search_idx on public.plans using gin (search_vector);

-- ─────────────────────────────────────────────
-- products
-- ─────────────────────────────────────────────
alter table public.products
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name_ar, '') || ' ' || coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(category, '') || ' ' || coalesce(description_ar, '') || ' ' || coalesce(description_en, '')), 'B')
  ) stored;
create index if not exists products_search_idx on public.products using gin (search_vector);

-- ─────────────────────────────────────────────
-- fixtures
-- ─────────────────────────────────────────────
alter table public.fixtures
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(opponent_ar, '') || ' ' || coalesce(opponent_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(venue, '') || ' ' || coalesce(sport_type, '')), 'B')
  ) stored;
create index if not exists fixtures_search_idx on public.fixtures using gin (search_vector);

-- ─────────────────────────────────────────────
-- news_articles
-- ─────────────────────────────────────────────
alter table public.news_articles
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title_ar, '') || ' ' || coalesce(title_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(excerpt_ar, '') || ' ' || coalesce(excerpt_en, '')), 'B')
  ) stored;
create index if not exists news_articles_search_idx on public.news_articles using gin (search_vector);

-- ─────────────────────────────────────────────
-- staff_profiles
-- ─────────────────────────────────────────────
alter table public.staff_profiles
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(full_name_ar, '') || ' ' || coalesce(full_name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(job_title_ar, '') || ' ' || coalesce(job_title_en, '') || ' ' || coalesce(department, '') || ' ' || coalesce(email, '')), 'B')
  ) stored;
create index if not exists staff_profiles_search_idx on public.staff_profiles using gin (search_vector);

-- ─────────────────────────────────────────────
-- facilities
-- ─────────────────────────────────────────────
alter table public.facilities
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name_ar, '') || ' ' || coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(facility_type, '')), 'B')
  ) stored;
create index if not exists facilities_search_idx on public.facilities using gin (search_vector);

-- ─────────────────────────────────────────────
-- squads
-- ─────────────────────────────────────────────
alter table public.squads
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name_ar, '') || ' ' || coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(season, '') || ' ' || coalesce(sport_type, '')), 'B')
  ) stored;
create index if not exists squads_search_idx on public.squads using gin (search_vector);

-- ─────────────────────────────────────────────
-- search_global RPC — single-call UNION across all 8 indexed tables.
-- The caller's RLS context is preserved (we mark SECURITY INVOKER), so
-- each row is filtered by the tenant policy on its underlying table. The
-- function is intentionally SQL (not PL/pgSQL) and STABLE so the planner
-- can fold it through.
-- ─────────────────────────────────────────────

create or replace function public.search_global(q text, max_per_kind int default 5)
returns table (
  kind text,
  id uuid,
  title_ar text,
  title_en text,
  subtitle text,
  rank real
)
language sql stable security invoker as $$
  with tsq as (select plainto_tsquery('simple', q) as q)
  (
    select 'member'::text, m.id, m.full_name_ar, m.full_name_en, m.email,
           ts_rank(m.search_vector, (select q from tsq))
    from public.members m, tsq
    where m.search_vector @@ tsq.q
    order by ts_rank(m.search_vector, tsq.q) desc
    limit max_per_kind
  )
  union all
  (
    select 'plan'::text, p.id, p.name_ar, p.name_en, p.code,
           ts_rank(p.search_vector, (select q from tsq))
    from public.plans p, tsq
    where p.search_vector @@ tsq.q
    order by ts_rank(p.search_vector, tsq.q) desc
    limit max_per_kind
  )
  union all
  (
    select 'product'::text, pr.id, pr.name_ar, pr.name_en, pr.category,
           ts_rank(pr.search_vector, (select q from tsq))
    from public.products pr, tsq
    where pr.search_vector @@ tsq.q
    order by ts_rank(pr.search_vector, tsq.q) desc
    limit max_per_kind
  )
  union all
  (
    select 'fixture'::text, f.id, f.opponent_ar, f.opponent_en, f.venue,
           ts_rank(f.search_vector, (select q from tsq))
    from public.fixtures f, tsq
    where f.search_vector @@ tsq.q
    order by ts_rank(f.search_vector, tsq.q) desc
    limit max_per_kind
  )
  union all
  (
    select 'news_article'::text, n.id, n.title_ar, n.title_en, n.excerpt_en,
           ts_rank(n.search_vector, (select q from tsq))
    from public.news_articles n, tsq
    where n.search_vector @@ tsq.q
    order by ts_rank(n.search_vector, tsq.q) desc
    limit max_per_kind
  )
  union all
  (
    select 'staff'::text, s.id, s.full_name_ar, s.full_name_en, s.job_title_en,
           ts_rank(s.search_vector, (select q from tsq))
    from public.staff_profiles s, tsq
    where s.search_vector @@ tsq.q
    order by ts_rank(s.search_vector, tsq.q) desc
    limit max_per_kind
  )
  union all
  (
    select 'facility'::text, fac.id, fac.name_ar, fac.name_en, fac.facility_type,
           ts_rank(fac.search_vector, (select q from tsq))
    from public.facilities fac, tsq
    where fac.search_vector @@ tsq.q
    order by ts_rank(fac.search_vector, tsq.q) desc
    limit max_per_kind
  )
  union all
  (
    select 'squad'::text, sq.id, sq.name_ar, sq.name_en, sq.season,
           ts_rank(sq.search_vector, (select q from tsq))
    from public.squads sq, tsq
    where sq.search_vector @@ tsq.q
    order by ts_rank(sq.search_vector, tsq.q) desc
    limit max_per_kind
  )
  order by rank desc
  limit 40;
$$;

grant execute on function public.search_global(text, int) to authenticated;
