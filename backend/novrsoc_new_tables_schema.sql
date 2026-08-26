-- NovrSOC — new-tables schema (Super Admin / SOC Analyst multi-tenant model)
-- Generated: 2026-08-24
--
-- IMPORTANT — this is NOT a backup/export of the live schema. It was drafted from a task spec
-- that assumed a full multi-tenant data model (organisations, users, assets, incidents, alerts,
-- shift_handovers, ...) already exists in Supabase. It doesn't — the real live schema is
-- backend/novrsoc_supabase_schema.sql (8 tables: ip_enrichment_cache, nigerian_asns,
-- nigeria_state_threats, ioc_enrichments, host_packages, vulnerability_matches, url_scans,
-- website_scans), and nothing in this codebase currently reads or writes any of the tables
-- below — every admin/SOC-analyst feature shipped so far (Team, Organisations, Billing, Shift
-- Handover, alert assignment, incident notes) runs on mock data or this backend's own
-- in-memory demo stores, not a database. Decide whether you actually want these 13 tables
-- provisioned ahead of any code using them before running this.
--
-- What was fixed vs. the original draft, and why (all three problems below were confirmed by
-- reading the real schema file and would have caused this script to partially or fully fail
-- as originally written):
--   1. Dropped the redeclarations of the 8 tables that already exist for real, under the same
--      names but with DIFFERENT columns (e.g. this draft's ip_enrichment_cache had `ip_address`
--      /`country`/`asn`; the real table has `ip`/`country_code`/`asn` + a dozen other Nigeria-
--      enrichment-specific columns). `CREATE TABLE IF NOT EXISTS` against an existing table is
--      a silent no-op — none of the "new" columns would actually be added, but you'd have no
--      way to tell from the output that nothing happened.
--   2. The original's `nigerian_asns` seed INSERT used columns (`isp_name`, `state`) that don't
--      exist on the real table (`isp`, `primary_state`) — this would hard-error and, if Supabase
--      ran the whole script as one transaction, roll back everything before it too. If you want
--      to seed the real table with these ISPs, see the corrected INSERT at the bottom instead.
--   3. `CREATE POLICY IF NOT EXISTS ...` is not valid PostgreSQL — CREATE POLICY has no
--      IF NOT EXISTS clause, full stop. The original's DO-block also looped over every table in
--      `public`, including the 8 real ones — which already have a same-named "service_role_all"
--      policy from backend/src/db/rls-policies.sql, so even a syntactically valid version of
--      that loop would then fail with "policy already exists" on all 8. Replaced with explicit
--      per-table RLS statements scoped to only the tables this file actually creates, using
--      DROP POLICY IF EXISTS + CREATE POLICY (the standard idempotent pattern), matching the
--      style already used in rls-policies.sql rather than a dynamic loop over the whole schema.
--
-- Run in Supabase → SQL Editor → New query, only once you've decided you want this model
-- provisioned. Re-running is safe (every CREATE is idempotent).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ORGANISATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organisations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  industry      TEXT,
  plan          TEXT DEFAULT 'starter' CHECK (plan IN ('starter','professional','enterprise')),
  status        TEXT DEFAULT 'trial' CHECK (status IN ('active','trial','suspended','cancelled')),
  monthly_value NUMERIC(10,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS / ANALYSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID REFERENCES organisations(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  role       TEXT DEFAULT 'analyst' CHECK (role IN ('super_admin','analyst','viewer','client')),
  status     TEXT DEFAULT 'active' CHECK (status IN ('active','invited','suspended')),
  last_seen  TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSETS (Wazuh Agents)
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID REFERENCES organisations(id) ON DELETE CASCADE,
  wazuh_agent_id TEXT,
  name           TEXT NOT NULL,
  ip_address     TEXT,
  os             TEXT,
  agent_version  TEXT,
  status         TEXT DEFAULT 'active',
  last_keepalive TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MONITORED DOMAINS
-- ============================================================
CREATE TABLE IF NOT EXISTS monitored_domains (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID REFERENCES organisations(id) ON DELETE CASCADE,
  domain       TEXT NOT NULL,
  registrar    TEXT,
  expires_at   DATE,
  ssl_grade    TEXT,
  spf          BOOLEAN DEFAULT FALSE,
  dmarc        BOOLEAN DEFAULT FALSE,
  dkim         BOOLEAN DEFAULT FALSE,
  last_scanned TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SOCIAL ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS social_accounts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID REFERENCES organisations(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL CHECK (platform IN ('twitter','facebook','instagram','linkedin')),
  handle       TEXT NOT NULL,
  display_name TEXT,
  url          TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXECUTIVES
-- ============================================================
CREATE TABLE IF NOT EXISTS executives (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT,
  role         TEXT,
  department   TEXT,
  breach_count INTEGER DEFAULT 0,
  scan_status  TEXT DEFAULT 'pending',
  last_scanned TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executive_socials (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  executive_id UUID REFERENCES executives(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,
  handle       TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INCIDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID REFERENCES organisations(id) ON DELETE CASCADE,
  incident_number TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  severity        TEXT CHECK (severity IN ('critical','high','medium','low')),
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','contained','resolved','escalated')),
  affected_host   TEXT,
  source_ip       TEXT,
  mitre_tactic    TEXT,
  mitre_technique TEXT,
  assigned_to     UUID REFERENCES users(id),
  containment     JSONB DEFAULT '[]',
  timeline        JSONB DEFAULT '[]',
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INCIDENT NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  analyst_id  UUID REFERENCES users(id),
  note_type   TEXT DEFAULT 'update' CHECK (note_type IN ('update','evidence','decision','escalation')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID REFERENCES organisations(id) ON DELETE CASCADE,
  wazuh_alert_id   TEXT,
  rule_id          TEXT,
  rule_level       INTEGER,
  rule_description TEXT,
  severity         TEXT,
  status           TEXT DEFAULT 'open',
  source_ip        TEXT,
  agent_name       TEXT,
  mitre_tactic     TEXT,
  mitre_technique  TEXT,
  assigned_to      UUID REFERENCES users(id),
  raw_log          TEXT,
  detected_at      TIMESTAMPTZ,
  acknowledged_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BACKUP JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS backup_jobs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  target         TEXT NOT NULL,
  schedule       TEXT,
  storage_path   TEXT,
  retention_days INTEGER DEFAULT 7,
  last_run       TIMESTAMPTZ,
  last_status    TEXT DEFAULT 'pending',
  last_size_gb   NUMERIC(10,3),
  hash_expected  TEXT,
  hash_actual    TEXT,
  hash_verified  BOOLEAN,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SLA ENDPOINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS sla_endpoints (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID REFERENCES organisations(id) ON DELETE CASCADE,
  client_name    TEXT NOT NULL,
  endpoint_url   TEXT NOT NULL,
  sla_target_pct NUMERIC(5,2) DEFAULT 99.9,
  monthly_fee    NUMERIC(10,2) DEFAULT 0,
  uptimerobot_id TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHIFT HANDOVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_handovers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id             UUID REFERENCES organisations(id) ON DELETE CASCADE,
  analyst_off_id     UUID REFERENCES users(id),
  analyst_on_id      UUID REFERENCES users(id),
  shift_start        TIMESTAMPTZ NOT NULL,
  shift_end          TIMESTAMPTZ NOT NULL,
  alerts_received    INTEGER DEFAULT 0,
  alerts_resolved    INTEGER DEFAULT 0,
  alerts_pending     INTEGER DEFAULT 0,
  critical_incidents JSONB DEFAULT '[]',
  ongoing_incidents  JSONB DEFAULT '[]',
  watch_items        TEXT,
  notes              TEXT,
  submitted_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_assets_org_id ON assets(org_id);
CREATE INDEX IF NOT EXISTS idx_alerts_org_id ON alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_incidents_org_id ON incidents(org_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incident_notes_incident_id ON incident_notes(incident_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_org_id ON shift_handovers(org_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Scoped to only the tables this file creates. The 8 real tables already have RLS + a
-- "service_role_all" policy from backend/src/db/rls-policies.sql — not touched here.
-- ============================================================
ALTER TABLE organisations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_domains  ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE executives         ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_socials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_jobs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_endpoints      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handovers    ENABLE ROW LEVEL SECURITY;

-- Idempotent service-role-only policy per table (DROP + CREATE, since CREATE POLICY has no
-- IF NOT EXISTS) — same intent as rls-policies.sql: only this backend's service-role key can
-- touch these tables; anon/authenticated get no policy at all.
DROP POLICY IF EXISTS "service_role_all" ON public.organisations;
CREATE POLICY "service_role_all" ON public.organisations FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.users;
CREATE POLICY "service_role_all" ON public.users FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.assets;
CREATE POLICY "service_role_all" ON public.assets FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.monitored_domains;
CREATE POLICY "service_role_all" ON public.monitored_domains FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.social_accounts;
CREATE POLICY "service_role_all" ON public.social_accounts FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.executives;
CREATE POLICY "service_role_all" ON public.executives FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.executive_socials;
CREATE POLICY "service_role_all" ON public.executive_socials FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.incidents;
CREATE POLICY "service_role_all" ON public.incidents FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.incident_notes;
CREATE POLICY "service_role_all" ON public.incident_notes FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.alerts;
CREATE POLICY "service_role_all" ON public.alerts FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.backup_jobs;
CREATE POLICY "service_role_all" ON public.backup_jobs FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.sla_endpoints;
CREATE POLICY "service_role_all" ON public.sla_endpoints FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.shift_handovers;
CREATE POLICY "service_role_all" ON public.shift_handovers FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- OPTIONAL — seed Nigerian ISP ASNs into the REAL nigerian_asns table (not redeclared above;
-- see backend/novrsoc_supabase_schema.sql for its actual columns: asn/isp/organization/
-- primary_state/network_type/is_active). Corrected to those real column names — the original
-- draft used isp_name/state, which don't exist on this table and would error.
--
-- ASN assignments below were WRONG in the original draft and are corrected here — verified
-- live against RIPE Stat (as-overview's `holder` field) while building the Nigeria map's
-- 3-source geolocation upgrade: the draft had AS37148 as Airtel (it's actually Glo), AS37076
-- as Glo (it's actually 9mobile/EMTS), AS37340 as 9mobile (it's actually Spectranet), AS36873
-- as "ipNX Nigeria" (it's actually Airtel), and AS328601 as Spectranet (it's an unrelated
-- Congo-based holding company, not a Nigerian ISP at all). Running the original draft would
-- have silently seeded backwards ISP attribution into every feature that reads this table
-- (enrichNigerian() in services/geoEnrichment.ts, and the Nigeria map's state attribution).
-- MainOne's AS327983 is left out below — unverified, and not worth guessing at given the
-- error rate found in the rest of this list.
-- ============================================================
-- INSERT INTO nigerian_asns (asn, isp, primary_state) VALUES
--   ('AS29465', 'MTN Nigeria',      'Lagos'),
--   ('AS36873', 'Airtel Nigeria',   'Lagos'),
--   ('AS37148', 'Globacom (Glo)',   'Lagos'),
--   ('AS37076', '9mobile (EMTS)',   'Lagos'),
--   ('AS37282', 'MainOne',          'Lagos'),
--   ('AS37340', 'Spectranet',       'Lagos')
-- ON CONFLICT (asn) DO NOTHING;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
