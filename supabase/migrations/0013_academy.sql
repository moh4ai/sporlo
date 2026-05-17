-- Sporlo Phase 3 — Academy (coaches, sessions, attendance, progress notes).

-- ─────────────────────────────────────────────
-- 1. coaches
-- ─────────────────────────────────────────────

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  full_name_ar text not null,
  full_name_en text,
  email text,
  phone text,
  certifications_jsonb jsonb not null default '[]'::jsonb,
  bio text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists coaches_org_idx on public.coaches(org_id);
create index if not exists coaches_user_idx on public.coaches(user_id);

alter table public.coaches enable row level security;
create policy coaches_tenant on public.coaches
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy coaches_super_admin on public.coaches
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 2. academy_sessions — scheduled training sessions for kids
-- ─────────────────────────────────────────────

create table if not exists public.academy_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete set null,
  squad_id uuid references public.squads(id) on delete set null,
  facility_id uuid references public.facilities(id) on delete set null,
  title_ar text not null,
  title_en text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  age_group text,
  notes text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists academy_sessions_org_idx on public.academy_sessions(org_id);
create index if not exists academy_sessions_scheduled_idx
  on public.academy_sessions(org_id, scheduled_at desc);

alter table public.academy_sessions enable row level security;
create policy academy_sessions_tenant on public.academy_sessions
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy academy_sessions_super_admin on public.academy_sessions
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 3. session_attendance — present/absent per member per session
-- ─────────────────────────────────────────────

create table if not exists public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.academy_sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  present boolean not null default true,
  note text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_offline boolean not null default false,
  client_id text,
  unique (session_id, member_id),
  unique (session_id, client_id)
);
create index if not exists session_attendance_session_idx
  on public.session_attendance(session_id);

alter table public.session_attendance enable row level security;
create policy session_attendance_tenant on public.session_attendance
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy session_attendance_super_admin on public.session_attendance
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 4. progress_notes — coach feedback on a member
-- ─────────────────────────────────────────────

create table if not exists public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete set null,
  session_id uuid references public.academy_sessions(id) on delete set null,
  note_ar text,
  note_en text,
  rating integer check (rating between 1 and 5),
  parent_visible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists progress_notes_member_idx
  on public.progress_notes(member_id, created_at desc);

alter table public.progress_notes enable row level security;
create policy progress_notes_tenant on public.progress_notes
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy progress_notes_super_admin on public.progress_notes
  for all using (public.is_super_admin()) with check (public.is_super_admin());
