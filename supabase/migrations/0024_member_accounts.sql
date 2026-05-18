-- Phase 4.5 — Auth'd member accounts
--
-- Adds a 1:1 link from public.members to auth.users, plus an RLS policy
-- that lets a signed-in member SELECT/UPDATE their own member row.
-- Existing tenant + super_admin policies on the table stay intact.

alter table public.members
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists members_user_id_uniq
  on public.members(user_id)
  where user_id is not null;

-- Members read their own row. (Tenant policy lets club_admin + staff see
-- everyone in the org; this policy lets the individual member see only
-- themselves when they're signed in via their own account, without leaking
-- other tenants' members.)
create policy members_self_select on public.members
  for select using (user_id = auth.uid());

create policy members_self_update on public.members
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Members read their own subscriptions, payments, fixtures (read-only).
-- Subscriptions:
create policy subscriptions_member_self on public.subscriptions
  for select using (
    member_id in (select id from public.members where user_id = auth.uid())
  );

-- Payments:
create policy payments_member_self on public.payments
  for select using (
    member_id in (select id from public.members where user_id = auth.uid())
  );

-- Fixtures: already has a public_read for anon on scheduled+in_progress+
-- completed, so signed-in members can read them too. No new policy needed.
