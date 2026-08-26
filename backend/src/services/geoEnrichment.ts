import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Architecture: Frontend -> Express backend -> this service -> IPregistry / RIPE Stat / Supabase.
// The frontend never talks to IPregistry, RIPE Stat, or Supabase directly — everything routes
// through backend/src/routes/geo.ts, which calls the functions below.

// ── SUPABASE CLIENT (lazy) ────────────────────────────────────────
// Built lazily rather than at module scope: this file is imported by routes/geo.ts, which is
// imported by index.ts at boot. `createClient()` throws synchronously if given an empty URL, so
// a top-level `createClient(process.env.SUPABASE_URL!, ...)` would crash the *entire* backend on
// startup any time Supabase isn't configured yet — not just this route. Lazy init means the rest
// of the API keeps working until someone actually calls a geo-enrichment endpoint.

let supabase: SupabaseClient | null | undefined;
let warnedMissingConfig = false;

export function getSupabase(): SupabaseClient | null {
    if (supabase !== undefined) return supabase;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
        if (!warnedMissingConfig) {
            console.warn('[geoEnrichment] SUPABASE_URL/SUPABASE_SERVICE_KEY not set — IP enrichment caching and Nigerian ASN lookups are disabled.');
            warnedMissingConfig = true;
        }
        supabase = null;
        return supabase;
    }

    supabase = createClient(url, key);
    return supabase;
}

export interface EnrichedIP {
    ip: string;
    // Location
    country_code: string;
    country_name: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    timezone: string;
    // Network
    asn: string;
    asn_name: string;
    isp: string;
    org: string;
    prefix: string;
    // Security flags
    is_vpn: boolean;
    is_proxy: boolean;
    is_tor: boolean;
    is_hosting: boolean;
    threat_score: number;
    // African/Nigerian enrichment
    is_african: boolean;
    is_nigerian: boolean;
    nigerian_isp: string | null;
    nigerian_state: string | null;
    network_type: string | null;
    afrinic_org: string | null;
    // Meta
    source: string;
    confidence: number;
    cached_at: string;
}

interface NigerianAsnRow {
    isp: string;
    primary_state: string;
    network_type: string;
    organization: string;
}

// ── MAIN ENRICHMENT FUNCTION ──────────────────────────────────────

export async function enrichIP(ip: string): Promise<EnrichedIP> {
    // 1. Check Supabase cache first
    const cached = await getCachedEnrichment(ip);
    if (cached) return cached;

    // 2. Cache miss — query external services in parallel
    const [ipregistryData, ripeData, afrinicData] = await Promise.allSettled([
        queryIPregistry(ip),
        queryRIPEStat(ip),
        queryAFRINIC(ip),
    ]);

    // 3. Merge results
    const enriched = mergeEnrichmentData(
        ip,
        ipregistryData.status === 'fulfilled' ? ipregistryData.value : null,
        ripeData.status === 'fulfilled' ? ripeData.value : null,
        afrinicData.status === 'fulfilled' ? afrinicData.value : null,
    );

    // 4. Nigerian enrichment — check our own ASN database
    if (enriched.country_code === 'NG') {
        const nigerian = await enrichNigerian(enriched.asn);
        if (nigerian) {
            enriched.is_nigerian = true;
            enriched.nigerian_isp = nigerian.isp;
            enriched.nigerian_state = nigerian.primary_state;
            enriched.network_type = nigerian.network_type;
        }
    }

    // 5. African flag — a country-code allowlist (imprecise/incomplete: only 20 of Africa's 54
    // countries) OR'd with AFRINIC actually having a record for this address at all, which is
    // the authoritative signal (AFRINIC is *the* RIR for the whole continent — if it has data,
    // the address is African, full stop) already computed into is_african by mergeEnrichmentData.
    const AFRICAN_COUNTRIES = [
        'NG', 'ZA', 'KE', 'GH', 'ET', 'EG', 'TZ', 'UG', 'SN', 'CI',
        'CM', 'ZM', 'ZW', 'MZ', 'AO', 'MG', 'BJ', 'BF', 'ML', 'RW',
    ];
    enriched.is_african = enriched.is_african || AFRICAN_COUNTRIES.includes(enriched.country_code);

    // 6. Cache result in Supabase
    await cacheEnrichment(enriched);

    return enriched;
}

// ── SUPABASE CACHE ────────────────────────────────────────────────

async function getCachedEnrichment(ip: string): Promise<EnrichedIP | null> {
    const sb = getSupabase();
    if (!sb) return null;

    const { data, error } = await sb
        .from('ip_enrichment_cache')
        .select('*')
        .eq('ip', ip)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !data) return null;
    return data as EnrichedIP;
}

async function cacheEnrichment(enriched: EnrichedIP): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await sb
        .from('ip_enrichment_cache')
        .upsert({
            ...enriched,
            cached_at: new Date().toISOString(),
            expires_at: expiresAt,
        }, {
            onConflict: 'ip',
        });
}

// ── IPREGISTRY ────────────────────────────────────────────────────

async function queryIPregistry(ip: string): Promise<Record<string, unknown>> {
    const apiKey = process.env.IPREGISTRY_API_KEY;
    if (!apiKey || apiKey === 'REPLACE_AFTER_SIGNUP' || apiKey === 'REPLACE_WHEN_OBTAINED') {
        throw new Error('IPREGISTRY_API_KEY not configured');
    }

    const response = await fetch(
        `https://api.ipregistry.co/${ip}?key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error(`IPregistry error: ${response.status}`);
    return response.json();
}

// ── RIPE STAT ─────────────────────────────────────────────────────
// No API key required

async function queryRIPEStat(ip: string): Promise<Record<string, unknown>> {
    const response = await fetch(
        `https://stat.ripe.net/data/network-info/data.json?resource=${ip}`,
        { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error(`RIPE Stat error: ${response.status}`);
    const data = await response.json();
    return data.data;
}

// ── AFRINIC ───────────────────────────────────────────────────────
// AFRINIC is the Regional Internet Registry for Africa — no API key required. Its RDAP server
// only ever holds African address space, so a successful response is itself confirmation the
// IP is African, independent of country_code.
//
// Verified live while building this: AFRINIC's RDAP does NOT 404 for non-African IPs the way
// a first read of their docs suggests — it 301-redirects to the correct RIR instead (e.g.
// 8.8.8.8 → rdap.arin.net), per the standard RDAP bootstrap behavior. `redirect: 'manual'` is
// load-bearing here: without it, `fetch` would silently follow that redirect and return
// ARIN's *successful* response, which would then get misread as "AFRINIC confirmed this."

interface AfrinicResult {
    country_code: string | null;
    org: string | null;
}

async function queryAFRINIC(ip: string): Promise<AfrinicResult | null> {
    const response = await fetch(`https://rdap.afrinic.net/rdap/ip/${ip}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null; // covers the redirect-to-another-RIR case above too
    const data = await response.json();
    return {
        country_code: typeof data.country === 'string' ? data.country.toUpperCase() : null,
        org: data.name ?? null,
    };
}

// ── MERGE RESULTS ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeEnrichmentData(ip: string, ipregistry: any | null, ripe: any | null, afrinic: AfrinicResult | null): EnrichedIP {
    // country_code: IPregistry (most detailed) first, then RIPE Stat, then AFRINIC — AFRINIC
    // is region-scoped (it only ever reports African countries) so it's a weaker signal for
    // country specifically, but the strongest signal for "is this address African at all."
    const countryCode = ipregistry?.location?.country?.code || ripe?.country_code || afrinic?.country_code || '';

    // Base structure with safe defaults
    const enriched: EnrichedIP = {
        ip,
        country_code: countryCode,
        country_name: ipregistry?.location?.country?.name || '',
        region: ipregistry?.location?.region?.name || '',
        city: ipregistry?.location?.city || '',
        latitude: ipregistry?.location?.latitude || 0,
        longitude: ipregistry?.location?.longitude || 0,
        timezone: ipregistry?.time_zone?.id || '',
        asn: ripe?.asns?.[0] ? `AS${ripe.asns[0]}` : (ipregistry?.connection?.asn ? `AS${ipregistry.connection.asn}` : ''),
        asn_name: ipregistry?.connection?.organization || '',
        isp: ipregistry?.connection?.organization || '',
        org: ipregistry?.company?.name || '',
        prefix: ripe?.prefix || '',
        is_vpn: ipregistry?.security?.is_vpn || false,
        is_proxy: ipregistry?.security?.is_proxy || false,
        is_tor: ipregistry?.security?.is_tor || false,
        is_hosting: ipregistry?.security?.is_hosting || false,
        threat_score: ipregistry?.security?.score || 0,
        is_african: !!afrinic, // AFRINIC only ever returns data for its own (African) address space
        is_nigerian: countryCode === 'NG',
        nigerian_isp: null,
        nigerian_state: null,
        network_type: null,
        afrinic_org: afrinic?.org ?? null,
        source: [ipregistry ? 'ipregistry' : null, ripe ? 'ripe' : null, afrinic ? 'afrinic' : null].filter(Boolean).join('+') || 'unknown',
        confidence: ipregistry ? 90 : (ripe || afrinic) ? 60 : 10,
        cached_at: new Date().toISOString(),
    };

    return enriched;
}

// ── NIGERIAN ASN LOOKUP ───────────────────────────────────────────

async function enrichNigerian(asn: string): Promise<NigerianAsnRow | null> {
    if (!asn) return null;

    const sb = getSupabase();
    if (!sb) return null;

    const { data } = await sb
        .from('nigerian_asns')
        .select('isp, primary_state, network_type, organization')
        .eq('asn', asn)
        .eq('is_active', true)
        .single();

    return (data as NigerianAsnRow) || null;
}

// ── BULK ENRICHMENT ───────────────────────────────────────────────
// For enriching multiple IPs from Wazuh alerts

export async function enrichIPBatch(ips: string[]): Promise<Map<string, EnrichedIP>> {
    const results = new Map<string, EnrichedIP>();
    const unique = [...new Set(ips)].filter(ip => ip && ip !== '127.0.0.1');

    // Process in parallel with concurrency limit of 5
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 5) {
        chunks.push(unique.slice(i, i + 5));
    }

    for (const chunk of chunks) {
        const enriched = await Promise.allSettled(chunk.map(ip => enrichIP(ip)));
        enriched.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                results.set(chunk[idx], result.value);
            }
        });
    }

    return results;
}
