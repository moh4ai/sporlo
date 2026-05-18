-- Phase 4.6 — Unified Fan Portal manager
--
-- One row per org with per-section enable flags + optional featured pins.
-- The /welcome public route reads this row to decide which sections to
-- render and which items to promote to the top. Default behaviour when
-- no row exists: every section enabled, no pins (matches the original
-- Phase 4 unconditional render).

create table public.fan_portal_settings (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  hero_enabled boolean not null default true,
  next_match_enabled boolean not null default true,
  news_enabled boolean not null default true,
  squad_enabled boolean not null default true,
  shop_enabled boolean not null default true,
  about_enabled boolean not null default true,
  featured_news_id uuid references public.news_articles(id) on delete set null,
  featured_product_id uuid references public.products(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.fan_portal_settings enable row level security;

-- Standard tenant + super_admin override. Service-role inserts/updates
-- from the Server Action; authenticated reads via the manager page.
create policy fan_portal_settings_tenant on public.fan_portal_settings
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy fan_portal_settings_super_admin on public.fan_portal_settings
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Anon read so the public /welcome page can fetch settings without a
-- session. The columns are non-sensitive (just flags + ID pins).
create policy fan_portal_settings_public_read on public.fan_portal_settings
  for select to anon using (true);
