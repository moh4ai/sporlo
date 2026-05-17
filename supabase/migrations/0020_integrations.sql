-- Phase 1.4 — Integrations
-- Two tables:
--   1. integration_catalog — global reference data; one row per supported
--      provider. Readable by every authenticated user (tenants need it to
--      render the catalog grid). Writes are super_admin only.
--   2. org_integrations — per-tenant install record. config_jsonb stores
--      provider-specific setup data (API keys, channel IDs, etc).
--
-- Phase 1.4 ships the schema + an English-only catalog seed. The UI reads
-- bilingual labels from `@sporlo/integrations/catalog` (the TypeScript
-- source of truth); name_ar / short_description_ar on the DB row are kept
-- nullable so they can be backfilled later through a path that doesn't
-- mangle bidi text on copy-paste.

-- ─────────────────────────────────────────────
-- integration_catalog (global)
-- ─────────────────────────────────────────────

create table public.integration_catalog (
  slug text primary key,
  name_ar text,
  name_en text not null,
  category text not null check (category in (
    'communications', 'productivity', 'marketing', 'analytics', 'payments'
  )),
  logo_path text,
  short_description_ar text,
  short_description_en text,
  kinds text[] not null default '{}',
  availability text not null default 'coming_soon'
    check (availability in ('available', 'coming_soon'))
);

alter table public.integration_catalog enable row level security;

-- Global read for any signed-in user. The catalog is reference data; no
-- tenant context is needed.
create policy integration_catalog_authenticated_read on public.integration_catalog
  for select using (auth.role() = 'authenticated');
create policy integration_catalog_super_admin on public.integration_catalog
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- org_integrations (per-tenant)
-- ─────────────────────────────────────────────

create table public.org_integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  integration_slug text not null references public.integration_catalog(slug),
  config_jsonb jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  installed_at timestamptz not null default now(),
  installed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (org_id, integration_slug)
);
create index org_integrations_org_idx on public.org_integrations(org_id);

alter table public.org_integrations enable row level security;

create policy org_integrations_tenant on public.org_integrations
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
create policy org_integrations_super_admin on public.org_integrations
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- ─────────────────────────────────────────────
-- Seed catalog (English-only — Arabic lives in packages/integrations/src/catalog.ts)
-- ─────────────────────────────────────────────

insert into public.integration_catalog (
  slug, name_en, category, logo_path, short_description_en, kinds, availability
) values
  ('slack', 'Slack', 'communications', '/integrations/slack.svg',
   'Pipe Sporlo notifications into a Slack channel for the staff team.',
   ARRAY['send_message'], 'coming_soon'),
  ('microsoft-teams', 'Microsoft Teams', 'communications', '/integrations/microsoft-teams.svg',
   'Surface Sporlo alerts inside a Microsoft Teams channel.',
   ARRAY['send_message'], 'coming_soon'),
  ('whatsapp-railway', 'WhatsApp (Railway)', 'communications', '/integrations/whatsapp.svg',
   'Deliver OTPs and member alerts via a self-hosted WhatsApp client on Railway.',
   ARRAY['send_message'], 'coming_soon'),
  ('whatsapp-meta', 'WhatsApp Business (Meta Cloud)', 'communications', '/integrations/whatsapp.svg',
   'Meta''s official Cloud API for clubs that need higher throughput.',
   ARRAY['send_message'], 'coming_soon'),
  ('unifonic', 'Unifonic', 'communications', '/integrations/unifonic.svg',
   'Saudi-licensed SMS provider for member notifications.',
   ARRAY['send_message'], 'coming_soon'),
  ('google-calendar', 'Google Calendar', 'productivity', '/integrations/google-calendar.svg',
   'Sync fixtures and academy sessions into your Google Calendar.',
   ARRAY['sync_calendar'], 'coming_soon'),
  ('outlook', 'Microsoft Outlook', 'productivity', '/integrations/outlook.svg',
   'Same calendar sync for Microsoft 365 shops.',
   ARRAY['sync_calendar'], 'coming_soon'),
  ('notion', 'Notion', 'productivity', '/integrations/notion.svg',
   'Push governance reports and meeting minutes into a Notion workspace.',
   ARRAY['sync_contacts'], 'coming_soon'),
  ('mailchimp', 'Mailchimp', 'marketing', '/integrations/mailchimp.svg',
   'Sync members as a Mailchimp audience and launch campaigns from Sporlo.',
   ARRAY['sync_contacts', 'send_email'], 'coming_soon'),
  ('resend', 'Resend', 'marketing', '/integrations/resend.svg',
   'Transactional email for portal links and teammate invites.',
   ARRAY['send_email'], 'available'),
  ('sendgrid', 'SendGrid', 'marketing', '/integrations/sendgrid.svg',
   'Enterprise-style transactional email alternative.',
   ARRAY['send_email'], 'coming_soon'),
  ('google-analytics', 'Google Analytics', 'analytics', '/integrations/google-analytics.svg',
   'Track public club site and member portal page views.',
   ARRAY['track_event'], 'coming_soon'),
  ('mixpanel', 'Mixpanel', 'analytics', '/integrations/mixpanel.svg',
   'Pipe key Sporlo events (subscribe, ticket buy) into Mixpanel.',
   ARRAY['track_event'], 'coming_soon'),
  ('moyasar', 'Moyasar', 'payments', '/integrations/moyasar.svg',
   'Primary payment gateway for memberships, tickets, and store orders.',
   ARRAY['receive_payment'], 'available'),
  ('tap', 'Tap Payments', 'payments', '/integrations/tap.svg',
   'Alternate gateway for clubs with regional billing requirements.',
   ARRAY['receive_payment'], 'available')
on conflict (slug) do nothing;
