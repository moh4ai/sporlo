-- Fix: the top-level `role` JWT claim is a reserved Supabase/PostgREST claim
-- used to pick the Postgres role for the request (`authenticated`, `anon`,
-- `service_role`). Writing our app role ("club_admin", "auditor", ...) into
-- it makes PostgREST try to `set role club_admin`, which fails with
-- `role "club_admin" does not exist`.
--
-- We re-key the Sporlo role to `user_role` (Supabase's documented convention)
-- and update the SQL helpers and the hook accordingly.

-- 1. Re-issue the hook so it writes `user_role`, leaving `role` untouched.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  u record;
  claims jsonb := event -> 'claims';
begin
  select org_id, role, department into u
  from public.users where id = (event ->> 'user_id')::uuid;

  if u.org_id is not null then
    claims := jsonb_set(claims, '{org_id}', to_jsonb(u.org_id::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(u.role));
    if u.department is not null then
      claims := jsonb_set(claims, '{department}', to_jsonb(u.department));
    end if;
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- 2. Re-point the RLS helper at `user_role`.
create or replace function public.current_role_claim()
returns text
language sql
stable
as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'user_role'
$$;
