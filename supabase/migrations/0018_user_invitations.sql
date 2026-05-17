-- Phase 1.2 — Users module
-- Adds:
--   1. `active` flag on public.users so club_admins can archive teammates
--      without deleting the auth.users row.
--   2. `user_invitations` table + RLS so pending invites are tracked
--      separately from accepted-user rows.
--
-- Public.users RLS is already set in 0001_init.sql (tenant_isolation +
-- super_admin override). We piggy-back on those — no new policies needed
-- there.

alter table public.users
  add column if not exists active boolean not null default true;

-- ─────────────────────────────────────────────
-- user_invitations
-- ─────────────────────────────────────────────
-- token: opaque uuid emailed to the invitee. The auth hook does NOT use
-- this; the accept-invite Server Action looks it up, verifies the row's
-- email matches the signed-in user, and on success inserts public.users +
-- marks the invite accepted.

create table public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in (
    'club_admin', 'dept_manager', 'staff', 'coach', 'auditor'
  )),
  department text check (department in (
    'finance', 'hr', 'marketing', 'sports', 'legal', 'it',
    'academy', 'events', 'csr', 'governance'
  )),
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index user_invitations_org_idx on public.user_invitations(org_id);
create index user_invitations_token_idx on public.user_invitations(token);
create index user_invitations_email_idx on public.user_invitations(lower(email));

alter table public.user_invitations enable row level security;

-- Tenant: read + write only your own org's invites. Mirrors the policy
-- pattern used everywhere else in this schema.
create policy user_invitations_tenant on public.user_invitations
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy user_invitations_super_admin on public.user_invitations
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- The accept-invite Server Action runs as the *invitee* (whose JWT has no
-- org_id yet) and uses the service-role client to read + mark the row,
-- so no anon SELECT policy is needed.
