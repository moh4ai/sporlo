-- Custom access token hook — injects org_id, role, department into the JWT
-- claims that RLS reads. Install in step 4 of the provisioning checklist.
--
-- After this function exists, go to Dashboard → Authentication → Hooks →
-- Customize Access Token (Beta) and select public.custom_access_token_hook.

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
    claims := jsonb_set(claims, '{role}', to_jsonb(u.role));
    if u.department is not null then
      claims := jsonb_set(claims, '{department}', to_jsonb(u.department));
    end if;
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- The hook reads from public.users — Supabase Auth runs under the
-- supabase_auth_admin role, which must be able to SELECT that table.
grant select on public.users to supabase_auth_admin;
