-- NovrSOC — Supabase schema
-- Covers: IP Geo Enrichment (services/geoEnrichment.ts, routes/geo.ts) and
-- CTI Platform + Threat Advisory (routes/cti.ts, routes/threat.ts).
--
-- Run this once in Supabase → SQL Editor → New query → Run. Re-running is safe — every
-- statement is idempotent (`if not exists`). If you already ran an earlier version of this
-- file, just run the whole thing again; the new tables at the bottom will be added.
-- Only the backend's service_role key ever touches these tables (see backend/.env
-- SUPABASE_SERVICE_KEY) — RLS is enabled with no policies so the anon/authenticated
-- keys can't read or write anything even if one leaks into a client bundle by mistake.

-- ── ip_enrichment_cache ─────────────────────────────────────────────
-- 24h cache of enrichIP() results, keyed by IP. Mirrors the EnrichedIP interface exactly.
create table if not exists ip_enrichment_cache (
  ip              text primary key,
  country_code    text,
  country_name    text,
  region          text,
  city            text,
  latitude        double precision,
  longitude       double precision,
  timezone        text,
  asn             text,
  asn_name        text,
  isp             text,
  org             text,
  prefix          text,
  is_vpn          boolean default false,
  is_proxy        boolean default false,
  is_tor          boolean default false,
  is_hosting      boolean default false,
  threat_score    integer default 0,
  is_african      boolean default false,
  is_nigerian     boolean default false,
  nigerian_isp    text,
  nigerian_state  text,
  network_type    text,
  afrinic_org     text,
  source          text,
  confidence      integer default 0,
  cached_at       timestamptz not null default now(),
  expires_at      timestamptz not null
);

create index if not exists ip_enrichment_cache_expires_at_idx on ip_enrichment_cache (expires_at);

alter table ip_enrichment_cache enable row level security;

-- ── nigerian_asns ───────────────────────────────────────────────────
-- Curated ASN → Nigerian-ISP mapping used by enrichNigerian() to enrich NG-geolocated IPs
-- beyond what IPregistry/RIPE know (local ISP name, primary state of operation, network type).
create table if not exists nigerian_asns (
  asn            text primary key,          -- e.g. 'AS29465'
  isp            text not null,             -- e.g. 'MTN Nigeria'
  organization   text,
  primary_state  text,                      -- e.g. 'Lagos'
  network_type   text,                      -- e.g. 'Mobile', 'Fixed Broadband', 'Enterprise'
  is_active      boolean not null default true
);

alter table nigerian_asns enable row level security;

-- ── nigeria_state_threats ───────────────────────────────────────────
-- Pre-computed nightly (not live) per-state threat summary, powering the Nigeria National
-- Threat Landscape map on the admin dashboard (GET /api/geo/nigeria/states).
--
-- `state` must use the same short keys as frontend/src/lib/mock/nigeria-threat-data.ts so the
-- frontend can merge live rows over its bundled fallback data by key, e.g.:
-- Lagos, FCT, Kano, Rivers, Kaduna, Kebbi, Niger, Kwara, Ogun, Oyo, Delta, Edo, AkwaIbom,
-- Enugu, Anambra, Plateau, Ondo, Imo, CrossRiver, Abia, Osun, Bauchi, Benue, Nasarawa,
-- Katsina, Sokoto, Bayelsa, Ekiti, Taraba, Adamawa, Gombe, Kogi, Jigawa, Zamfara, Yobe,
-- Borno, Ebonyi
create table if not exists nigeria_state_threats (
  state             text primary key,
  level             text not null default 'Low',       -- Critical | High | Medium | Low
  primary_threat    text not null default 'Malware',    -- Ransomware | Phishing | Botnet | Malware | DDoS | CredentialTheft | APT
  attacks           integer not null default 0,
  malware           text,
  target            text,
  source_countries  text[] default '{}',
  iocs              integer not null default 0,
  mitre             text[] default '{}',
  color             text,                                -- hex, e.g. '#EF4444'
  threat_score      numeric not null default 0,          -- drives ORDER BY in the route
  updated_at        timestamptz not null default now()
);

alter table nigeria_state_threats enable row level security;

-- ── ioc_enrichments ───────────────────────────────────────────────────
-- Cache/log of every POST /api/cti/lookup result (services/iocEnrichment.ts), keyed by the IOC
-- value itself. Also doubles as the "Live IOC Feed" and CTI stats source — every manual lookup
-- an analyst runs gets upserted here, most-recent first.
create table if not exists ioc_enrichments (
  ioc_value             text primary key,
  ioc_type              text not null,               -- ip | domain | hash | url
  risk_score            integer not null default 0,  -- 0-100, mirrors EnrichedIOC.risk_score
  otx_pulse_count       integer default 0,
  abuseipdb_confidence  integer default 0,
  country_code          text,
  isp                   text,
  is_tor                boolean default false,
  tags                  text[] default '{}',
  source                text,                         -- e.g. 'manual_lookup'
  last_seen             timestamptz not null default now()
);

create index if not exists ioc_enrichments_last_seen_idx on ioc_enrichments (last_seen desc);
create index if not exists ioc_enrichments_ioc_type_idx on ioc_enrichments (ioc_type);

alter table ioc_enrichments enable row level security;

-- ── host_packages / vulnerability_matches ──────────────────────────────
-- Asset-level vulnerability mapping for the Threat Advisory "Asset Vulnerabilities" tab
-- (GET /api/threat/advisory/assets). Nothing populates these yet — they exist so the route
-- doesn't error — the intended source is a future Wazuh syscollector software-inventory sync
-- (host_packages) cross-referenced against NVD/KEV (vulnerability_matches). Safe to leave empty.
create table if not exists host_packages (
  id            bigint generated always as identity primary key,
  agent_id      text not null,
  agent_name    text,
  package_name  text not null,
  version       text,
  os            text
);

create index if not exists host_packages_agent_id_idx on host_packages (agent_id);

alter table host_packages enable row level security;

create table if not exists vulnerability_matches (
  id                bigint generated always as identity primary key,
  cve_id            text not null,
  host_package_id   bigint references host_packages (id) on delete cascade,
  cvss_score        numeric,
  severity          text,
  priority_score    numeric not null default 0,  -- drives ORDER BY in the route
  detected_at       timestamptz not null default now()
);

create index if not exists vulnerability_matches_priority_idx on vulnerability_matches (priority_score desc);
create index if not exists vulnerability_matches_host_package_idx on vulnerability_matches (host_package_id);

alter table vulnerability_matches enable row level security;

-- ── url_scans ─────────────────────────────────────────────────────────
-- Log of every POST /api/urlscan/submit result — powers the URL Scan Suite's history tab
-- (GET /api/urlscan/history). Note: this is a *different* URL scanner from the pre-existing
-- lib/scan.ts (routes/scan.ts, /api/scan) — that one is generic IOC scanning (URL/IP/domain/
-- hash via AbuseIPDB+URLHaus) and keeps its own history in the external downstream API. This
-- table is specific to the URLHaus+ThreatFox+Google-Safe-Browsing URL-only scanner.
create table if not exists url_scans (
  id                  bigint generated always as identity primary key,
  org_id              uuid not null,
  submitted_url       text not null,
  final_url           text,
  risk_score          integer not null default 0,
  verdict             text not null default 'clean',  -- clean | suspicious | malicious
  redirect_chain      jsonb default '[]',
  gsb_verdict         text,
  urlscan_verdict     text,
  scan_duration_ms    integer,
  scanned_at          timestamptz not null default now()
);

create index if not exists url_scans_scanned_at_idx on url_scans (scanned_at desc);
create index if not exists url_scans_org_id_idx on url_scans (org_id);

alter table url_scans enable row level security;

-- ── website_scans ────────────────────────────────────────────────────
-- Log of every POST /api/webscan/start result — powers the Website Scanning history tab
-- (GET /api/webscan/history). SSL Labs grade + RDAP/DNS findings only for now; full DAST
-- (Nuclei/Nmap) needs the EC2-4 scanner instance mentioned in the findings when scan_type='full'.
create table if not exists website_scans (
  id              bigint generated always as identity primary key,
  org_id          uuid not null,
  target_domain   text not null,
  scan_type       text not null default 'quick',  -- quick | full
  ssl_grade       text,
  vuln_critical   integer not null default 0,
  vuln_high       integer not null default 0,
  vuln_medium     integer not null default 0,
  vuln_low        integer not null default 0,
  findings        jsonb default '[]',
  scanned_at      timestamptz not null default now()
);

create index if not exists website_scans_scanned_at_idx on website_scans (scanned_at desc);
create index if not exists website_scans_org_id_idx on website_scans (org_id);

alter table website_scans enable row level security;
