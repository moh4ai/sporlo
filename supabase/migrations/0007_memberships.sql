-- Sporlo Phase 1 — Memberships schema.
-- Apply via the Supabase SQL editor at:
--   https://supabase.com/dashboard/project/sveqkaemfnvlqfgkbryu/sql/new
-- Idempotent where possible.

-- ─────────────────────────────────────────────
-- 1. plans — what a club sells
-- ─────────────────────────────────────────────

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name_ar text not null,
  name_en text not null,
  duration_months integer not null check (duration_months > 0),
  price_sar numeric(10,2) not null check (price_sar >= 0),
  member_only_store_discount_pct numeric(5,2) not null default 0
    check (member_only_store_discount_pct between 0 and 100),
  includes_jsonb jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);
create index if not exists plans_org_id_idx on public.plans(org_id);
create index if not exists plans_active_idx on public.plans(org_id, active) where active = true;

alter table public.plans enable row level security;
create policy plans_tenant on public.plans
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy plans_super_admin on public.plans
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 2. Extend members
-- ─────────────────────────────────────────────

alter table public.members add column if not exists member_number text;
alter table public.members add column if not exists status text not null default 'active'
  check (status in ('active', 'inactive', 'prospect'));
alter table public.members add column if not exists joined_at timestamptz not null default now();
create unique index if not exists members_org_member_number_uniq
  on public.members(org_id, member_number)
  where member_number is not null;

-- Auto-generate member_number on insert if not provided. Format: M-{org_slug_prefix}-{seq}
create or replace function public.assign_member_number()
returns trigger
language plpgsql
as $$
declare
  v_org_slug text;
  v_seq integer;
  v_prefix text;
begin
  if new.member_number is null then
    select organizations.slug into v_org_slug from public.organizations where id = new.org_id;
    v_prefix := upper(substr(coalesce(v_org_slug, 'org'), 1, 4));
    select coalesce(max(substring(member_number from '\d+$')::integer), 0) + 1
      into v_seq
      from public.members
      where org_id = new.org_id and member_number ~ ('^M-' || v_prefix || '-\d+$');
    new.member_number := 'M-' || v_prefix || '-' || lpad(v_seq::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists members_assign_number on public.members;
create trigger members_assign_number
  before insert on public.members
  for each row
  execute function public.assign_member_number();

-- ─────────────────────────────────────────────
-- 3. subscriptions — what a member buys
-- ─────────────────────────────────────────────

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'frozen', 'cancelled', 'expired')),
  starts_at timestamptz,
  ends_at timestamptz,
  frozen_from timestamptz,
  frozen_to timestamptz,
  moyasar_subscription_id text,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index if not exists subscriptions_org_id_idx on public.subscriptions(org_id);
create index if not exists subscriptions_member_id_idx on public.subscriptions(member_id);
create index if not exists subscriptions_status_idx on public.subscriptions(org_id, status);

alter table public.subscriptions enable row level security;
create policy subscriptions_tenant on public.subscriptions
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy subscriptions_super_admin on public.subscriptions
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 4. payments — every money movement
-- ─────────────────────────────────────────────

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  amount_sar numeric(10,2) not null,
  currency text not null default 'SAR',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider text not null default 'moyasar',
  provider_payment_id text,
  paid_at timestamptz,
  failure_reason text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists payments_org_id_idx on public.payments(org_id);
create index if not exists payments_subscription_id_idx on public.payments(subscription_id);
create index if not exists payments_member_id_idx on public.payments(member_id);
create index if not exists payments_status_idx on public.payments(org_id, status);

alter table public.payments enable row level security;
create policy payments_tenant on public.payments
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy payments_super_admin on public.payments
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- payments_safe view — masks member PII for non-Finance / non-Club-Admin roles.
-- Application-layer enforcement (canPerform("read","member_pii")) decides which
-- view to query.
create or replace view public.payments_safe with (security_invoker = true) as
  select
    p.id, p.org_id, p.subscription_id, p.amount_sar, p.currency, p.status,
    p.provider, p.paid_at, p.created_at
  from public.payments p;

-- ─────────────────────────────────────────────
-- 5. discount_coupons + coupon_redemptions
-- ─────────────────────────────────────────────

create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  percent_off numeric(5,2) not null check (percent_off between 0 and 100),
  max_uses integer,
  used_count integer not null default 0,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  plan_scope_jsonb jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);
create index if not exists discount_coupons_org_id_idx on public.discount_coupons(org_id);

alter table public.discount_coupons enable row level security;
create policy discount_coupons_tenant on public.discount_coupons
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy discount_coupons_super_admin on public.discount_coupons
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  coupon_id uuid not null references public.discount_coupons(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  redeemed_at timestamptz not null default now()
);
create index if not exists coupon_redemptions_coupon_id_idx
  on public.coupon_redemptions(coupon_id);
create index if not exists coupon_redemptions_org_id_idx
  on public.coupon_redemptions(org_id);

alter table public.coupon_redemptions enable row level security;
create policy coupon_redemptions_tenant on public.coupon_redemptions
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy coupon_redemptions_super_admin on public.coupon_redemptions
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 6. member_portal_tokens — magic-link auth for /c/<slug>
-- ─────────────────────────────────────────────

create table if not exists public.member_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists member_portal_tokens_token_uniq on public.member_portal_tokens(token);
create index if not exists member_portal_tokens_member_id_idx on public.member_portal_tokens(member_id);

alter table public.member_portal_tokens enable row level security;
create policy member_portal_tokens_tenant on public.member_portal_tokens
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy member_portal_tokens_super_admin on public.member_portal_tokens
  for all using (public.is_super_admin()) with check (public.is_super_admin());
