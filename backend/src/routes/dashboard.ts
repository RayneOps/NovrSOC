import { Router } from 'express';
import { search } from '../lib/wazuh-indexer';
import { enrichIPBatch } from '../services/geoEnrichment';
import { lookupASN } from '../services/ripeStat';
import { checkBlock, type AbuseIPDBBlockReport } from '../services/abuseipdb';
import { otxSearchPulses, type OTXPulse } from '../services/otx';

const router = Router();

// NOTE — multi-tenancy: see routes/wazuh.ts's identical note. This route queries
// wazuh-alerts-4.x-* directly rather than through lib/wazuh-group.ts's group helpers, so
// scoping to a client org later means adding an `agent.group: req.user.org_id` term to the
// query body below, not new infrastructure — this is the pre-client baseline, all data here
// is Cybernovr-internal.

// The 6 major Nigerian ISPs, RIPE-Stat-verified while building the CTI Platform's Network
// Intelligence tab (services/ripeStat.ts) — do not extend this list without verifying each
// ASN's real holder first. An earlier draft of this exact table had 3 of 6 entries wrong
// (Glo/9mobile/Spectranet's ASNs swapped/incorrect), which would have silently misattributed
// real network traffic.
const NIGERIAN_ISP_ASNS = ['AS29465', 'AS36873', 'AS37148', 'AS37076', 'AS37282', 'AS37340'];

interface SupplementalNigeriaData {
    abuse_reports: Array<AbuseIPDBBlockReport & { isp: string; asn: string }>;
    otx_pulses: OTXPulse[];
    fetched_at: string;
}
let supplementalCache: { data: SupplementalNigeriaData; expires: number } | null = null;

// Nigerian AbuseIPDB reports (Part 3) + OTX Nigeria pulses (CONTEXT) — genuinely supplemental:
// neither depends on Wazuh having seen anything at all, which is the whole point ("show real
// data even when Wazuh has no Nigerian-geolocated events"). Cached 15 minutes — this is 6 ASN
// lookups (each itself 3 RIPE Stat calls) plus 6 AbuseIPDB check-block calls plus an OTX
// search; re-running all of that on every dashboard poll/time-range toggle isn't warranted
// when the underlying data (which IPs a Nigerian ISP's block has had reported, worldwide
// pulses mentioning Nigeria) doesn't meaningfully change minute to minute.
async function getSupplementalNigeriaData(): Promise<SupplementalNigeriaData> {
    if (supplementalCache && supplementalCache.expires > Date.now()) return supplementalCache.data;

    const [abuseResults, otxPulses] = await Promise.all([
        Promise.all(NIGERIAN_ISP_ASNS.map(async (asn) => {
            try {
                const info = await lookupASN(asn);
                const topPrefix = info.prefixes.find((p) => !p.includes(':')); // prefer an IPv4 prefix — check-block doesn't take IPv6
                if (!topPrefix) return [];
                // check-block accepts at most a /24 (65536 hosts is rejected) — narrow anything
                // bigger down to its first /24 rather than skipping the ASN entirely.
                const [addr, maskStr] = topPrefix.split('/');
                const mask = Number(maskStr);
                const cidr = mask >= 24 ? topPrefix : `${addr}/24`;
                const reported = await checkBlock(cidr, 14);
                return reported
                    .filter((r) => r.abuseConfidenceScore >= 50)
                    .map((r) => ({ ...r, isp: info.holder, asn }));
            } catch {
                return [];
            }
        })),
        otxSearchPulses('nigeria', 10).catch(() => []),
    ]);

    const data: SupplementalNigeriaData = {
        abuse_reports: abuseResults.flat().slice(0, 25),
        otx_pulses: otxPulses,
        fetched_at: new Date().toISOString(),
    };
    supplementalCache = { data, expires: Date.now() + 15 * 60 * 1000 };
    return data;
}

// State name -> code. Keyed by the exact name used in components/geo/NigeriaMap2.tsx's SVG
// (`name="..."` on each <path>) and STATE_META there — NOT the spec this route was drafted
// from, which used 'FCT Abuja' (doesn't exist as a key anywhere in the frontend; the real
// name is 'Federal Capital Territory').
const NIGERIA_STATE_CODES: Record<string, string> = {
    'Lagos': 'LA', 'Kano': 'KN', 'Rivers': 'RI', 'Oyo': 'OY',
    'Kaduna': 'KD', 'Katsina': 'KT', 'Ogun': 'OG', 'Borno': 'BO',
    'Anambra': 'AN', 'Bauchi': 'BA', 'Delta': 'DE', 'Imo': 'IM',
    'Niger': 'NI', 'Akwa Ibom': 'AK', 'Sokoto': 'SO', 'Ondo': 'ON',
    'Osun': 'OS', 'Kogi': 'KO', 'Zamfara': 'ZM', 'Enugu': 'EN',
    'Edo': 'ED', 'Plateau': 'PL', 'Adamawa': 'AD', 'Cross River': 'CR',
    'Benue': 'BE', 'Abia': 'AB', 'Ekiti': 'EK', 'Kwara': 'KW',
    'Jigawa': 'JI', 'Nassarawa': 'NA', 'Ebonyi': 'EB', 'Kebbi': 'KB',
    'Taraba': 'TA', 'Gombe': 'GO', 'Bayelsa': 'BY', 'Yobe': 'YO',
    'Federal Capital Territory': 'FC',
};

function classifyThreat(ruleGroups: string[]): string {
    const groups = (ruleGroups || []).join(' ').toLowerCase();
    if (groups.includes('ransomware') || groups.includes('ryuk') || groups.includes('lockbit')) return 'Ransomware';
    if (groups.includes('malware') || groups.includes('trojan') || groups.includes('virus')) return 'Malware';
    if (groups.includes('phishing') || groups.includes('web_attack')) return 'Phishing';
    if (groups.includes('botnet') || groups.includes('c2') || groups.includes('beacon')) return 'Botnet';
    if (groups.includes('ddos') || groups.includes('flood')) return 'DDoS';
    if (groups.includes('credential') || groups.includes('brute_force') || groups.includes('authentication')) return 'Credential Theft';
    return 'Other';
}

function severityFromLevel(level: number): 'critical' | 'high' | 'medium' | 'low' {
    if (level >= 12) return 'critical';
    if (level >= 9) return 'high';
    if (level >= 6) return 'medium';
    return 'low';
}

// Per-state map coloring/legend — deliberately keyed off raw threat *count*, not the
// critical/high/medium/low severity mix computed above. Those two schemes answer different
// questions (severity: "how bad is the worst thing here" vs. this: "how much is happening
// here at all") and the map's legend previously described a third, unrelated thing entirely
// (threat *type* colors that didn't match what getStateColor() in NigeriaMap2.tsx actually
// rendered) — this is what NigeriaMap2.tsx's legend and fill color are wired to now.
type ThreatLevel = 'None' | 'Low' | 'Medium' | 'High' | 'Severe' | 'Critical';
function getThreatLevel(count: number): ThreatLevel {
    if (count === 0) return 'None';
    if (count <= 5) return 'Low';
    if (count <= 20) return 'Medium';
    if (count <= 50) return 'High';
    if (count <= 100) return 'Severe';
    return 'Critical';
}

const emptyStates = () =>
    Object.entries(NIGERIA_STATE_CODES).map(([name, code]) => ({
        name, code, threats: 0, critical: 0, high: 0, medium: 0, low: 0,
        severity: 'clean' as const, top_threat_type: 'None', top_rule: 'None',
        ips_monitored: 0, latest_alert: null as string | null, threat_types: {} as Record<string, number>,
        threat_level: 'None' as ThreatLevel, top_source_ip: null as string | null, affected_hosts: [] as string[],
    }));

const emptySummary = (threatLevel: string, error?: string) => ({
    total_threats: 0, threat_score: 0, critical_states: 0, states_affected: 0,
    today_attacks: 0, malware: 0, phishing: 0, botnets: 0,
    ransomware: 0, ddos: 0, credential_theft: 0,
    highest_attack_states: [] as { name: string; count: number; state: string; threat_type: string }[],
    top_state: null as string | null,
    threat_level: threatLevel,
    ...(error ? { error } : {}),
});

interface AlertHit {
    _source: {
        timestamp?: string;
        agent?: { name?: string };
        rule?: { level?: number; description?: string; groups?: string[] };
        data?: { srcip?: string };
        GeoLocation?: { region_name?: string; country_name?: string };
    };
}
interface SearchResponse { hits?: { hits?: AlertHit[] } }

const RANGE_MS: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
};

// GET /api/dashboard/nigeria-threats?range=1h|24h|7d (default 24h)
router.get('/nigeria-threats', async (req, res) => {
    const rangeParam = typeof req.query.range === 'string' ? req.query.range : '24h';
    const windowMs = RANGE_MS[rangeParam] ?? RANGE_MS['24h'];
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    try {
        const result = await search<SearchResponse>('wazuh-alerts-4.x-*', {
            size: 1000,
            query: { range: { timestamp: { gte: windowStart.toISOString(), lte: now.toISOString() } } },
            _source: [
                'timestamp', 'agent.name', 'agent.ip',
                'rule.level', 'rule.description', 'rule.groups',
                'data.srcip', 'data.dstip',
                'GeoLocation.region_name', 'GeoLocation.country_name',
                'GeoLocation.latitude', 'GeoLocation.longitude',
            ],
        });

        const hits = result?.hits?.hits ?? [];

        const stateMap: Record<string, {
            threats: number; critical: number; high: number; medium: number; low: number;
            threat_types: Record<string, number>; top_rules: Record<string, number>; top_source_ips: Record<string, number>;
            ips: Set<string>; agents: Set<string>; latest_alert: string;
        }> = {};
        for (const stateName of Object.keys(NIGERIA_STATE_CODES)) {
            stateMap[stateName] = { threats: 0, critical: 0, high: 0, medium: 0, low: 0, threat_types: {}, top_rules: {}, top_source_ips: {}, ips: new Set(), agents: new Set(), latest_alert: '' };
        }

        // Scoped to genuinely Nigerian-geolocated events only — deliberately NOT falling back
        // to a default state (e.g. Lagos) for events with no/unmatched GeoLocation. The vast
        // majority of this deployment's alerts are internal agent telemetry (Windows logons,
        // PAM sessions) with no GeoLocation field at all; defaulting those to a specific state
        // would fabricate attribution this data doesn't support — exactly what "never mock
        // data" rules out. Summary totals below are the Nigerian-attributed subset for the
        // same reason: a "Today's Attacks: 47" figure next to a map showing every state at
        // zero would be a worse, more confusing kind of dishonest than a low real number.
        let totalThreats = 0;
        let totalCritical = 0;
        let ipEnrichedThreats = 0; // subset of totalThreats attributed via source 2 (below), not Wazuh's own GeoLocation
        const globalThreatTypes: Record<string, number> = {};

        // Fuzzy-matches free text against NIGERIA_STATE_CODES's keys — used to resolve Supabase
        // nigerian_asns.primary_state (below, the IP-enrichment fallback pass) against the
        // canonical state names, since it's an independently-typed-in text field with no
        // guarantee of matching this file's conventions (e.g. 'Abuja' vs the canonical
        // 'Federal Capital Territory'). The primary GeoLocation.region_name pass further below
        // keeps its own original, narrower match inline rather than sharing this — deliberately
        // untouched so this change can't alter that already-working path's behavior at all.
        // Returns undefined rather than guessing when nothing matches — an unresolvable state
        // name is dropped, never defaulted.
        function matchStateName(raw: string): string | undefined {
            if (!raw) return undefined;
            const needle = raw.toLowerCase();
            return Object.keys(NIGERIA_STATE_CODES).find(
                (s) => needle === s.toLowerCase() || needle.includes(s.toLowerCase()) || s.toLowerCase().includes(needle)
            );
        }

        // Shared by both the primary (GeoLocation) pass and the IP-enrichment fallback pass
        // below, so a hit is scored identically no matter which signal placed it on the map.
        function attributeHit(hit: AlertHit, matchedState: string): void {
            const src = hit._source;
            const level = src.rule?.level ?? 0;
            const severity = severityFromLevel(level);
            const threatType = classifyThreat(src.rule?.groups ?? []);
            const srcIp = src.data?.srcip ?? '';
            const agentName = src.agent?.name ?? '';

            totalThreats++;
            if (severity === 'critical') totalCritical++;
            globalThreatTypes[threatType] = (globalThreatTypes[threatType] ?? 0) + 1;

            const stateData = stateMap[matchedState];
            stateData.threats++;
            stateData[severity]++;
            stateData.threat_types[threatType] = (stateData.threat_types[threatType] ?? 0) + 1;
            const ruleDesc = src.rule?.description ?? 'Unknown';
            stateData.top_rules[ruleDesc] = (stateData.top_rules[ruleDesc] ?? 0) + 1;
            if (srcIp) {
                stateData.ips.add(srcIp);
                stateData.top_source_ips[srcIp] = (stateData.top_source_ips[srcIp] ?? 0) + 1;
            }
            if (agentName) stateData.agents.add(agentName);
            const ts = src.timestamp ?? '';
            if (!stateData.latest_alert || ts > stateData.latest_alert) stateData.latest_alert = ts;
        }

        // Hits Wazuh's own GeoLocation field couldn't place on a state — candidates for the
        // IP-enrichment fallback pass below. Grouped by srcip (not left as a flat list) so that
        // pass can run enrichment once per distinct IP and then attribute every hit that shared
        // it, rather than re-enriching the same IP once per alert.
        const unattributedBySrcIp = new Map<string, AlertHit[]>();

        for (const hit of hits) {
            const src = hit._source;
            const region = src.GeoLocation?.region_name ?? '';
            const srcIp = src.data?.srcip ?? '';

            const matchedState = region
                ? Object.keys(NIGERIA_STATE_CODES).find(
                    (s) => region.toLowerCase() === s.toLowerCase() || region.toLowerCase().includes(s.toLowerCase())
                )
                : undefined;

            if (matchedState) {
                attributeHit(hit, matchedState);
                continue;
            }
            if (srcIp) {
                const bucket = unattributedBySrcIp.get(srcIp);
                if (bucket) bucket.push(hit);
                else unattributedBySrcIp.set(srcIp, [hit]);
            }
        }

        // ── SOURCE 2/3/4 FALLBACK: IP-based enrichment (IPregistry + RIPE Stat + AFRINIC) ──
        // for whatever the primary GeoLocation pass above couldn't place. Capped to the
        // most-frequent 25 distinct IPs — enrichment is 3 external HTTP calls per IP, so
        // enriching every distinct srcip in a 1000-alert window isn't a bounded-latency
        // operation. This is genuinely a fallback, not a replacement: an IP's ASN indicates
        // which ISP routes it, not which state the traffic actually originated in, so it's a
        // materially weaker signal than Wazuh's own GeoLocation — which is exactly why it only
        // ever fires for hits GeoLocation had nothing to say about, never overriding a real match.
        const candidateIps = [...unattributedBySrcIp.entries()]
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 25)
            .map(([ip]) => ip);

        let enrichedCount = 0;
        let nigerianConfirmedCount = 0;
        if (candidateIps.length > 0) {
            try {
                const geoMap = await enrichIPBatch(candidateIps);
                enrichedCount = geoMap.size;
                for (const [ip, geo] of geoMap) {
                    if (!geo.is_nigerian) continue;
                    nigerianConfirmedCount++;
                    const matchedState = geo.nigerian_state ? matchStateName(geo.nigerian_state) : undefined;
                    if (!matchedState) continue; // confirmed Nigerian, but no resolvable state-level signal — leave off the map rather than guess
                    for (const hit of unattributedBySrcIp.get(ip) ?? []) {
                        attributeHit(hit, matchedState);
                        ipEnrichedThreats++;
                    }
                }
            } catch (err) {
                console.error('Nigeria threats — IP enrichment fallback failed:', err);
            }
        }

        const states = Object.entries(stateMap).map(([name, data]) => {
            const topThreatType = Object.entries(data.threat_types).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';
            const topRule = Object.entries(data.top_rules).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';
            const topSourceIp = Object.entries(data.top_source_ips).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

            let severity: 'critical' | 'high' | 'medium' | 'low' | 'clean' = 'clean';
            if (data.critical > 0) severity = 'critical';
            else if (data.high > 0) severity = 'high';
            else if (data.medium > 0) severity = 'medium';
            else if (data.threats > 0) severity = 'low';

            return {
                name,
                code: NIGERIA_STATE_CODES[name],
                threats: data.threats,
                critical: data.critical,
                high: data.high,
                medium: data.medium,
                low: data.low,
                severity,
                top_threat_type: topThreatType,
                top_rule: topRule,
                ips_monitored: data.ips.size,
                latest_alert: data.latest_alert || null,
                threat_types: data.threat_types,
                threat_level: getThreatLevel(data.threats),
                top_source_ip: topSourceIp,
                affected_hosts: [...data.agents],
            };
        });

        const sortedByThreats = [...states].sort((a, b) => b.threats - a.threats).filter((s) => s.threats > 0);
        const threatScore = totalThreats > 0
            ? Math.min(Math.round((totalCritical * 10 + totalThreats * 0.5) / Math.max(hits.length / 100, 1)), 100)
            : 0;
        const criticalStates = states.filter((s) => s.severity === 'critical').length;
        const statesAffected = states.filter((s) => s.threats > 0).length;
        const topState = sortedByThreats[0]?.name ?? null;

        // Supplemental sources — deliberately fetched even when Wazuh returned zero
        // Nigerian-attributed hits, since the whole point is showing real data in that case too.
        const supplemental = await getSupplementalNigeriaData().catch(() => ({ abuse_reports: [], otx_pulses: [], fetched_at: new Date().toISOString() }));

        res.json({
            states,
            summary: {
                total_threats: totalThreats,
                threat_score: threatScore,
                critical_states: criticalStates,
                states_affected: statesAffected,
                top_state: topState,
                today_attacks: totalThreats,
                malware: globalThreatTypes['Malware'] ?? 0,
                phishing: globalThreatTypes['Phishing'] ?? 0,
                botnets: globalThreatTypes['Botnet'] ?? 0,
                ransomware: globalThreatTypes['Ransomware'] ?? 0,
                ddos: globalThreatTypes['DDoS'] ?? 0,
                credential_theft: globalThreatTypes['Credential Theft'] ?? 0,
                highest_attack_states: sortedByThreats.slice(0, 6).map((s) => ({
                    name: `${s.top_threat_type} ${s.name}`,
                    count: s.threats,
                    state: s.name,
                    threat_type: s.top_threat_type,
                })),
                threat_level: totalCritical > 0 ? 'CRITICAL'
                    : totalThreats > 50 ? 'HIGH'
                    : totalThreats > 20 ? 'MEDIUM'
                    : totalThreats > 0 ? 'LOW'
                    : 'CLEAR',
            },
            source: 'wazuh',
            geo_sources: {
                ipregistry: 'Primary geolocation and enrichment',
                ripe_stat: 'ASN and BGP routing information',
                afrinic: 'African IP allocation confirmation',
            },
            enrichment_coverage: {
                unattributed_ips: unattributedBySrcIp.size,
                ips_enriched: enrichedCount,
                nigerian_confirmed: nigerianConfirmedCount,
                threats_added_by_enrichment: ipEnrichedThreats,
            },
            supplemental: {
                abuse_reports: supplemental.abuse_reports,
                otx_pulses: supplemental.otx_pulses.map((p) => ({ id: p.id, name: p.name, tags: p.tags, created: p.created })),
                fetched_at: supplemental.fetched_at,
            },
            generated_at: now.toISOString(),
        });
    } catch (err) {
        console.error('Nigeria threats error:', err);
        // Wazuh itself is down, but the supplemental sources (AbuseIPDB, OTX) don't depend on
        // it — still fetch them so the map has something real to show instead of pure zeros.
        const supplemental = await getSupplementalNigeriaData().catch(() => ({ abuse_reports: [], otx_pulses: [], fetched_at: new Date().toISOString() }));
        res.json({
            states: emptyStates(),
            summary: emptySummary('CLEAR', 'Wazuh indexer unavailable — showing zeros'),
            source: 'wazuh',
            geo_sources: {
                ipregistry: 'Primary geolocation and enrichment',
                ripe_stat: 'ASN and BGP routing information',
                afrinic: 'African IP allocation confirmation',
            },
            enrichment_coverage: { unattributed_ips: 0, ips_enriched: 0, nigerian_confirmed: 0, threats_added_by_enrichment: 0 },
            supplemental: {
                abuse_reports: supplemental.abuse_reports,
                otx_pulses: supplemental.otx_pulses.map((p) => ({ id: p.id, name: p.name, tags: p.tags, created: p.created })),
                fetched_at: supplemental.fetched_at,
            },
            generated_at: new Date().toISOString(),
            error: 'Wazuh indexer unavailable — showing zeros',
        });
    }
});

// GET /api/dashboard/network-info/:ip — RIPE Stat routing info for a single IP.
// network-info resolves IP -> ASN + covering prefix; announced-prefixes/whois need an ASN, not
// an IP (verified live — passing an IP straight to announced-prefixes 400s: "should be one of:
// ASN"), so this resolves the ASN first and then reuses lookupASN (services/ripeStat.ts,
// already built + verified for the CTI Platform's Network Intelligence tab) for the rest
// rather than re-implementing that whois/RIR parsing a second time here.
router.get('/network-info/:ip', async (req, res) => {
    const { ip } = req.params;
    try {
        const netRes = await fetch(`https://stat.ripe.net/data/network-info/data.json?resource=${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(6000) });
        const netJson = await netRes.json();
        if (netJson?.status !== 'ok') {
            res.status(404).json({ error: 'RIPE Stat has no routing data for this IP', ip });
            return;
        }

        const asn: string | null = netJson.data?.asns?.[0] ? `AS${netJson.data.asns[0]}` : null;
        const prefix: string | null = netJson.data?.prefix ?? null;
        const asnInfo = asn ? await lookupASN(asn).catch(() => null) : null;

        res.json({
            ip,
            asn,
            prefix,
            holder: asnInfo?.holder ?? null,
            authoritative_rir: asnInfo?.authoritative_rir ?? null,
            is_afrinic: asnInfo?.is_afrinic ?? false,
            announced_prefixes: asnInfo?.prefixes ?? [],
            source: 'RIPE NCC',
        });
    } catch (err) {
        res.status(502).json({ error: err instanceof Error ? err.message : 'RIPE Stat lookup failed', ip });
    }
});

export default router;
