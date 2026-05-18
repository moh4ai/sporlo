-- Phase 5 — Integrations marketplace expansion (50 apps total)
--
-- Adds:
--   1. brand_color + simple_icon columns to integration_catalog so the UI
--      can render branded logos via cdn.simpleicons.org + tinted accents.
--   2. 4 new categories: sports, social, support, automation.
--   3. 35 new catalog entries (existing 15 backfilled via UPDATE).
--   4. integration_requests table — clubs vote-up "coming soon" providers.
--
-- Arabic name + description columns intentionally stay English-only in the
-- DB seed; the UI reads Arabic from packages/integrations/src/catalog.ts to
-- avoid the bidi-mangling that bites copy-paste through the Supabase SQL
-- editor.

-- ─────────────────────────────────────────────
-- 1. New columns + relaxed category constraint
-- ─────────────────────────────────────────────

alter table public.integration_catalog
  add column if not exists brand_color text,
  add column if not exists simple_icon text;

alter table public.integration_catalog drop constraint if exists integration_catalog_category_check;
alter table public.integration_catalog add constraint integration_catalog_category_check
  check (category in (
    'communications', 'productivity', 'marketing', 'analytics', 'payments',
    'sports', 'social', 'support', 'automation'
  ));

-- ─────────────────────────────────────────────
-- 2. Backfill the 15 existing entries with their brand metadata
-- ─────────────────────────────────────────────

update public.integration_catalog set brand_color = '611F69', simple_icon = 'slack' where slug = 'slack';
update public.integration_catalog set brand_color = '6264A7', simple_icon = 'microsoftteams' where slug = 'microsoft-teams';
update public.integration_catalog set brand_color = '25D366', simple_icon = 'whatsapp' where slug = 'whatsapp-railway';
update public.integration_catalog set brand_color = '1877F2', simple_icon = 'whatsapp' where slug = 'whatsapp-meta';
update public.integration_catalog set brand_color = '0F4C81', simple_icon = null where slug = 'unifonic';
update public.integration_catalog set brand_color = '4285F4', simple_icon = 'googlecalendar' where slug = 'google-calendar';
update public.integration_catalog set brand_color = '0078D4', simple_icon = 'microsoftoutlook' where slug = 'outlook';
update public.integration_catalog set brand_color = '000000', simple_icon = 'notion' where slug = 'notion';
update public.integration_catalog set brand_color = 'FFE01B', simple_icon = 'mailchimp' where slug = 'mailchimp';
update public.integration_catalog set brand_color = '000000', simple_icon = 'resend' where slug = 'resend';
update public.integration_catalog set brand_color = '1A82E2', simple_icon = 'sendgrid' where slug = 'sendgrid';
update public.integration_catalog set brand_color = 'E37400', simple_icon = 'googleanalytics' where slug = 'google-analytics';
update public.integration_catalog set brand_color = '7856FF', simple_icon = 'mixpanel' where slug = 'mixpanel';
update public.integration_catalog set brand_color = '0E7A52', simple_icon = null where slug = 'moyasar';
update public.integration_catalog set brand_color = '2A89FF', simple_icon = null where slug = 'tap';

-- ─────────────────────────────────────────────
-- 3. Seed the 35 new entries
-- ─────────────────────────────────────────────
-- Kinds use the new IntegrationKind values: analyze_video, manage_team,
-- social_post, customer_support, automate.

insert into public.integration_catalog (
  slug, name_en, category, short_description_en, kinds, availability, brand_color, simple_icon
) values
  -- Communications additions
  ('discord', 'Discord', 'communications',
   'Fan channels and academy community servers on Discord.',
   ARRAY['send_message'], 'coming_soon', '5865F2', 'discord'),
  ('telegram', 'Telegram', 'communications',
   'Broadcast notifications to public Telegram channels for members.',
   ARRAY['send_message'], 'coming_soon', '26A5E4', 'telegram'),
  ('twilio', 'Twilio', 'communications',
   'International SMS + voice calls for member notifications.',
   ARRAY['send_message'], 'coming_soon', 'F22F46', 'twilio'),

  -- Productivity additions
  ('google-drive', 'Google Drive', 'productivity',
   'Archive finance + governance documents to Drive.',
   ARRAY['sync_contacts'], 'coming_soon', '1FA463', 'googledrive'),
  ('onedrive', 'Microsoft OneDrive', 'productivity',
   'Drive alternative for Microsoft 365 setups.',
   ARRAY['sync_contacts'], 'coming_soon', '0364B8', 'microsoftonedrive'),
  ('dropbox', 'Dropbox', 'productivity',
   'Cloud storage alternative + admin attachment archive.',
   ARRAY['sync_contacts'], 'coming_soon', '0061FF', 'dropbox'),
  ('asana', 'Asana', 'productivity',
   'Track club operational projects in Asana.',
   ARRAY['sync_contacts'], 'coming_soon', 'F06A6A', 'asana'),
  ('trello', 'Trello', 'productivity',
   'Kanban boards for governance + CSR initiatives.',
   ARRAY['sync_contacts'], 'coming_soon', '0079BF', 'trello'),
  ('airtable', 'Airtable', 'productivity',
   'Collaborative databases for managing events + rosters.',
   ARRAY['sync_contacts'], 'coming_soon', '18BFFF', 'airtable'),
  ('zoom', 'Zoom', 'productivity',
   'Schedule board + staff meetings directly from Sporlo.',
   ARRAY['sync_calendar'], 'coming_soon', '0B5CFF', 'zoom'),

  -- Marketing additions
  ('brevo', 'Brevo', 'marketing',
   'Email + SMS marketing from a European-based provider.',
   ARRAY['send_email', 'send_message'], 'coming_soon', '0B996E', 'brevo'),
  ('hubspot', 'HubSpot', 'marketing',
   'Advanced marketing automation + sponsor CRM.',
   ARRAY['sync_contacts', 'send_email'], 'coming_soon', 'FF7A59', 'hubspot'),
  ('activecampaign', 'ActiveCampaign', 'marketing',
   'Smart email campaigns with automation logic.',
   ARRAY['send_email', 'sync_contacts'], 'coming_soon', '356AE6', 'activecampaign'),
  ('klaviyo', 'Klaviyo', 'marketing',
   'Smart marketing tuned for the club''s online store.',
   ARRAY['send_email', 'sync_contacts'], 'coming_soon', '232227', 'klaviyo'),

  -- Analytics additions
  ('amplitude', 'Amplitude', 'analytics',
   'Fan behaviour analytics across public surfaces.',
   ARRAY['track_event'], 'coming_soon', '1E61F0', 'amplitude'),
  ('hotjar', 'Hotjar', 'analytics',
   'Heatmaps + session recordings for fan UX research.',
   ARRAY['track_event'], 'coming_soon', 'FD3A5C', 'hotjar'),
  ('plausible', 'Plausible Analytics', 'analytics',
   'Lightweight privacy-friendly analytics, cookie-free.',
   ARRAY['track_event'], 'coming_soon', '5850EC', 'plausibleanalytics'),

  -- Payments additions
  ('paytabs', 'PayTabs', 'payments',
   'Saudi-licensed payment gateway for top-tier clubs.',
   ARRAY['receive_payment'], 'coming_soon', 'EA632E', null),
  ('stc-pay', 'STC Pay', 'payments',
   'STC Pay wallet for in-Kingdom store checkouts.',
   ARRAY['receive_payment'], 'coming_soon', '4F2683', null),
  ('stripe', 'Stripe', 'payments',
   'Global payment gateway for international sponsorship.',
   ARRAY['receive_payment'], 'coming_soon', '635BFF', 'stripe'),
  ('apple-pay', 'Apple Pay', 'payments',
   'Default checkout option for Apple device owners.',
   ARRAY['receive_payment'], 'coming_soon', '000000', 'applepay'),

  -- Sports
  ('hudl', 'Hudl', 'sports',
   'Pro-level video analysis for senior + academy teams.',
   ARRAY['analyze_video'], 'coming_soon', 'FF6B00', 'hudl'),
  ('veo', 'Veo', 'sports',
   'AI camera that auto-records matches without an operator.',
   ARRAY['analyze_video'], 'coming_soon', '1E2333', null),
  ('wyscout', 'Wyscout', 'sports',
   'World''s largest player scouting + analysis platform.',
   ARRAY['analyze_video'], 'coming_soon', '002E5D', null),
  ('spond', 'Spond', 'sports',
   'Parent comms + attendance tracking for academies.',
   ARRAY['manage_team'], 'coming_soon', 'FF6E40', null),
  ('teamsnap', 'TeamSnap', 'sports',
   'Team management with practice + game scheduling.',
   ARRAY['manage_team'], 'coming_soon', 'F46A1F', null),

  -- Social
  ('meta-business', 'Meta Business (FB + IG)', 'social',
   'Auto-publish to Facebook + Instagram from Sporlo.',
   ARRAY['social_post'], 'coming_soon', '0467DF', 'meta'),
  ('x-twitter', 'X (formerly Twitter)', 'social',
   'Direct posting for news + live scores on X.',
   ARRAY['social_post'], 'coming_soon', '000000', 'x'),
  ('tiktok', 'TikTok', 'social',
   'Short-form content: behind-the-scenes + match goals.',
   ARRAY['social_post'], 'coming_soon', '010101', 'tiktok'),
  ('youtube', 'YouTube', 'social',
   'Live match streams + long-form content.',
   ARRAY['social_post'], 'coming_soon', 'FF0000', 'youtube'),
  ('linkedin', 'LinkedIn', 'social',
   'Sponsorship announcements + club executive hiring.',
   ARRAY['social_post'], 'coming_soon', '0A66C2', 'linkedin'),
  ('buffer', 'Buffer', 'social',
   'Schedule social posts from a single dashboard.',
   ARRAY['social_post'], 'coming_soon', '168EEA', 'buffer'),

  -- Support
  ('zendesk', 'Zendesk', 'support',
   'Pro-grade ticketing system for member inquiries.',
   ARRAY['customer_support'], 'coming_soon', '03363D', 'zendesk'),
  ('intercom', 'Intercom', 'support',
   'Live chat for the public site, with AI assist.',
   ARRAY['customer_support'], 'coming_soon', '1F8DED', 'intercom'),
  ('freshdesk', 'Freshdesk', 'support',
   'Simpler, lower-cost alternative to Zendesk.',
   ARRAY['customer_support'], 'coming_soon', '169D5E', 'freshworks'),

  -- Automation
  ('zapier', 'Zapier', 'automation',
   'Connect Sporlo to 6000+ apps with no code.',
   ARRAY['automate'], 'coming_soon', 'FF4F00', 'zapier'),
  ('make', 'Make (Integromat)', 'automation',
   'Visual automation for complex workflows.',
   ARRAY['automate'], 'coming_soon', '6D00CC', 'make')
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────
-- 4. integration_requests — clubs vote on what to ship next
-- ─────────────────────────────────────────────

create table public.integration_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  integration_slug text not null references public.integration_catalog(slug) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'shipped', 'declined')),
  created_at timestamptz not null default now()
);
create index integration_requests_org_idx on public.integration_requests(org_id);
create index integration_requests_slug_idx on public.integration_requests(integration_slug);

alter table public.integration_requests enable row level security;

create policy integration_requests_tenant on public.integration_requests
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy integration_requests_super_admin on public.integration_requests
  for all using (public.is_super_admin())
  with check (public.is_super_admin());
