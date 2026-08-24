import { Router } from 'express';
import { search } from '../lib/wazuh-indexer';

const router = Router();

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

const emptyStates = () =>
    Object.entries(NIGERIA_STATE_CODES).map(([name, code]) => ({
        name, code, threats: 0, critical: 0, high: 0, medium: 0, low: 0,
        severity: 'clean' as const, top_threat_type: 'None', top_rule: 'None',
        ips_monitored: 0, latest_alert: null as string | null, threat_types: {} as Record<string, number>,
    }));

const emptySummary = (threatLevel: string, error?: string) => ({
    total_threats: 0, threat_score: 0, critical_states: 0,
    today_attacks: 0, malware: 0, phishing: 0, botnets: 0,
    ransomware: 0, ddos: 0, credential_theft: 0,
    highest_attack_states: [] as { name: string; count: number; state: string; threat_type: string }[],
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
            threat_types: Record<string, number>; top_rules: Record<string, number>;
            ips: Set<string>; latest_alert: string;
        }> = {};
        for (const stateName of Object.keys(NIGERIA_STATE_CODES)) {
            stateMap[stateName] = { threats: 0, critical: 0, high: 0, medium: 0, low: 0, threat_types: {}, top_rules: {}, ips: new Set(), latest_alert: '' };
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
        const globalThreatTypes: Record<string, number> = {};

        for (const hit of hits) {
            const src = hit._source;
            const level = src.rule?.level ?? 0;
            const severity = severityFromLevel(level);
            const ruleGroups = src.rule?.groups ?? [];
            const threatType = classifyThreat(ruleGroups);
            const region = src.GeoLocation?.region_name ?? '';
            const srcIp = src.data?.srcip ?? '';

            if (!region) continue;
            const matchedState = Object.keys(NIGERIA_STATE_CODES).find(
                (s) => region.toLowerCase() === s.toLowerCase() || region.toLowerCase().includes(s.toLowerCase())
            );
            if (!matchedState) continue;

            totalThreats++;
            if (severity === 'critical') totalCritical++;
            globalThreatTypes[threatType] = (globalThreatTypes[threatType] ?? 0) + 1;

            const stateData = stateMap[matchedState];
            stateData.threats++;
            stateData[severity]++;
            stateData.threat_types[threatType] = (stateData.threat_types[threatType] ?? 0) + 1;
            const ruleDesc = src.rule?.description ?? 'Unknown';
            stateData.top_rules[ruleDesc] = (stateData.top_rules[ruleDesc] ?? 0) + 1;
            if (srcIp) stateData.ips.add(srcIp);
            const ts = src.timestamp ?? '';
            if (!stateData.latest_alert || ts > stateData.latest_alert) stateData.latest_alert = ts;
        }

        const states = Object.entries(stateMap).map(([name, data]) => {
            const topThreatType = Object.entries(data.threat_types).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';
            const topRule = Object.entries(data.top_rules).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';

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
            };
        });

        const sortedByThreats = [...states].sort((a, b) => b.threats - a.threats).filter((s) => s.threats > 0);
        const threatScore = totalThreats > 0
            ? Math.min(Math.round((totalCritical * 10 + totalThreats * 0.5) / Math.max(hits.length / 100, 1)), 100)
            : 0;
        const criticalStates = states.filter((s) => s.severity === 'critical').length;

        res.json({
            states,
            summary: {
                total_threats: totalThreats,
                threat_score: threatScore,
                critical_states: criticalStates,
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
            generated_at: now.toISOString(),
        });
    } catch (err) {
        console.error('Nigeria threats error:', err);
        res.json({
            states: emptyStates(),
            summary: emptySummary('CLEAR', 'Wazuh indexer unavailable — showing zeros'),
            source: 'wazuh',
            generated_at: new Date().toISOString(),
            error: 'Wazuh indexer unavailable — showing zeros',
        });
    }
});

export default router;
