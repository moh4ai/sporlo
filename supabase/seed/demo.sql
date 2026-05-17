-- Sporlo — demo data seed for "Demo Sports Club" tenant
--
-- WHAT THIS SEEDS
-- A fully populated demo tenant (org_slug = 'demo-club') across all 10
-- modules so the dashboard, public site, and member portal can be walked
-- end-to-end as a demo without setting up real accounts or running through
-- the onboarding flow.
--
-- HOW TO USE
-- Paste this file into the Supabase SQL editor — but RUN ONE CHUNK AT A TIME.
-- Each `do $$ ... $$;` block is its own transaction, so if one errors the
-- previous chunks remain committed. The chunks are independent and look up
-- the IDs they need from earlier seeded rows. Paste in order:
--   Chunk 1 — Org + branch
--   Chunk 2A — Plans + members + portal token
--   Chunk 2B — Subscriptions + payments + coupons
--   Chunk 3 — Finance
--   Chunk 4 — Events
--   Chunk 5 — Store
--   Chunk 6 — Facilities + Team
--   Chunk 7A — Academy coaches
--   Chunk 7B — Academy sessions
--   Chunk 8A — HR staff profiles
--   Chunk 8B — HR job descriptions + certifications
--   Chunk 9A — Governance KPI events
--   Chunk 9B — Governance deadlines + penalty + support + report
--   Chunk 10A — Media pages + news + broadcasts + prefs
--   Chunk 10B — Message threads + messages
--
-- IDEMPOTENT
-- Each chunk has its own re-run guard. To wipe everything for a fresh seed:
--   delete from public.organizations where slug = 'demo-club';
-- which cascades through every demo-scoped row in every table.
--
-- HOW TO VIEW THE DEMO
-- Dashboard:    sporlo-admin.vercel.app → impersonate "Demo Sports Club"
-- Member portal: see the URL printed by chunk 2A's NOTICE, or run:
--   select 'https://sporlo-app.vercel.app/en/portal/' || token::text
--   from public.member_portal_tokens
--   where member_id = (select id from public.members
--                      where member_number = 'M-DEMO-00001'
--                        and org_id = (select id from public.organizations where slug = 'demo-club'))
--   order by created_at desc limit 1;
--
-- A NOTE ON PL/pgSQL QUIRKS
-- The chunks below all work around three Supabase SQL editor parser quirks:
--   1. Chained `SELECT … INTO var` and `RETURNING … INTO var` statements can
--      trigger "INTO specified more than once" — use `var := (subquery)` form
--      or interleave the inserts so chained INTOs are split apart.
--   2. Partial unique indexes (e.g. `unique (col1, col2) where col2 is not null`)
--      need the WHERE clause in the ON CONFLICT target too.
--   3. Long lines with Arabic + commas can get mangled in copy-paste —
--      keep each VALUES row on a single line.

-- ─────────────────────────────────────────────
-- CHUNK 1 — Organisation + branch
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_branch uuid;
begin
  v_org := (select id from public.organizations where slug = 'demo-club' limit 1);
  if v_org is null then
    insert into public.organizations (slug, name_ar, name_en, tier, subscription_tier)
    values ('demo-club', 'النادي التجريبي', 'Demo Sports Club', 'b', 'pro')
    returning id into v_org;
  end if;

  v_branch := (select id from public.branches where org_id = v_org and name_en = 'Riyadh HQ' limit 1);
  if v_branch is null then
    insert into public.branches (org_id, name_ar, name_en, city)
    values (v_org, 'مقر الرياض', 'Riyadh HQ', 'Riyadh')
    returning id into v_branch;
  end if;

  raise notice 'Demo org: %', v_org;
  raise notice 'Demo branch: %', v_branch;
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 2A — Memberships: plans + members + portal token
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_branch uuid;
  v_member_ahmad uuid;
  v_portal_token uuid;
begin
  v_org    := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_branch := (select id from public.branches where org_id = v_org and name_en = 'Riyadh HQ' limit 1);

  insert into public.plans (org_id, code, name_ar, name_en, duration_months, price_sar, member_only_store_discount_pct, active) values
    (v_org, 'gold-12mo',  'الذهبية',   'Gold - 12 months',  12, 1500.00, 15, true),
    (v_org, 'silver-6mo', 'الفضية',    'Silver - 6 months',  6,  900.00, 10, true),
    (v_org, 'bronze-3mo', 'البرونزية', 'Bronze - 3 months',  3,  500.00,  5, true)
  on conflict (org_id, code) do nothing;

  insert into public.members (org_id, branch_id, full_name_ar, full_name_en, email, phone, member_number, status, joined_at) values
    (v_org, v_branch, 'أحمد الزهراني',  'Ahmad Al-Zahrani',    'ahmad@example.com',    '+966501000001', 'M-DEMO-00001', 'active',   now() - interval '8 months'),
    (v_org, v_branch, 'محمد القحطاني',  'Mohammed Al-Qahtani', 'mohammed@example.com', '+966501000002', 'M-DEMO-00002', 'active',   now() - interval '7 months'),
    (v_org, v_branch, 'فيصل العتيبي',   'Faisal Al-Otaibi',    'faisal@example.com',   '+966501000003', 'M-DEMO-00003', 'active',   now() - interval '7 months'),
    (v_org, v_branch, 'خالد الغامدي',   'Khalid Al-Ghamdi',    'khalid@example.com',   '+966501000004', 'M-DEMO-00004', 'active',   now() - interval '6 months'),
    (v_org, v_branch, 'سلطان العنزي',   'Sultan Al-Anazi',     'sultan@example.com',   '+966501000005', 'M-DEMO-00005', 'active',   now() - interval '5 months'),
    (v_org, v_branch, 'عبدالله الحربي', 'Abdullah Al-Harbi',   'abdullah@example.com', '+966501000006', 'M-DEMO-00006', 'active',   now() - interval '5 months'),
    (v_org, v_branch, 'سعود الدوسري',   'Saud Al-Dosari',      'saud@example.com',     '+966501000007', 'M-DEMO-00007', 'active',   now() - interval '4 months'),
    (v_org, v_branch, 'بندر المطيري',   'Bandar Al-Mutairi',   'bandar@example.com',   '+966501000008', 'M-DEMO-00008', 'active',   now() - interval '4 months'),
    (v_org, v_branch, 'عمر الشمري',     'Omar Al-Shamri',      'omar@example.com',     '+966501000009', 'M-DEMO-00009', 'active',   now() - interval '3 months'),
    (v_org, v_branch, 'يوسف الزهراني',  'Yousef Al-Zahrani',   'yousef@example.com',   '+966501000010', 'M-DEMO-00010', 'active',   now() - interval '3 months'),
    (v_org, v_branch, 'حسن السبيعي',    'Hassan Al-Subaie',    'hassan@example.com',   '+966501000011', 'M-DEMO-00011', 'active',   now() - interval '2 months'),
    (v_org, v_branch, 'نواف الرشيدي',   'Nawaf Al-Rashidi',    'nawaf@example.com',    '+966501000012', 'M-DEMO-00012', 'active',   now() - interval '2 months'),
    (v_org, v_branch, 'تركي العسيري',   'Turki Al-Asmari',     'turki@example.com',    '+966501000013', 'M-DEMO-00013', 'active',   now() - interval '6 weeks'),
    (v_org, v_branch, 'منصور المالكي',  'Mansour Al-Maliki',   'mansour@example.com',  '+966501000014', 'M-DEMO-00014', 'active',   now() - interval '5 weeks'),
    (v_org, v_branch, 'طلال العجمي',    'Talal Al-Ajmi',       'talal@example.com',    '+966501000015', 'M-DEMO-00015', 'active',   now() - interval '4 weeks'),
    (v_org, v_branch, 'سالم الشهراني',  'Salem Al-Shahrani',   'salem@example.com',    '+966501000016', 'M-DEMO-00016', 'active',   now() - interval '3 weeks'),
    (v_org, v_branch, 'حمد البلوي',     'Hamad Al-Balawi',     'hamad@example.com',    '+966501000017', 'M-DEMO-00017', 'active',   now() - interval '2 weeks'),
    (v_org, v_branch, 'راكان الخالدي',  'Rakan Al-Khaldi',     'rakan@example.com',    '+966501000018', 'M-DEMO-00018', 'active',   now() - interval '10 months'),
    (v_org, v_branch, 'فهد التميمي',    'Fahad Al-Tamimi',     'fahad@example.com',    '+966501000019', 'M-DEMO-00019', 'inactive', now() - interval '14 months'),
    (v_org, v_branch, 'يزيد البيشي',    'Yazid Al-Bishi',      'yazid@example.com',    '+966501000020', 'M-DEMO-00020', 'prospect', now() - interval '1 week')
  on conflict (org_id, member_number) where member_number is not null do nothing;

  v_member_ahmad := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00001' limit 1);

  insert into public.member_portal_tokens (org_id, member_id, expires_at)
  values (v_org, v_member_ahmad, now() + interval '7 days')
  returning token into v_portal_token;

  raise notice 'Plans + 20 members seeded';
  raise notice 'Portal token: %', v_portal_token;
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 2B — Subscriptions + payments + coupons
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_plan_gold uuid;
  v_plan_silver uuid;
  v_plan_bronze uuid;
begin
  v_org         := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_plan_gold   := (select id from public.plans where org_id = v_org and code = 'gold-12mo' limit 1);
  v_plan_silver := (select id from public.plans where org_id = v_org and code = 'silver-6mo' limit 1);
  v_plan_bronze := (select id from public.plans where org_id = v_org and code = 'bronze-3mo' limit 1);

  insert into public.subscriptions (org_id, member_id, plan_id, status, starts_at, ends_at, frozen_from, frozen_to, cancelled_at)
  select v_org, m.id,
    case
      when m.member_number between 'M-DEMO-00001' and 'M-DEMO-00008' then v_plan_gold
      when m.member_number between 'M-DEMO-00009' and 'M-DEMO-00013' then v_plan_silver
      else v_plan_bronze
    end,
    case
      when m.member_number = 'M-DEMO-00018' then 'frozen'
      when m.member_number = 'M-DEMO-00019' then 'cancelled'
      when m.member_number = 'M-DEMO-00020' then 'pending'
      else 'active'
    end,
    m.joined_at,
    case
      when m.member_number between 'M-DEMO-00001' and 'M-DEMO-00008' then m.joined_at + interval '12 months'
      when m.member_number between 'M-DEMO-00009' and 'M-DEMO-00013' then m.joined_at + interval '6 months'
      else m.joined_at + interval '3 months'
    end,
    case when m.member_number = 'M-DEMO-00018' then now() - interval '3 weeks' end,
    case when m.member_number = 'M-DEMO-00018' then now() + interval '5 weeks' end,
    case when m.member_number = 'M-DEMO-00019' then now() - interval '2 months' end
  from public.members m
  where m.org_id = v_org and m.member_number like 'M-DEMO-%'
    and not exists (select 1 from public.subscriptions s where s.member_id = m.id and s.org_id = v_org);

  insert into public.payments (org_id, subscription_id, member_id, amount_sar, status, provider_payment_id, paid_at, idempotency_key)
  select v_org, s.id, s.member_id, p.price_sar, 'paid',
    'demo_seed_' || replace(s.id::text, '-', ''), s.starts_at,
    'demo-init-' || replace(s.id::text, '-', '')
  from public.subscriptions s join public.plans p on p.id = s.plan_id
  where s.org_id = v_org and s.status in ('active', 'frozen')
    and not exists (select 1 from public.payments py where py.idempotency_key = 'demo-init-' || replace(s.id::text, '-', ''));

  insert into public.payments (org_id, subscription_id, member_id, amount_sar, status, provider_payment_id, paid_at, idempotency_key)
  select v_org, s.id, s.member_id, 250.00, 'paid',
    'demo_renewal_' || replace(s.id::text, '-', '') || '_' || g,
    s.starts_at + (g || ' months')::interval,
    'demo-renewal-' || replace(s.id::text, '-', '') || '-' || g
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id and p.code = 'gold-12mo'
  join generate_series(1, 4) g on s.starts_at + (g || ' months')::interval < now()
  where s.org_id = v_org and s.status = 'active'
    and not exists (select 1 from public.payments py
      where py.idempotency_key = 'demo-renewal-' || replace(s.id::text, '-', '') || '-' || g);

  insert into public.discount_coupons (org_id, code, percent_off, max_uses, used_count, valid_from, valid_to, active) values
    (v_org, 'WELCOME10', 10, 100, 12, now() - interval '6 months', now() + interval '6 months', true),
    (v_org, 'FAMILY20',  20,  50,  3, now() - interval '3 months', now() + interval '3 months', true),
    (v_org, 'STAFF50',   50,  20,  8, now() - interval '8 months', now() - interval '1 month',  false)
  on conflict (org_id, code) do nothing;

  raise notice 'Subscriptions + payments + coupons seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 3 — Finance
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_member_ahmad uuid;
  v_member_omar uuid;
begin
  v_org          := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_member_ahmad := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00001' limit 1);
  v_member_omar  := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00009' limit 1);

  insert into public.payment_methods (org_id, label, type, details_jsonb, active) values
    (v_org, 'Moyasar',             'moyasar',       '{}'::jsonb, true),
    (v_org, 'Front desk POS',      'pos_terminal',  '{}'::jsonb, true),
    (v_org, 'Bank transfer (SNB)', 'bank_transfer', '{}'::jsonb, true),
    (v_org, 'Petty cash',          'cash',          '{}'::jsonb, true)
  on conflict (org_id, label) do nothing;

  insert into public.refunds (org_id, payment_id, amount_sar, reason, status)
  select v_org, py.id, py.amount_sar * 0.5, 'Partial refund', 'completed'
  from public.payments py
  where py.org_id = v_org and py.member_id = v_member_ahmad and py.idempotency_key like 'demo-init-%'
  limit 1;

  insert into public.refunds (org_id, payment_id, amount_sar, reason, status)
  select v_org, py.id, py.amount_sar, 'Duplicate charge', 'approved'
  from public.payments py
  where py.org_id = v_org and py.member_id = v_member_omar and py.idempotency_key like 'demo-init-%'
  limit 1;

  insert into public.quarterly_disclosures (org_id, quarter, totals_jsonb)
  values (v_org,
    extract(year from now())::text || '-Q' || ceil(extract(month from now())::int / 3.0)::text,
    '{}'::jsonb)
  on conflict (org_id, quarter) do nothing;

  raise notice 'Finance seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 4 — Events (fixtures + sections + tiers + tickets)
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_fixture_next uuid;
  v_section_vip uuid;
  v_section_main uuid;
  v_section_family uuid;
begin
  v_org := (select id from public.organizations where slug = 'demo-club' limit 1);

  insert into public.fixtures (org_id, opponent_ar, opponent_en, kickoff_at, venue, sport_type, status, home_score, away_score)
  select * from (values
    (v_org, 'الاتحاد', 'Al-Ittihad', (now() - interval '12 days')::timestamptz, 'King Fahd Stadium', 'football', 'completed',  2::int,  1::int),
    (v_org, 'الهلال',  'Al-Hilal',   (now() + interval '8 days')::timestamptz,  'King Fahd Stadium', 'football', 'scheduled',  null::int, null::int),
    (v_org, 'النصر',   'Al-Nassr',   (now() + interval '22 days')::timestamptz, 'King Fahd Stadium', 'football', 'scheduled',  null::int, null::int)
  ) as v(org_id, opponent_ar, opponent_en, kickoff_at, venue, sport_type, status, home_score, away_score)
  where not exists (
    select 1 from public.fixtures f
    where f.org_id = v.org_id and f.opponent_en = v.opponent_en
  );

  v_fixture_next := (select id from public.fixtures where org_id = v_org and opponent_en = 'Al-Hilal' limit 1);

  insert into public.venue_sections (org_id, fixture_id, label, rows_count, seats_per_row, display_order) values
    (v_org, v_fixture_next, 'VIP',    4, 20, 0),
    (v_org, v_fixture_next, 'Main',  10, 30, 1),
    (v_org, v_fixture_next, 'Family', 6, 25, 2)
  on conflict (fixture_id, label) do nothing;

  v_section_vip    := (select id from public.venue_sections where fixture_id = v_fixture_next and label = 'VIP' limit 1);
  v_section_main   := (select id from public.venue_sections where fixture_id = v_fixture_next and label = 'Main' limit 1);
  v_section_family := (select id from public.venue_sections where fixture_id = v_fixture_next and label = 'Family' limit 1);

  insert into public.pricing_tiers (org_id, fixture_id, section_id, label, price_sar, member_price_sar) values
    (v_org, v_fixture_next, v_section_vip,    'VIP',    300, 250),
    (v_org, v_fixture_next, v_section_main,   'Main',   120, 100),
    (v_org, v_fixture_next, v_section_family, 'Family',  60,  50)
  on conflict (fixture_id, section_id) do nothing;

  insert into public.tickets (org_id, fixture_id, qr_code, price_sar, status, buyer_email)
  select v_org, v_fixture_next,
    'DEMO-' || replace(v_fixture_next::text, '-', '') || '-' || lpad(g::text, 4, '0'),
    case when g <= 3 then 250 when g <= 10 then 100 else 50 end,
    'paid', 'ticket' || g || '@example.com'
  from generate_series(1, 15) g
  on conflict (qr_code) do nothing;

  raise notice 'Events seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 5 — Store (products + variants + orders)
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_member_ahmad uuid;
  v_member_omar uuid;
  v_product_jersey uuid;
  v_product_scarf uuid;
  v_product_cap uuid;
  v_product_mug uuid;
  v_product_bottle uuid;
begin
  v_org          := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_member_ahmad := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00001' limit 1);
  v_member_omar  := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00009' limit 1);

  if exists (select 1 from public.products where org_id = v_org and name_en = 'Official home jersey 25/26') then
    raise notice 'Store already seeded - skipping';
    return;
  end if;

  insert into public.products (org_id, name_ar, name_en, category, active)
  values (v_org, 'القميص الرسمي', 'Official home jersey 25/26', 'Apparel', true)
  returning id into v_product_jersey;

  insert into public.products (org_id, name_ar, name_en, category, active)
  values (v_org, 'وشاح المشجعين', 'Supporter scarf', 'Apparel', true)
  returning id into v_product_scarf;

  insert into public.products (org_id, name_ar, name_en, category, active)
  values (v_org, 'قبعة النادي', 'Club cap', 'Apparel', true)
  returning id into v_product_cap;

  insert into public.products (org_id, name_ar, name_en, category, active)
  values (v_org, 'كوب القهوة', 'Coffee mug', 'Accessories', true)
  returning id into v_product_mug;

  insert into public.products (org_id, name_ar, name_en, category, active)
  values (v_org, 'زجاجة المياه', 'Sports water bottle', 'Accessories', true)
  returning id into v_product_bottle;

  insert into public.product_variants (org_id, product_id, sku, size, color, price_sar, member_price_sar, stock, active) values
    (v_org, v_product_jersey, 'JRS-S',  'S',  'Green', 250, 212, 14, true),
    (v_org, v_product_jersey, 'JRS-M',  'M',  'Green', 250, 212, 22, true),
    (v_org, v_product_jersey, 'JRS-L',  'L',  'Green', 250, 212, 18, true),
    (v_org, v_product_jersey, 'JRS-XL', 'XL', 'Green', 250, 212,  9, true),
    (v_org, v_product_scarf,  'SCF-G',  null, 'Green',  80,  68, 30, true),
    (v_org, v_product_cap,    'CAP-G',  null, 'Green',  60,  51, 25, true),
    (v_org, v_product_mug,    'MUG-G',  null, 'Green',  35,  30, 50, true),
    (v_org, v_product_bottle, 'BOT-G',  null, 'Green',  45,  38, 40, true);

  insert into public.orders (org_id, buyer_email, buyer_member_id, status, subtotal_sar, discount_sar, total_sar, paid_at) values
    (v_org, 'ahmad@example.com',   v_member_ahmad, 'paid',    250, 38, 212, now() - interval '20 days'),
    (v_org, 'omar@example.com',    v_member_omar,  'shipped', 140, 14, 126, now() - interval '8 days'),
    (v_org, 'walk-in@example.com', null,           'paid',     80,  0,  80, now() - interval '3 days');

  raise notice 'Store seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 6 — Facilities + bookings + squads + roster
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_branch uuid;
  v_member_ahmad uuid;
  v_member_omar uuid;
  v_member_khalid uuid;
  v_pitch_a uuid;
  v_pitch_b uuid;
  v_gym uuid;
  v_pool uuid;
  v_first_team uuid;
  v_u21 uuid;
begin
  v_org           := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_branch        := (select id from public.branches where org_id = v_org and name_en = 'Riyadh HQ' limit 1);
  v_member_ahmad  := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00001' limit 1);
  v_member_omar   := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00009' limit 1);
  v_member_khalid := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00014' limit 1);

  if exists (select 1 from public.facilities where org_id = v_org and name_en = 'Pitch A - Main') then
    raise notice 'Facilities already seeded - skipping';
    return;
  end if;

  insert into public.facilities (org_id, branch_id, name_ar, name_en, facility_type, capacity, hourly_rate_sar, member_hourly_rate_sar, active)
  values (v_org, v_branch, 'الملعب الرئيسي', 'Pitch A - Main', 'Football pitch (11v11)', 200, 400, 300, true)
  returning id into v_pitch_a;

  insert into public.facilities (org_id, branch_id, name_ar, name_en, facility_type, capacity, hourly_rate_sar, member_hourly_rate_sar, active)
  values (v_org, v_branch, 'الملعب الفرعي', 'Pitch B - Training', 'Football pitch (7v7)', 100, 250, 180, true)
  returning id into v_pitch_b;

  insert into public.facilities (org_id, branch_id, name_ar, name_en, facility_type, capacity, hourly_rate_sar, member_hourly_rate_sar, active)
  values (v_org, v_branch, 'الصالة الرياضية', 'Gym', 'Indoor gym', 40, 120, 80, true)
  returning id into v_gym;

  insert into public.facilities (org_id, branch_id, name_ar, name_en, facility_type, capacity, hourly_rate_sar, member_hourly_rate_sar, active)
  values (v_org, v_branch, 'حوض السباحة', 'Pool', 'Swimming pool', 30, 150, 100, true)
  returning id into v_pool;

  insert into public.facility_bookings (org_id, facility_id, member_id, time_range, status) values
    (v_org, v_pitch_a, v_member_ahmad,  tstzrange(now() - interval '3 days' - interval '2 hours', now() - interval '3 days', '[)'), 'completed'),
    (v_org, v_pitch_b, v_member_omar,   tstzrange(now() + interval '2 days', now() + interval '2 days' + interval '90 minutes', '[)'), 'confirmed'),
    (v_org, v_gym,     v_member_khalid, tstzrange(now() + interval '1 day' + interval '6 hours', now() + interval '1 day' + interval '7 hours', '[)'), 'confirmed'),
    (v_org, v_pool,    null,            tstzrange(now() + interval '4 days', now() + interval '4 days' + interval '60 minutes', '[)'), 'confirmed');

  insert into public.squads (org_id, branch_id, name_ar, name_en, season, sport_type, active)
  values (v_org, v_branch, 'الفريق الأول', 'First team', '2025/26', 'football', true)
  returning id into v_first_team;

  insert into public.squads (org_id, branch_id, name_ar, name_en, season, sport_type, active)
  values (v_org, v_branch, 'تحت 21', 'Under-21 team', '2025/26', 'football', true)
  returning id into v_u21;

  insert into public.roster_entries (org_id, squad_id, full_name_ar, full_name_en, jersey_number, position, nationality, active) values
    (v_org, v_first_team, 'أحمد الحارس',  'Ahmad - GK',     1, 'Goalkeeper', 'SA', true),
    (v_org, v_first_team, 'سعد الظهير',   'Saad - RB',      2, 'Defender',   'SA', true),
    (v_org, v_first_team, 'فهد الظهير',   'Fahad - LB',     3, 'Defender',   'SA', true),
    (v_org, v_first_team, 'ماجد القلب',   'Majed - CB',     4, 'Defender',   'SA', true),
    (v_org, v_first_team, 'وليد القلب',   'Waleed - CB',    5, 'Defender',   'SA', true),
    (v_org, v_first_team, 'بدر الوسط',    'Bader - CM',     6, 'Midfielder', 'SA', true),
    (v_org, v_first_team, 'ناصر الوسط',   'Nasser - CM',    8, 'Midfielder', 'SA', true),
    (v_org, v_first_team, 'سامي الجناح',  'Sami - RW',      7, 'Forward',    'SA', true),
    (v_org, v_first_team, 'ياسر الجناح',  'Yasser - LW',   11, 'Forward',    'SA', true),
    (v_org, v_first_team, 'هاشم المهاجم', 'Hashem - ST',    9, 'Forward',    'SA', true),
    (v_org, v_first_team, 'علي البديل',   'Ali - SUB',     14, 'Midfielder', 'SA', true),
    (v_org, v_u21,        'مشعل الناشئ', 'Mishal - youth',10, 'Forward',    'SA', true),
    (v_org, v_u21,        'تركي الناشئ', 'Turki - youth',  7, 'Midfielder', 'SA', true),
    (v_org, v_u21,        'حمد الناشئ',  'Hamad - youth',  4, 'Defender',   'SA', true),
    (v_org, v_u21,        'مازن الناشئ', 'Mazen - youth',  1, 'Goalkeeper', 'SA', true);

  raise notice 'Facilities + Team seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 7A — Academy coaches
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
begin
  v_org := (select id from public.organizations where slug = 'demo-club' limit 1);

  if exists (select 1 from public.coaches where org_id = v_org and full_name_en = 'Coach Omar') then
    raise notice 'Coaches already seeded';
    return;
  end if;

  insert into public.coaches (org_id, full_name_ar, full_name_en, email, phone, active) values
    (v_org, 'الكابتن عمر', 'Coach Omar', 'omar@example.com', '+966555000001', true),
    (v_org, 'الكابتن ياسر', 'Coach Yasser', 'yasser@example.com', '+966555000002', true),
    (v_org, 'الكابتن ماجد', 'Coach Majed', 'majed@example.com', '+966555000003', true);

  raise notice 'Coaches seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 7B — Academy sessions
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_pitch_a uuid;
  v_pitch_b uuid;
  v_gym uuid;
  v_u21 uuid;
  v_coach_omar uuid;
  v_coach_yasir uuid;
  v_coach_majed uuid;
begin
  v_org         := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_pitch_a     := (select id from public.facilities where org_id = v_org and name_en = 'Pitch A - Main' limit 1);
  v_pitch_b     := (select id from public.facilities where org_id = v_org and name_en = 'Pitch B - Training' limit 1);
  v_gym         := (select id from public.facilities where org_id = v_org and name_en = 'Gym' limit 1);
  v_u21         := (select id from public.squads where org_id = v_org and name_en = 'Under-21 team' limit 1);
  v_coach_omar  := (select id from public.coaches where org_id = v_org and full_name_en = 'Coach Omar' limit 1);
  v_coach_yasir := (select id from public.coaches where org_id = v_org and full_name_en = 'Coach Yasser' limit 1);
  v_coach_majed := (select id from public.coaches where org_id = v_org and full_name_en = 'Coach Majed' limit 1);

  if exists (select 1 from public.academy_sessions where org_id = v_org and title_en = 'Technical drills') then
    raise notice 'Sessions already seeded';
    return;
  end if;

  insert into public.academy_sessions (org_id, coach_id, squad_id, facility_id, title_ar, title_en, scheduled_at, duration_minutes, age_group) values
    (v_org, v_coach_omar, v_u21, v_pitch_b, 'تدريب فني', 'Technical drills', now() - interval '5 days', 90, 'U-21'),
    (v_org, v_coach_yasir, v_u21, v_pitch_b, 'تدريب حراس', 'Goalkeeper session', now() - interval '3 days', 60, 'U-21'),
    (v_org, v_coach_majed, v_u21, v_gym, 'لياقة بدنية', 'Strength session', now() - interval '1 day', 60, 'U-21'),
    (v_org, v_coach_omar, v_u21, v_pitch_b, 'مباراة تطبيقية', 'Match practice', now() + interval '2 days', 90, 'U-21'),
    (v_org, v_coach_omar, null, v_pitch_a, 'يوم مفتوح', 'Open kids day', now() + interval '7 days', 120, 'U-12');

  raise notice 'Academy sessions seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 8A — HR staff profiles
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_staff_ceo uuid;
  v_staff_marketing uuid;
  v_staff_finance uuid;
  v_staff_sports uuid;
begin
  v_org := (select id from public.organizations where slug = 'demo-club' limit 1);

  if exists (select 1 from public.staff_profiles where org_id = v_org and full_name_en = 'Abdulaziz - CEO') then
    raise notice 'Staff already seeded';
    return;
  end if;

  insert into public.staff_profiles (org_id, full_name_ar, full_name_en, job_title_ar, job_title_en, department, email, phone, hire_date, active) values
    (v_org, 'عبدالعزيز', 'Abdulaziz - CEO', 'الرئيس التنفيذي', 'Chief Executive', null, 'ceo@example.com', '+966555100001', current_date - interval '5 years', true),
    (v_org, 'سارة', 'Sarah - Marketing lead', 'مديرة التسويق', 'Head of Marketing', 'marketing', 'marketing@example.com', '+966555100002', current_date - interval '3 years', true),
    (v_org, 'محمد', 'Mohammed - Finance', 'مدير المالية', 'Head of Finance', 'finance', 'finance@example.com', '+966555100003', current_date - interval '4 years', true),
    (v_org, 'خالد', 'Khalid - Sports', 'مدير الشؤون الرياضية', 'Head of Sports', 'sports', 'sports@example.com', '+966555100004', current_date - interval '3 years', true),
    (v_org, 'نورة', 'Noura - HR', 'مديرة الموارد البشرية', 'Head of HR', 'hr', 'hr@example.com', '+966555100005', current_date - interval '2 years', true),
    (v_org, 'هيا', 'Haya - Legal', 'المستشارة القانونية', 'Legal Counsel', 'legal', 'legal@example.com', '+966555100006', current_date - interval '2 years', true),
    (v_org, 'منى', 'Mona - CSR', 'مسؤولة المسؤولية', 'CSR Manager', 'csr', 'csr@example.com', '+966555100007', current_date - interval '1 year', true),
    (v_org, 'أيمن', 'Ayman - IT', 'مدير تقنية المعلومات', 'IT Manager', 'it', 'it@example.com', '+966555100008', current_date - interval '1 year', true),
    (v_org, 'حصة', 'Hessa - Academy', 'مديرة الأكاديمية', 'Academy Director', 'academy', 'academy@example.com', '+966555100009', current_date - interval '6 months', true),
    (v_org, 'رؤى', 'Roa - Events', 'مديرة الفعاليات', 'Events Manager', 'events', 'events@example.com', '+966555100010', current_date - interval '6 months', true);

  v_staff_ceo       := (select id from public.staff_profiles where org_id = v_org and full_name_en = 'Abdulaziz - CEO' limit 1);
  v_staff_marketing := (select id from public.staff_profiles where org_id = v_org and full_name_en = 'Sarah - Marketing lead' limit 1);
  v_staff_finance   := (select id from public.staff_profiles where org_id = v_org and full_name_en = 'Mohammed - Finance' limit 1);
  v_staff_sports    := (select id from public.staff_profiles where org_id = v_org and full_name_en = 'Khalid - Sports' limit 1);

  update public.staff_profiles set manager_id = v_staff_ceo
    where org_id = v_org and full_name_en in ('Sarah - Marketing lead','Mohammed - Finance','Khalid - Sports','Noura - HR','Haya - Legal','Mona - CSR','Ayman - IT');

  update public.staff_profiles set manager_id = v_staff_sports
    where org_id = v_org and full_name_en in ('Hessa - Academy', 'Roa - Events');

  raise notice 'Staff seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 8B — HR job descriptions + certifications
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_staff_ceo uuid;
  v_staff_marketing uuid;
  v_staff_finance uuid;
  v_staff_sports uuid;
begin
  v_org             := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_staff_ceo       := (select id from public.staff_profiles where org_id = v_org and full_name_en = 'Abdulaziz - CEO' limit 1);
  v_staff_marketing := (select id from public.staff_profiles where org_id = v_org and full_name_en = 'Sarah - Marketing lead' limit 1);
  v_staff_finance   := (select id from public.staff_profiles where org_id = v_org and full_name_en = 'Mohammed - Finance' limit 1);
  v_staff_sports    := (select id from public.staff_profiles where org_id = v_org and full_name_en = 'Khalid - Sports' limit 1);

  if exists (select 1 from public.job_descriptions where org_id = v_org and title_en = 'Marketing Manager') then
    raise notice 'JDs + certs already seeded';
    return;
  end if;

  insert into public.job_descriptions (org_id, title_ar, title_en, department, level, active) values
    (v_org, 'مدير تسويق', 'Marketing Manager', 'marketing', 'Senior', true),
    (v_org, 'محاسب أول', 'Senior Accountant', 'finance', 'Senior', true),
    (v_org, 'مدرب أكاديمية', 'Academy Coach', 'sports', 'Mid', true),
    (v_org, 'مسؤول فعاليات', 'Events Coordinator', 'events', 'Junior', true);

  insert into public.certifications (org_id, staff_profile_id, name, issuer, issued_at, expires_at) values
    (v_org, v_staff_ceo,       'Board director', 'GCC Board Forum', current_date - interval '1 year',  current_date + interval '2 years'),
    (v_org, v_staff_marketing, 'Google Ads',     'Google',          current_date - interval '8 months', current_date + interval '4 months'),
    (v_org, v_staff_finance,   'SOCPA Member',   'SOCPA',           current_date - interval '3 years', current_date + interval '14 days'),
    (v_org, v_staff_sports,    'AFC B Coaching', 'AFC',             current_date - interval '2 years', current_date - interval '1 month'),
    (v_org, v_staff_ceo,       'First Aid',      'Red Crescent',    current_date - interval '6 months', current_date + interval '6 months');

  raise notice 'JDs + certs seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 9A — Governance KPI events
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_branch uuid;
begin
  v_org    := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_branch := (select id from public.branches where org_id = v_org and name_en = 'Riyadh HQ' limit 1);

  if exists (select 1 from public.kpi_events where org_id = v_org and source_module = 'memberships' and event_type = 'member_added') then
    raise notice 'KPI events already seeded';
    return;
  end if;

  insert into public.kpi_events (org_id, branch_id, category, criterion_code, event_type, source_module, occurred_at)
  select v_org, v_branch, 'c', 'C1', 'member_added', 'memberships', m.joined_at
  from public.members m
  where m.org_id = v_org and m.member_number like 'M-DEMO-%' and m.status = 'active';

  insert into public.kpi_events (org_id, branch_id, category, criterion_code, event_type, source_module, occurred_at, quantitative_value)
  select v_org, v_branch, 'b', 'B2', 'subscription_started', 'memberships', s.starts_at, p.price_sar
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.org_id = v_org and s.status in ('active', 'frozen');

  insert into public.kpi_events (org_id, branch_id, category, criterion_code, event_type, source_module, occurred_at, quantitative_value)
  select v_org, v_branch, 'b', 'B2', 'revenue_recorded', 'memberships', py.paid_at, py.amount_sar
  from public.payments py
  where py.org_id = v_org and py.status = 'paid' and py.paid_at is not null;

  insert into public.kpi_events (org_id, branch_id, category, criterion_code, event_type, source_module, occurred_at, quantitative_value)
  select v_org, v_branch, 'b', 'B2', 'ticket_sold', 'events', now() - (random() * interval '20 days'), t.price_sar
  from public.tickets t
  where t.org_id = v_org and t.status = 'paid';

  insert into public.kpi_events (org_id, branch_id, category, criterion_code, event_type, source_module, occurred_at)
  values (v_org, v_branch, 'd', 'D1', 'event_held', 'events', now() - interval '12 days');

  insert into public.kpi_events (org_id, branch_id, category, criterion_code, event_type, source_module, occurred_at)
  select v_org, v_branch, 'd', 'D1', 'academy_session_held', 'academy', a.scheduled_at
  from public.academy_sessions a
  where a.org_id = v_org and a.scheduled_at < now();

  insert into public.kpi_events (org_id, branch_id, category, criterion_code, event_type, source_module, occurred_at)
  select v_org, v_branch, 'e', 'E1', 'facility_booked', 'facilities', lower(b.time_range)
  from public.facility_bookings b
  where b.org_id = v_org;

  insert into public.kpi_events (org_id, branch_id, category, criterion_code, event_type, source_module, occurred_at)
  select v_org, v_branch, 'e', 'E1', 'staff_certified', 'hr', coalesce(c.issued_at::timestamptz, now())
  from public.certifications c
  where c.org_id = v_org;

  insert into public.kpi_events (org_id, branch_id, category, criterion_code, event_type, source_module, occurred_at)
  values (v_org, v_branch, 'b', 'B2', 'disclosure_submitted', 'finance', now() - interval '5 days');

  raise notice 'KPI events seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 9B — Governance deadlines + penalty + support + report
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_quarter text;
begin
  v_org     := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_quarter := extract(year from now())::text || '-Q' || ceil(extract(month from now())::int / 3.0)::text;

  if exists (select 1 from public.ministry_reports where org_id = v_org) then
    raise notice 'Governance extras already seeded';
    return;
  end if;

  insert into public.governance_deadlines (org_id, title_ar, due_at, warning_at) values
    (v_org, 'إفصاح الميزانية الفصلية', now() + interval '10 days', now() + interval '3 days'),
    (v_org, 'تقديم تقرير الحوكمة', now() + interval '30 days', now() + interval '15 days'),
    (v_org, 'تجديد ترخيص الأكاديمية', now() - interval '4 days', now() - interval '14 days');

  insert into public.penalty_log (org_id, quarter, criterion_code, percent_deducted, amount_sar, reason, status)
  values (v_org, v_quarter, null, 10, 50000, 'Missed deadline: Academy licence renewal', 'estimated');

  insert into public.financial_support_estimates (org_id, quarter, tier, amount_sar, total_score, basis_jsonb)
  values (v_org, v_quarter, 'b', 1875000, 75, '{}'::jsonb)
  on conflict (org_id, quarter) do nothing;

  insert into public.ministry_reports (org_id, quarter, format, total_score)
  values (v_org, v_quarter, 'pdf', 75);

  raise notice 'Governance extras seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 10A — Media pages + news + broadcasts + prefs
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
begin
  v_org := (select id from public.organizations where slug = 'demo-club' limit 1);

  insert into public.public_pages (org_id, slug, title_ar, title_en, body_ar, body_en, published) values
    (v_org, 'about', 'عن النادي', 'About the club', 'تأسس عام 1976', 'Founded in 1976', true),
    (v_org, 'history', 'تاريخ النادي', 'Our history', 'خمسة عقود من البطولات', 'Five decades of trophies', true),
    (v_org, 'sponsors', 'الشركاء', 'Partners and sponsors', 'شراكات سعودية', 'Saudi partnerships', true)
  on conflict (org_id, slug) do nothing;

  insert into public.news_articles (org_id, slug, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at) values
    (v_org, 'season-launch-2526', 'انطلاق الموسم', 'Season 25/26 kicks off', 'يستعد الفريق للموسم', 'First team kicks off 25/26', 'تفاصيل الخبر', 'Full story here', now() - interval '6 days'),
    (v_org, 'academy-open-day', 'يوم مفتوح', 'Academy open day', 'دعوة للأطفال', 'All kids invited', 'يوم رياضي مفتوح', 'Full sports day', now() - interval '3 days'),
    (v_org, 'community-csr', 'مبادرة مجتمعية', 'Neighbourhood sport drive', 'برنامج مع البلدية', 'Community programme', 'تم تجهيز الملاعب', 'Pitches refurbished', now() - interval '14 days'),
    (v_org, 'new-jersey-launch', 'القميص الرسمي', 'New jersey launched', 'القميص متوفر', 'Jersey now on sale', 'تصميم تراث النادي', 'Heritage design', now() - interval '20 days'),
    (v_org, 'draft-piece', 'خبر قادم', 'Upcoming announcement', null, null, 'مسودة', 'Draft', null)
  on conflict (org_id, slug) do nothing;

  if not exists (select 1 from public.broadcasts where org_id = v_org) then
    insert into public.broadcasts (org_id, channel, audience, subject, body_ar, body_en, status, recipient_count, sent_count, sent_at) values
      (v_org, 'email', 'members', 'تخفيضات', 'احصل على خصم', 'Get 15 percent off this week', 'draft', 17, 0, null),
      (v_org, 'sms', 'members', null, 'تذكير بتذاكر المباراة', null, 'queued', 17, 0, null),
      (v_org, 'both', 'all', 'مرحباً', 'انطلاق الموسم', 'Excited to kick off the season', 'sent', 27, 26, now() - interval '12 days');
  end if;

  insert into public.notification_prefs (org_id, member_id, email_opt_in, sms_opt_in, whatsapp_opt_in)
  select v_org, m.id, true,
    case when m.member_number in ('M-DEMO-00001','M-DEMO-00009') then true else false end,
    case when m.member_number = 'M-DEMO-00001' then true else false end
  from public.members m
  where m.org_id = v_org and m.member_number like 'M-DEMO-%'
  on conflict (member_id) do nothing;

  raise notice 'Pages + news + broadcasts + prefs seeded';
end;
$$;

-- ─────────────────────────────────────────────
-- CHUNK 10B — Message threads + messages
-- ─────────────────────────────────────────────

do $$
declare
  v_org uuid;
  v_member_ahmad uuid;
  v_member_omar uuid;
  v_thread_1 uuid;
  v_thread_2 uuid;
begin
  v_org          := (select id from public.organizations where slug = 'demo-club' limit 1);
  v_member_ahmad := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00001' limit 1);
  v_member_omar  := (select id from public.members where org_id = v_org and member_number = 'M-DEMO-00009' limit 1);

  if exists (select 1 from public.message_threads where org_id = v_org and subject = 'Help renewing my Gold plan') then
    raise notice 'Threads already seeded';
    return;
  end if;

  insert into public.message_threads (org_id, member_id, subject, status)
  values (v_org, v_member_ahmad, 'Help renewing my Gold plan', 'open')
  returning id into v_thread_1;

  insert into public.messages (org_id, thread_id, sender_role, body) values
    (v_org, v_thread_1, 'member', 'Hi, my Gold plan expires next week. How do I renew?'),
    (v_org, v_thread_1, 'staff',  'You can renew at the front desk or via Moyasar online.');

  insert into public.message_threads (org_id, member_id, subject, status)
  values (v_org, v_member_omar, 'Pool opening hours during Ramadan', 'resolved')
  returning id into v_thread_2;

  insert into public.messages (org_id, thread_id, sender_role, body) values
    (v_org, v_thread_2, 'member', 'What are the pool hours during Ramadan?'),
    (v_org, v_thread_2, 'staff',  'During Ramadan the pool is open 2pm to 10pm. Closed Fridays.');

  raise notice 'Threads seeded - Demo seed complete!';
end;
$$;
