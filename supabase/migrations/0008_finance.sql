-- Sporlo Phase 1 — Finance schema.
-- Apply via the Supabase SQL editor at:
--   https://supabase.com/dashboard/project/sveqkaemfnvlqfgkbryu/sql/new

-- ─────────────────────────────────────────────
-- 1. payment_methods — manual/POS/bank channels the club uses
-- ─────────────────────────────────────────────

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  type text not null check (type in ('cash', 'bank_transfer', 'pos_terminal', 'moyasar', 'other')),
  details_jsonb jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, label)
);
create index if not exists payment_methods_org_id_idx on public.payment_methods(org_id);

alter table public.payment_methods enable row level security;
create policy payment_methods_tenant on public.payment_methods
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy payment_methods_super_admin on public.payment_methods
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 2. refunds — approval workflow on top of payments
-- ─────────────────────────────────────────────

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  amount_sar numeric(10,2) not null check (amount_sar >= 0),
  reason text,
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'completed', 'failed')),
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);
create index if not exists refunds_org_id_idx on public.refunds(org_id);
create index if not exists refunds_payment_id_idx on public.refunds(payment_id);
create index if not exists refunds_status_idx on public.refunds(org_id, status);

alter table public.refunds enable row level security;
create policy refunds_tenant on public.refunds
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy refunds_super_admin on public.refunds
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 3. quarterly_disclosures — Ministry filings
-- ─────────────────────────────────────────────

create table if not exists public.quarterly_disclosures (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  quarter text not null,
  totals_jsonb jsonb not null default '{}'::jsonb,
  document_id uuid references public.governance_documents(id) on delete set null,
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (org_id, quarter)
);
create index if not exists quarterly_disclosures_org_id_idx
  on public.quarterly_disclosures(org_id);

alter table public.quarterly_disclosures enable row level security;
create policy quarterly_disclosures_tenant on public.quarterly_disclosures
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy quarterly_disclosures_super_admin on public.quarterly_disclosures
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 4. governance-documents Storage bucket
-- ─────────────────────────────────────────────
-- Private bucket. Reads / writes only via signed URLs minted by service-role
-- from server actions. Per-org folder prefix matches the JWT org_id claim.

insert into storage.buckets (id, name, public)
values ('governance-documents', 'governance-documents', false)
on conflict (id) do nothing;

-- RLS on storage.objects scoped to authenticated tenants. We restrict path
-- prefix to "<org_id>/..." so cross-tenant reads/writes fail.
drop policy if exists "governance_documents_tenant_read" on storage.objects;
drop policy if exists "governance_documents_tenant_write" on storage.objects;
drop policy if exists "governance_documents_tenant_delete" on storage.objects;

create policy "governance_documents_tenant_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'governance-documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "governance_documents_tenant_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'governance-documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "governance_documents_tenant_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'governance-documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );
