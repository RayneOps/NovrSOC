-- Customer Onboarding + Multitenancy — run this once in the Supabase SQL Editor.
--
-- Live-checked against the actual database on 2026-09-05, twice (once before writing any code,
-- once after implementing it and hitting a real error): `organisations` already existed with
-- most of what the new onboarding code needs (id, name, slug, plan, industry, country,
-- is_active, created_at, updated_at, status, address, logo_url, wazuh_group, contact_name,
-- contact_email, contact_phone, ciso_name, ciso_email, setup_complete) — only `domain` was
-- actually missing, confirmed live via a real POST /api/organisations failing with
-- PGRST204 "Could not find the 'domain' column of 'organisations' in the schema cache".
-- `platform_users` exists too, but is still empty — no Rayne seed row went in yet.
--
-- This script only does what's still needed. It does not touch (or need to touch) any of the
-- other columns — they're already there with real data (one row, the Cybernovr tenant, id
-- 00000000-0000-0000-0000-000000000001).

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS domain TEXT;

-- `slug` uniqueness wasn't independently re-verified — idempotent either way.
CREATE UNIQUE INDEX IF NOT EXISTS organisations_slug_key ON public.organisations (slug);

-- Seed Rayne as super_admin against the org that already exists (its real id, not a new one).
-- org_id here is organisations.id (this table's UUID primary key) — see
-- routes/organisations.ts's header comment for why the JWT's own org_id claim uses the SLUG
-- instead once this lookup succeeds; that's a backend-code distinction, not a schema one.
INSERT INTO public.platform_users (org_id, email, name, role, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'rayne@cybernovr.com', 'Rayne', 'super_admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- RLS — safe to run whether or not it's already set up (DROP POLICY IF EXISTS makes this
-- re-runnable; Postgres has no "CREATE POLICY IF NOT EXISTS").
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_users_service_role" ON public.platform_users;
CREATE POLICY "platform_users_service_role" ON public.platform_users
  FOR ALL USING (auth.role() = 'service_role');
