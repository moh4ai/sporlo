-- Fix: the custom_access_token_hook reads from public.users, but RLS on that
-- table blocks the supabase_auth_admin role (which Supabase Auth uses to call
-- the hook during JWT issuance). We grant a permissive SELECT policy scoped
-- to supabase_auth_admin only — regular client roles (anon, authenticated)
-- are still gated by the tenant_isolation policy from 0001_init.sql.
--
-- This is the documented Supabase pattern for Postgres-based access-token hooks.

create policy auth_admin_read_users on public.users
  as permissive
  for select
  to supabase_auth_admin
  using (true);
