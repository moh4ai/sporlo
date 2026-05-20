-- One-shot demo-data top-up: 6 more SPL opponents so the demo's
-- /fixtures listing and Match Center mini-tables feel populated.
-- Idempotent — the where-not-exists guard skips opponents already seeded.

do $$
declare
  v_org uuid;
begin
  v_org := (select id from public.organizations where slug = 'demo-club');
  if v_org is null then
    raise notice 'demo-club not found, skipping';
    return;
  end if;

  insert into public.fixtures (org_id, opponent_ar, opponent_en, kickoff_at, venue, sport_type, status, home_score, away_score)
  select * from (values
    (v_org, 'الأهلي',   'Al-Ahli',     (now() - interval '26 days')::timestamptz, 'King Fahd Stadium', 'football', 'completed',  3::int,  2::int),
    (v_org, 'الفتح',    'Al-Fateh',    (now() - interval '40 days')::timestamptz, 'King Fahd Stadium', 'football', 'completed',  1::int,  1::int),
    (v_org, 'الشباب',   'Al-Shabab',   (now() - interval '54 days')::timestamptz, 'King Fahd Stadium', 'football', 'completed',  2::int,  0::int),
    (v_org, 'الاتفاق',  'Al-Ettifaq',  (now() + interval '36 days')::timestamptz, 'King Fahd Stadium', 'football', 'scheduled',  null::int, null::int),
    (v_org, 'التعاون',  'Al-Taawoun',  (now() + interval '50 days')::timestamptz, 'King Fahd Stadium', 'football', 'scheduled',  null::int, null::int),
    (v_org, 'الرائد',   'Al-Raed',     (now() + interval '64 days')::timestamptz, 'King Fahd Stadium', 'football', 'scheduled',  null::int, null::int)
  ) as v(org_id, opponent_ar, opponent_en, kickoff_at, venue, sport_type, status, home_score, away_score)
  where not exists (
    select 1 from public.fixtures f
    where f.org_id = v.org_id and f.opponent_en = v.opponent_en
  );

  raise notice 'Demo fixtures top-up applied';
end;
$$;
