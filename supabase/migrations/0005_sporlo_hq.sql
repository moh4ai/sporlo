-- Seed: the Sporlo HQ organization. Every super_admin user belongs to it
-- (the schema requires org_id NOT NULL even for cross-tenant roles).
--
-- Idempotent: re-running this is a no-op thanks to ON CONFLICT.

insert into public.organizations (slug, name_ar, name_en, subscription_tier)
values ('sporlo-hq', 'سبورلو الإدارة', 'Sporlo HQ', 'internal')
on conflict (slug) do nothing;
