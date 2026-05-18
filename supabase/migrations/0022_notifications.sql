-- Phase 2.2 — In-app notifications
--
-- A single feed-style notifications table, scoped per recipient. Server
-- Actions emit rows via the service-role client (RLS denies anonymous
-- inserts); recipients read + mark-read their own rows via the
-- tenant-authenticated client.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title_ar text not null,
  title_en text not null,
  body_ar text,
  body_en text,
  payload_jsonb jsonb not null default '{}'::jsonb,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications(recipient_user_id, created_at desc);
create index notifications_unread_idx on public.notifications(recipient_user_id, read_at)
  where read_at is null;
create index notifications_org_idx on public.notifications(org_id);

alter table public.notifications enable row level security;

-- Recipients see + mark-read their own rows only.
create policy notifications_self_select on public.notifications
  for select using (recipient_user_id = auth.uid());
create policy notifications_self_update on public.notifications
  for update using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

-- Super-admin can audit cross-tenant notification volume from the admin app.
create policy notifications_super_admin on public.notifications
  for select using (public.is_super_admin());

-- Inserts happen exclusively via service-role from Server Actions. No
-- policy is created for the authenticated role, so anon/auth INSERTs fail
-- as intended.
