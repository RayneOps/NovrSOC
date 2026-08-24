-- NovrSOC — Row Level Security policies
--
-- Scoped to the 8 tables that actually exist in this schema (see
-- ../../novrsoc_supabase_schema.sql). An earlier draft of this file assumed a multi-tenant
-- schema (organisations, assets, alerts, executives, monitored_domains, ...) — none of those
-- tables exist here, and this backend has no org_id / per-user auth model for this data yet
-- (every route that touches Supabase does so with the service-role key; the "orgs" that do
-- exist — routes/portal.ts's numeric orgId — belong to a *separate* external backend at
-- APP_API_BASE_URL, not this database). Writing org_isolation policies against tables/columns
-- that don't exist wouldn't just be inert — enabling RLS in the same pass with no matching
-- policy for a table locks every client out of it, including this backend's own service-role
-- queries to any table that policy doesn't cover.
--
-- Policy here is the safe MVP for the current architecture: enable RLS on each real table,
-- add a single service-role bypass policy so this backend (which always connects with the
-- service-role key) keeps working exactly as before, and leave anon/authenticated with no
-- policy at all — i.e. no direct access via Supabase's REST API/JS client using the anon key,
-- which is the actual attack surface RLS defends against here. Revisit with real org_isolation
-- policies once a per-user/per-org auth model exists for this data.
--
-- Run this in the Supabase SQL Editor. Not run automatically by this codebase.

alter table public.ip_enrichment_cache enable row level security;
create policy "service_role_all" on public.ip_enrichment_cache
  for all using (auth.role() = 'service_role');

alter table public.nigerian_asns enable row level security;
create policy "service_role_all" on public.nigerian_asns
  for all using (auth.role() = 'service_role');

alter table public.nigeria_state_threats enable row level security;
create policy "service_role_all" on public.nigeria_state_threats
  for all using (auth.role() = 'service_role');

alter table public.ioc_enrichments enable row level security;
create policy "service_role_all" on public.ioc_enrichments
  for all using (auth.role() = 'service_role');

alter table public.host_packages enable row level security;
create policy "service_role_all" on public.host_packages
  for all using (auth.role() = 'service_role');

alter table public.vulnerability_matches enable row level security;
create policy "service_role_all" on public.vulnerability_matches
  for all using (auth.role() = 'service_role');

alter table public.url_scans enable row level security;
create policy "service_role_all" on public.url_scans
  for all using (auth.role() = 'service_role');

alter table public.website_scans enable row level security;
create policy "service_role_all" on public.website_scans
  for all using (auth.role() = 'service_role');

-- Explicit belt-and-suspenders revoke — RLS with no anon/authenticated policy already denies
-- them, but this removes the underlying GRANT too so a future permissive policy add doesn't
-- silently reopen access without a deliberate GRANT alongside it.
revoke all on public.ip_enrichment_cache from anon, authenticated;
revoke all on public.nigerian_asns from anon, authenticated;
revoke all on public.nigeria_state_threats from anon, authenticated;
revoke all on public.ioc_enrichments from anon, authenticated;
revoke all on public.host_packages from anon, authenticated;
revoke all on public.vulnerability_matches from anon, authenticated;
revoke all on public.url_scans from anon, authenticated;
revoke all on public.website_scans from anon, authenticated;
