-- Sporlo Phase 2 — Store (products + variants + orders + shipments).

-- ─────────────────────────────────────────────
-- 1. products
-- ─────────────────────────────────────────────

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  category text,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists products_org_idx on public.products(org_id);
create index if not exists products_active_idx on public.products(org_id, active) where active = true;
alter table public.products enable row level security;
create policy products_tenant on public.products
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy products_super_admin on public.products
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy products_public_read on public.products
  for select to anon
  using (active = true);

-- ─────────────────────────────────────────────
-- 2. product_variants
-- ─────────────────────────────────────────────

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  size text,
  color text,
  price_sar numeric(10,2) not null check (price_sar >= 0),
  member_price_sar numeric(10,2) check (member_price_sar is null or member_price_sar >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants(product_id);
create index if not exists product_variants_org_idx on public.product_variants(org_id);
create unique index if not exists product_variants_sku_uniq
  on public.product_variants(product_id, sku)
  where sku is not null;
alter table public.product_variants enable row level security;
create policy product_variants_tenant on public.product_variants
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy product_variants_super_admin on public.product_variants
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy product_variants_public_read on public.product_variants
  for select to anon
  using (active = true);

-- ─────────────────────────────────────────────
-- 3. inventory_movements — audit log of stock changes
-- ─────────────────────────────────────────────

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('initial', 'restock', 'order_paid', 'order_cancelled', 'manual_adjustment')),
  order_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_variant_idx
  on public.inventory_movements(variant_id, created_at desc);
alter table public.inventory_movements enable row level security;
create policy inventory_movements_tenant on public.inventory_movements
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy inventory_movements_super_admin on public.inventory_movements
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 4. orders
-- ─────────────────────────────────────────────

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  buyer_member_id uuid references public.members(id) on delete set null,
  buyer_email text not null,
  buyer_phone text,
  shipping_address text,
  subtotal_sar numeric(10,2) not null,
  discount_sar numeric(10,2) not null default 0,
  total_sar numeric(10,2) not null,
  currency text not null default 'SAR',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_id uuid references public.payments(id) on delete set null,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists orders_org_idx on public.orders(org_id);
create index if not exists orders_status_idx on public.orders(org_id, status);
create index if not exists orders_buyer_member_idx on public.orders(buyer_member_id);
alter table public.orders enable row level security;
create policy orders_tenant on public.orders
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy orders_super_admin on public.orders
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 5. order_items
-- ─────────────────────────────────────────────

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_label text,
  quantity integer not null check (quantity > 0),
  unit_price_sar numeric(10,2) not null,
  subtotal_sar numeric(10,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);
alter table public.order_items enable row level security;
create policy order_items_tenant on public.order_items
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy order_items_super_admin on public.order_items
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- 6. shipments — minimal manual carrier metadata
-- ─────────────────────────────────────────────

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text,
  shipped_at timestamptz not null default now(),
  delivered_at timestamptz,
  notes text
);
create index if not exists shipments_order_idx on public.shipments(order_id);
alter table public.shipments enable row level security;
create policy shipments_tenant on public.shipments
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy shipments_super_admin on public.shipments
  for all using (public.is_super_admin()) with check (public.is_super_admin());
