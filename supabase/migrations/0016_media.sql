-- Module 10 — Media (Phase 4)
-- Public club site pages, news articles, broadcasts (SMS/email), member
-- notification prefs, and 1:1 message threads (member ↔ staff).

-- ─────────────────────────────────────────────
-- 1. public_pages
--    Static marketing pages (About, History, Sponsors, etc.) rendered at
--    [slug].sporlo.net/pages/<page-slug>
-- ─────────────────────────────────────────────

create table public.public_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  title_ar text not null,
  title_en text not null,
  body_ar text,
  body_en text,
  hero_image_path text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);
create index public_pages_org_idx on public.public_pages(org_id);
create index public_pages_published_idx on public.public_pages(org_id, published);

alter table public.public_pages enable row level security;
create policy public_pages_tenant on public.public_pages
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy public_pages_super_admin on public.public_pages
  for all using (public.is_super_admin()) with check (public.is_super_admin());
-- Public read for published pages (anon can read).
create policy public_pages_public_read on public.public_pages
  for select using (published = true);

-- ─────────────────────────────────────────────
-- 2. news_articles
-- ─────────────────────────────────────────────

create table public.news_articles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  title_ar text not null,
  title_en text not null,
  excerpt_ar text,
  excerpt_en text,
  body_ar text,
  body_en text,
  cover_image_path text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);
create index news_articles_org_idx on public.news_articles(org_id);
create index news_articles_published_idx on public.news_articles(org_id, published_at desc);

alter table public.news_articles enable row level security;
create policy news_articles_tenant on public.news_articles
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy news_articles_super_admin on public.news_articles
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy news_articles_public_read on public.news_articles
  for select using (published_at is not null and published_at <= now());

-- ─────────────────────────────────────────────
-- 3. broadcasts
-- ─────────────────────────────────────────────

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null check (channel in ('sms', 'email', 'both')),
  audience text not null check (audience in ('members', 'staff', 'all')),
  subject text,
  body_ar text not null,
  body_en text,
  status text not null default 'draft' check (status in ('draft', 'queued', 'sending', 'sent', 'failed')),
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  provider_log_jsonb jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index broadcasts_org_idx on public.broadcasts(org_id);
create index broadcasts_status_idx on public.broadcasts(status);

alter table public.broadcasts enable row level security;
create policy broadcasts_tenant on public.broadcasts
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy broadcasts_super_admin on public.broadcasts
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 4. notification_prefs (per-member)
--    Defaults are opt-in for email, opt-out for SMS pending sender-ID approval.
-- ─────────────────────────────────────────────

create table public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  email_opt_in boolean not null default true,
  sms_opt_in boolean not null default false,
  whatsapp_opt_in boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (member_id)
);
create index notification_prefs_org_idx on public.notification_prefs(org_id);

alter table public.notification_prefs enable row level security;
create policy notification_prefs_tenant on public.notification_prefs
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy notification_prefs_super_admin on public.notification_prefs
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 5. message_threads — 1:1 member ↔ staff
-- ─────────────────────────────────────────────

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  staff_user_id uuid references auth.users(id) on delete set null,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'archived')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index message_threads_org_idx on public.message_threads(org_id);
create index message_threads_member_idx on public.message_threads(member_id);
create index message_threads_staff_idx on public.message_threads(staff_user_id);

alter table public.message_threads enable row level security;
create policy message_threads_tenant on public.message_threads
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy message_threads_super_admin on public.message_threads
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 6. messages
-- ─────────────────────────────────────────────

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_role text not null check (sender_role in ('member', 'staff', 'system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages(thread_id);
create index messages_org_idx on public.messages(org_id);

alter table public.messages enable row level security;
create policy messages_tenant on public.messages
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy messages_super_admin on public.messages
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 7. Auto-update message_threads.last_message_at on new message
-- ─────────────────────────────────────────────

create or replace function public.touch_thread_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.message_threads
  set last_message_at = NEW.created_at
  where id = NEW.thread_id;
  return NEW;
end;
$$;

create trigger messages_touch_thread
  after insert on public.messages
  for each row execute function public.touch_thread_last_message();
