-- Phase 1.3 — Settings module
-- Per-user preferences. Two tables:
--   1. user_settings — a single jsonb blob per user for general prefs
--      (preferred locale, date format, appearance, etc). One row per user.
--   2. user_notification_prefs — per-event per-channel toggles. Phase 1
--      stores prefs; Phase 2 reads them when emitting notifications.
--
-- Both tables are user-scoped, not org-scoped. RLS gates on auth.uid()
-- because the natural key is the user themselves — a user has the same
-- prefs regardless of which org they're acting in.

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs_jsonb jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy user_settings_self_read on public.user_settings
  for select using (user_id = auth.uid());
create policy user_settings_self_write on public.user_settings
  for insert with check (user_id = auth.uid());
create policy user_settings_self_update on public.user_settings
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy user_settings_super_admin on public.user_settings
  for select using (public.is_super_admin());

-- ─────────────────────────────────────────────
-- user_notification_prefs
-- ─────────────────────────────────────────────
-- channel: 'email' or 'in_app' (extend to 'whatsapp' / 'sms' later when
-- those providers land).
-- event_type: matches the constants in @sporlo/governance EVT (e.g.
-- 'subscription_renewed', 'refund_requested', 'certification_expiring').
-- enabled = false means suppress that channel for that event.

create table public.user_notification_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  channel text not null check (channel in ('email', 'in_app')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, event_type, channel)
);

alter table public.user_notification_prefs enable row level security;

create policy user_notification_prefs_self on public.user_notification_prefs
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy user_notification_prefs_super_admin on public.user_notification_prefs
  for select using (public.is_super_admin());
