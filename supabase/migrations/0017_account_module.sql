-- Phase 1.1 — Account module
-- Org-level config: club_admin can now edit fields that Sprint 0 left as
-- super-admin-only. Adds the columns that the master plan called for
-- (tagline_ar/en, primary_color, logo_path, archived_at) and an
-- `org-branding` Storage bucket for logo uploads.
--
-- RLS is unchanged: the existing `organizations_tenant_select` policy still
-- gates reads to the caller's own org, and writes happen through the
-- service-role from a Server Action that calls `requirePrincipal("update",
-- "account")`. No new policy needed on `public.organizations`.

alter table public.organizations
  add column if not exists tagline_ar text,
  add column if not exists tagline_en text,
  add column if not exists primary_color text,
  add column if not exists logo_path text,
  add column if not exists archived_at timestamptz;

-- The existing tenant-select policy only allows reading the org row when
-- `id = current_org_id()`. To let `club_admin` update their org row from a
-- user-context (anon) call we'd need a new UPDATE policy — but Server
-- Actions hit Postgres with the service-role key (which bypasses RLS) and
-- then enforce ACL in TS via `requirePrincipal`. Keeping it that way means
-- branding/subdomain edits flow through the same audit + ACL plumbing as
-- the rest of the platform.

-- ─────────────────────────────────────────────
-- org-branding Storage bucket
-- ─────────────────────────────────────────────
-- Public bucket — logos are rendered on public marketing pages, so anon
-- reads must succeed without signed URLs. Writes are restricted to the
-- caller's own org folder; service-role uploads from the Account Server
-- Action go through anyway.

insert into storage.buckets (id, name, public)
values ('org-branding', 'org-branding', true)
on conflict (id) do nothing;

drop policy if exists "org_branding_public_read" on storage.objects;
drop policy if exists "org_branding_tenant_write" on storage.objects;
drop policy if exists "org_branding_tenant_delete" on storage.objects;

create policy "org_branding_public_read"
  on storage.objects for select
  using (bucket_id = 'org-branding');

create policy "org_branding_tenant_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "org_branding_tenant_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );
