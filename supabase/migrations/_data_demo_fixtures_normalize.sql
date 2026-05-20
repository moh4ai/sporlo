-- One-shot demo cleanup: normalize opponent_en across all fixtures so the
-- crest seeder can match every row.
--
-- The demo accumulated duplicate fixtures with two naming styles —
-- "Al-Ittihad" (hyphenated, has crest) and "Al Ittihad" (space-separated,
-- no crest). This rewrites the space form to the hyphen form for the
-- whole "Al X" family. Existing crest paths are preserved; the seeder
-- fills the now-matching rows on its next run.

update public.fixtures f
   set opponent_en = regexp_replace(f.opponent_en, '^Al ', 'Al-')
 where f.org_id = (select id from public.organizations where slug = 'demo-club')
   and f.opponent_en like 'Al %';

-- Same idea for Arabic — only one demo-data variant present so a single
-- replace is enough.
update public.fixtures f
   set opponent_ar = trim(f.opponent_ar)
 where f.org_id = (select id from public.organizations where slug = 'demo-club');
