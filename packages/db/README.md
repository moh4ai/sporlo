# @sporlo/db

Database layer: TypeScript types matching the Day 2 schema, Supabase client
wrappers (browser, service role, JWT-bound), and an RLS policy generator for
new tenant-scoped tables added in Phase 1+.

## What lives where

- `src/types.ts` — TS types matching `supabase/migrations/0001_init.sql`
- `src/client.ts` — three Supabase client factories
- `src/rls-helpers.ts` — emit `tenant_isolation` policy SQL for new tables
- `tests/tenant-isolation.test.ts` — cross-tenant SELECT-returns-zero proof

## Provisioning checklist (do this once, then keys live in `.env.local`)

1. **Create two Supabase projects** at https://supabase.com/dashboard — one
   `sporlo-staging`, one `sporlo-prod`. Region: `eu-central-1` (Frankfurt) for
   lowest KSA latency until Supabase ships a Bahrain/Riyadh region. Both can
   live on the free tier through Sprint 0; upgrade to Pro before Phase 1.
2. **Copy keys**. In each project's Settings → API, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
   Drop them into a local `.env.local` (NOT `.env.example`, which stays in git).
3. **Apply the migration**. Two options:
   - **Supabase SQL editor (faster for Sprint 0)**: paste
     `supabase/migrations/0001_init.sql` into the SQL editor → Run.
   - **Supabase CLI (preferred for Phase 0+)**: `supabase link --project-ref <ref>`
     then `supabase db push`. Requires the CLI installed; not on this machine yet.
4. **Enable phone OTP** in Settings → Auth → Phone. Email is on by default.
5. **Add an Auth Hook to inject `org_id` + `role` into the JWT**. In SQL editor:

   ```sql
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
   ```

   Then in Dashboard → Authentication → Hooks → Customize Access Token, select
   `custom_access_token_hook`. From this point the RLS policies in
   `0001_init.sql` work, because `auth.jwt() ->> 'org_id'` resolves.

## Run the isolation test

```powershell
# .env.local must have all three SUPABASE vars
corepack pnpm --filter @sporlo/db test:tenant-isolation
```

The test skips silently when env vars are missing — CI on PRs without secrets
stays green; manual runs against staging actually exercise RLS.

## Promoting a user to super_admin (Sporlo HQ)

The Super Admin app (`apps/admin`) only lets users in with `user_role = "super_admin"`. After applying migration `0005_sporlo_hq.sql` (creates the `sporlo-hq` org), promote yourself with:

```sql
-- Replace the email with your account's email
update public.users
   set role = 'super_admin',
       org_id = (select id from public.organizations where slug = 'sporlo-hq')
 where email = 'your-email@example.com';
```

Then sign out + sign in on `apps/admin` so the auth hook re-mints the JWT with the new `user_role` + `org_id` claims.

## Adding a new tenant-scoped table in Phase 1+

```ts
import { tenantIsolationPolicy } from "@sporlo/db";

console.log(tenantIsolationPolicy({ table: "memberships" }));
```

Paste the output into a new migration file in `supabase/migrations/`.
