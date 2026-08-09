import { Router } from 'express';
import { wazuhGet } from '../lib/wazuh';
import { getAgentsForGroup, getAgentNamesForGroup } from '../lib/wazuh-group';
import { search } from '../lib/wazuh-indexer';

const router = Router();
const CTIP_URL = process.env.CTIP_API_URL || 'http://138.197.188.132:8001';

const groupParam = (req: import('express').Request) =>
    typeof req.query.group === 'string' ? req.query.group : null;

// GET /api/wazuh/alerts — talks to the Wazuh Manager REST API (port 55000), not the Indexer.
router.get('/alerts', async (_req, res) => {
    try {
        const { status, json } = await wazuhGet('/alerts?limit=10&sort=-timestamp');
        res.status(status).json(json);
    } catch {
        res.status(502).json(null);
    }
});

// GET /api/wazuh/agents
router.get('/agents', async (req, res) => {
    try {
        const group = groupParam(req);
        const agents = await getAgentsForGroup(group);
        const active = agents.filter((a) => a.status === 'active').length;
        const total = agents.length;
        const agentDetails = agents.map((a) => ({
            id: a.id,
            name: a.name,
            ip: a.ip,
            status: a.status,
            lastSeen: a.lastKeepAlive,
            os: a.os,
            group: a.group.join(', ') || 'default',
        }));
        res.json({ active, total, agents: agentDetails, data: { connection: { active, total } } });
    } catch {
        res.status(502).json(null);
    }
});

// GET /api/wazuh/notifications
router.get('/notifications', async (_req, res) => {
    interface WazuhHit { _id: string; _source: { timestamp?: string; rule?: { description?: string; level?: number }; agent?: { name?: string } } }
    interface SearchResponse { hits?: { hits?: WazuhHit[] } }

    const timeAgo = (iso?: string): string => {
        if (!iso) return '—';
        const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins} min ago`;
        const hrs = Math.floor(mins / 60);
        return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
    };
    const truncate = (s: string, max: number): string => (s.length > max ? s.slice(0, max - 3) + '...' : s);

    try {
        const result = await search<SearchResponse>('wazuh-alerts-4.x-*', {
            size: 6,
            sort: [{ 'rule.level': { order: 'desc' } }, { timestamp: { order: 'desc' } }],
            query: { range: { 'rule.level': { gte: 7 } } },
            _source: ['timestamp', 'rule.description', 'rule.level', 'agent.name'],
        });

        const hits = result?.hits?.hits ?? [];
        const notifications = hits.map((h) => {
            const level = h._source.rule?.level ?? 0;
            const description = h._source.rule?.description ?? 'Wazuh alert';
            return {
                id: h._id,
                type: level >= 12 ? 'critical' : level >= 7 ? 'warning' : 'info',
                title: truncate(description, 60),
                description: 'Detected on ' + (h._source.agent?.name ?? 'unknown agent'),
                time: timeAgo(h._source.timestamp),
                read: false,
            };
        });

        res.json(notifications);
    } catch {
        res.status(502).json([]);
    }
});

// GET /api/wazuh/threats-blocked
router.get('/threats-blocked', async (req, res) => {
    const THREAT_RULE_GROUPS = [
        'authentication_failed', 'attacks', 'exploit', 'malware', 'web-attack',
        'intrusion_detection', 'firewall-drop', 'ids', 'sshd',
    ];
    interface SearchResponse { hits?: { total?: { value?: number } } }

    try {
        const group = groupParam(req);
        const agentNames = group ? await getAgentNamesForGroup(group) : null;

        const must: unknown[] = [
            { terms: { 'rule.groups': THREAT_RULE_GROUPS } },
            { range: { timestamp: { gte: 'now-30d' } } },
        ];
        if (agentNames) must.push({ terms: { 'agent.name': agentNames } });

        const result = await search<SearchResponse>('wazuh-alerts-4.x-*', { size: 0, track_total_hits: true, query: { bool: { must } } });
        const threatsBlocked = result?.hits?.total?.value ?? 0;

        res.json({ threats_blocked: threatsBlocked, period: 'last 30 days' });
    } catch {
        res.status(502).json({ threats_blocked: 0, period: 'last 30 days' });
    }
});

// GET /api/wazuh/network-connections
router.get('/network-connections', async (req, res) => {
    const PRIVATE_PREFIXES = ['10.', '192.168.', '172.'];
    interface AggBucket { key: string; doc_count: number }
    interface RawHit { _source: { data?: { srcip?: string; dstip?: string; dstport?: string; srcport?: string } } }
    interface SearchResponse { hits?: { hits?: RawHit[] }; aggregations?: { top_ips?: { buckets?: AggBucket[] } } }
    interface CtipMatch { confidence?: number; country?: string | null }

    const lookupIoc = async (ip: string): Promise<{ verdict: 'Malicious' | 'Suspicious' | 'Unknown'; country: string | null }> => {
        try {
            const r = await fetch(`${CTIP_URL}/api/ctip/iocs/${encodeURIComponent(ip)}`, { cache: 'no-store' });
            const data = await r.json();
            const match: CtipMatch | undefined = Array.isArray(data?.matches) ? data.matches[0] : undefined;
            if (!data?.found || !match) return { verdict: 'Unknown', country: null };
            const verdict = (match.confidence ?? 0) >= 80 ? 'Malicious' : 'Suspicious';
            return { verdict, country: match.country ?? null };
        } catch {
            return { verdict: 'Unknown', country: null };
        }
    };

    const networkLabel = (ip: string): string => {
        if (ip.startsWith('10.')) return '10.x Corporate';
        if (ip.startsWith('192.168.')) {
            const parts = ip.split('.');
            return `192.168.${parts[2] ?? '0'}.x LAN`;
        }
        if (ip.startsWith('172.')) return '172.x LAN';
        return 'Private Network';
    };

    const ipAggQuery = (field: 'data.srcip' | 'data.dstip', agentFilter: unknown[], scope: 'external' | 'internal') => {
        const must: unknown[] = [{ exists: { field } }, { range: { timestamp: { gte: 'now-24h' } } }, ...agentFilter];
        const query =
            scope === 'external'
                ? { bool: { must, must_not: PRIVATE_PREFIXES.map((p) => ({ prefix: { [field]: p } })) } }
                : { bool: { must, should: PRIVATE_PREFIXES.map((p) => ({ prefix: { [field]: p } })), minimum_should_match: 1 } };
        return search<SearchResponse>('wazuh-alerts-4.x-*', { size: 0, query, aggs: { top_ips: { terms: { field, size: 10 } } } });
    };

    try {
        const group = groupParam(req);
        const agentNames = group ? await getAgentNamesForGroup(group) : null;
        const agentFilter = agentNames ? [{ terms: { 'agent.name': agentNames } }] : [];

        const [extSrcRes, extDstRes, intSrcRes, intDstRes, rawRes] = await Promise.allSettled([
            ipAggQuery('data.srcip', agentFilter, 'external'),
            ipAggQuery('data.dstip', agentFilter, 'external'),
            ipAggQuery('data.srcip', agentFilter, 'internal'),
            ipAggQuery('data.dstip', agentFilter, 'internal'),
            search<SearchResponse>('wazuh-alerts-4.x-*', {
                size: 40,
                query: {
                    bool: {
                        must: [
                            { bool: { should: [{ exists: { field: 'data.srcip' } }, { exists: { field: 'data.dstip' } }] } },
                            { range: { timestamp: { gte: 'now-24h' } } },
                            ...agentFilter,
                        ],
                    },
                },
                _source: ['data.srcip', 'data.dstip', 'data.dstport', 'data.srcport'],
            }),
        ]);

        const bucketsOf = (r: PromiseSettledResult<SearchResponse | null>) =>
            r.status === 'fulfilled' ? r.value?.aggregations?.top_ips?.buckets ?? [] : [];

        const extSrcBuckets = bucketsOf(extSrcRes);
        const extDstBuckets = bucketsOf(extDstRes);
        const intSrcBuckets = bucketsOf(intSrcRes);
        const intDstBuckets = bucketsOf(intDstRes);
        const rawHits = rawRes.status === 'fulfilled' ? rawRes.value?.hits?.hits ?? [] : [];

        const portForIp = (ip: string, field: 'srcip' | 'dstip', portField: 'dstport' | 'srcport') => {
            const hit = rawHits.find((h) => h._source.data?.[field] === ip);
            return hit?._source.data?.[portField] ?? '—';
        };

        const allIps = Array.from(
            new Set([
                ...extSrcBuckets.map((b) => b.key),
                ...extDstBuckets.map((b) => b.key),
                ...intSrcBuckets.map((b) => b.key),
                ...intDstBuckets.map((b) => b.key),
            ])
        );
        const lookups = await Promise.allSettled(allIps.map((ip) => lookupIoc(ip)));
        const verdictByIp = new Map<string, { verdict: 'Malicious' | 'Suspicious' | 'Unknown'; country: string | null }>();
        allIps.forEach((ip, i) => {
            const r = lookups[i];
            verdictByIp.set(ip, r.status === 'fulfilled' ? r.value : { verdict: 'Unknown', country: null });
        });

        const externalInbound = extSrcBuckets.map((b) => ({
            ip: b.key, count: b.doc_count,
            verdict: verdictByIp.get(b.key)?.verdict ?? 'Unknown',
            country: verdictByIp.get(b.key)?.country ?? '—',
            port: portForIp(b.key, 'srcip', 'dstport'),
        }));
        const externalOutbound = extDstBuckets.map((b) => ({
            ip: b.key, count: b.doc_count,
            verdict: verdictByIp.get(b.key)?.verdict ?? 'Unknown',
            country: verdictByIp.get(b.key)?.country ?? '—',
            port: portForIp(b.key, 'dstip', 'srcport'),
        }));

        // Private IPs are internal by definition; only override the "Internal" badge if CTIP
        // somehow flags the address (rare, but a compromised internal host could still show up).
        const internalInbound = intSrcBuckets.map((b) => ({
            ip: b.key, count: b.doc_count,
            verdict: verdictByIp.get(b.key)?.verdict === 'Malicious' || verdictByIp.get(b.key)?.verdict === 'Suspicious'
                ? verdictByIp.get(b.key)!.verdict
                : ('Internal' as const),
            network: networkLabel(b.key),
            port: portForIp(b.key, 'srcip', 'dstport'),
        }));
        const internalOutbound = intDstBuckets.map((b) => ({
            ip: b.key, count: b.doc_count,
            verdict: verdictByIp.get(b.key)?.verdict === 'Malicious' || verdictByIp.get(b.key)?.verdict === 'Suspicious'
                ? verdictByIp.get(b.key)!.verdict
                : ('Internal' as const),
            network: networkLabel(b.key),
            port: portForIp(b.key, 'dstip', 'srcport'),
        }));

        const maliciousDetected = [...externalInbound, ...externalOutbound, ...internalInbound, ...internalOutbound].filter(
            (c) => c.verdict === 'Malicious'
        ).length;

        res.json({
            external: { inbound: externalInbound, outbound: externalOutbound },
            internal: { inbound: internalInbound, outbound: internalOutbound },
            summary: {
                total_external_inbound: externalInbound.reduce((s, c) => s + c.count, 0),
                total_external_outbound: externalOutbound.reduce((s, c) => s + c.count, 0),
                total_internal: internalInbound.reduce((s, c) => s + c.count, 0) + internalOutbound.reduce((s, c) => s + c.count, 0),
                malicious_detected: maliciousDetected,
            },
        });
    } catch {
        res.status(502).json({
            external: { inbound: [], outbound: [] },
            internal: { inbound: [], outbound: [] },
            summary: { total_external_inbound: 0, total_external_outbound: 0, total_internal: 0, malicious_detected: 0 },
        });
    }
});

// GET /api/wazuh/vulnerabilities
router.get('/vulnerabilities', async (req, res) => {
    interface VulnHit {
        _source?: {
            vulnerability?: { id?: string; description?: string; severity?: string; under_evaluation?: boolean; score?: { base?: number } };
            package?: { name?: string; version?: string };
            agent?: { name?: string };
        };
    }
    interface SearchResponse { hits?: { hits?: VulnHit[] }; aggregations?: { by_severity?: { buckets?: { key: string; doc_count: number }[] } } }

    try {
        const group = groupParam(req);
        const severity = typeof req.query.severity === 'string' ? req.query.severity : null;
        const agentNames = group ? await getAgentNamesForGroup(group) : null;

        const groupFilters: Record<string, unknown>[] = [];
        if (agentNames) groupFilters.push({ terms: { 'agent.name': agentNames } });

        const aggsQuery = groupFilters.length ? { bool: { must: groupFilters } } : { match_all: {} };

        const hitsFilters = [...groupFilters];
        if (severity) hitsFilters.push({ term: { 'vulnerability.severity': severity } });
        const hitsQuery = hitsFilters.length ? { bool: { must: hitsFilters } } : { match_all: {} };

        const [hitsRes, aggsRes] = await Promise.allSettled([
            search<SearchResponse>('wazuh-states-vulnerabilities-*', {
                size: 50,
                sort: [{ 'vulnerability.score.base': { order: 'desc' } }],
                _source: [
                    'vulnerability.id', 'vulnerability.description', 'vulnerability.severity',
                    'vulnerability.score.base', 'vulnerability.under_evaluation',
                    'package.name', 'package.version', 'agent.name',
                ],
                query: hitsQuery,
            }),
            search<SearchResponse>('wazuh-states-vulnerabilities-*', {
                size: 0,
                query: aggsQuery,
                aggs: { by_severity: { terms: { field: 'vulnerability.severity' } } },
            }),
        ]).then((results) => results.map((r) => (r.status === 'fulfilled' ? r.value : null)));

        const vulnerabilities = (hitsRes?.hits?.hits ?? []).map((h) => {
            const v = h._source?.vulnerability;
            return {
                cve: v?.id ?? '',
                title: v?.description ?? '',
                severity: v?.severity ?? '',
                cvss_score: v?.score?.base ?? null,
                package: h._source?.package?.name ?? '',
                version: h._source?.package?.version ?? '',
                agent: h._source?.agent?.name ?? '',
                status: v?.under_evaluation ? 'Under Evaluation' : 'Confirmed',
            };
        });

        const buckets = aggsRes?.aggregations?.by_severity?.buckets ?? [];
        const countFor = (label: string) => buckets.find((b) => b.key?.toLowerCase() === label)?.doc_count ?? 0;

        const summary = {
            critical: countFor('critical'),
            high: countFor('high'),
            medium: countFor('medium'),
            low: countFor('low'),
            total: buckets.reduce((sum, b) => sum + (b.doc_count ?? 0), 0),
        };

        res.json({ vulnerabilities, summary });
    } catch {
        res.status(502).json({ vulnerabilities: [], summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 } });
    }
});

// GET /api/wazuh/alerts-indexer
router.get('/alerts-indexer', async (req, res) => {
    interface SearchResponse { hits?: { total?: { value?: number }; hits?: { _source?: unknown }[] } }

    const RANGE_MAP: Record<string, string> = { '1h': 'now-1h', '24h': 'now-24h', '7d': 'now-7d' };

    const countByLevel = (minLevel: number, agentNames: string[] | null) => {
        const must: unknown[] = [
            { range: { 'rule.level': { gte: minLevel } } },
            { range: { timestamp: { gte: 'now-24h' } } },
        ];
        if (agentNames) must.push({ terms: { 'agent.name': agentNames } });
        return search<SearchResponse>('wazuh-alerts-4.x-*', { size: 0, track_total_hits: true, query: { bool: { must } } });
    };

    try {
        const group = groupParam(req);
        const agentNames = group ? await getAgentNamesForGroup(group) : null;
        const minLevelParam = typeof req.query.minLevel === 'string' ? req.query.minLevel : null;
        const minLevel = minLevelParam !== null ? Number(minLevelParam) : 7;
        const rangeParam = typeof req.query.range === 'string' ? req.query.range : null;
        const since = RANGE_MAP[rangeParam ?? '24h'] ?? RANGE_MAP['24h'];

        const hitsMust: unknown[] = [
            { range: { 'rule.level': { gte: minLevel } } },
            { range: { timestamp: { gte: since } } },
        ];
        if (agentNames) hitsMust.push({ terms: { 'agent.name': agentNames } });

        const [alertsRes, criticalRes, openRes] = await Promise.allSettled([
            search<SearchResponse>('wazuh-alerts-4.x-*', {
                size: 10,
                sort: [{ timestamp: { order: 'desc' } }],
                query: { bool: { must: hitsMust } },
                _source: ['timestamp', 'rule.description', 'rule.level', 'agent.name', 'agent.ip', 'location'],
            }),
            countByLevel(12, agentNames),
            countByLevel(7, agentNames),
        ]).then((results) => results.map((r) => (r.status === 'fulfilled' ? r.value : null)));

        const hits = (alertsRes?.hits?.hits ?? []).map((h) => h._source).filter(Boolean);
        const criticalCount = criticalRes?.hits?.total?.value ?? null;
        const openIncidentsCount = openRes?.hits?.total?.value ?? null;

        res.json({ hits, criticalCount, openIncidentsCount });
    } catch {
        res.status(502).json({ hits: [], criticalCount: null, openIncidentsCount: null });
    }
});

// GET /api/wazuh/trend
router.get('/trend', async (req, res) => {
    interface Bucket { key_as_string?: string; doc_count?: number; high_severity?: { doc_count?: number }; critical?: { doc_count?: number } }
    interface SearchResponse { aggregations?: { alerts_over_time?: { buckets?: Bucket[] } } }

    const RANGE_CONFIG: Record<string, { interval: 'hour' | 'day'; min: string; count: number }> = {
        '24h': { interval: 'hour', min: 'now-24h', count: 24 },
        '7d': { interval: 'day', min: 'now-7d', count: 7 },
        '30d': { interval: 'day', min: 'now-30d', count: 30 },
    };

    try {
        const rangeParam = typeof req.query.range === 'string' ? req.query.range : null;
        const config = RANGE_CONFIG[rangeParam ?? '7d'] ?? RANGE_CONFIG['7d'];
        const group = groupParam(req);
        const agentNames = group ? await getAgentNamesForGroup(group) : null;

        const must: unknown[] = [{ range: { timestamp: { gte: config.min } } }];
        if (agentNames) must.push({ terms: { 'agent.name': agentNames } });
        const query = { bool: { must } };

        const result = await search<SearchResponse>('wazuh-alerts-4.x-*', {
            size: 0,
            query,
            aggs: {
                alerts_over_time: {
                    date_histogram: {
                        field: 'timestamp',
                        calendar_interval: config.interval,
                        min_doc_count: 0,
                        extended_bounds: { min: config.min, max: 'now' },
                    },
                    aggs: {
                        high_severity: { filter: { range: { 'rule.level': { gte: 7 } } } },
                        critical: { filter: { range: { 'rule.level': { gte: 12 } } } },
                    },
                },
            },
        });

        const buckets = result?.aggregations?.alerts_over_time?.buckets ?? [];
        const trend = buckets.slice(-config.count).map((b) => {
            const date = b.key_as_string ? new Date(b.key_as_string) : null;
            const label = date
                ? config.interval === 'hour'
                    ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—';
            return { label, alerts: b.doc_count ?? 0, incidents: b.high_severity?.doc_count ?? 0, critical: b.critical?.doc_count ?? 0 };
        });

        res.json(trend);
    } catch {
        res.status(502).json([]);
    }
});

// GET /api/wazuh/attack-origins
router.get('/attack-origins', async (req, res) => {
    interface Bucket { key: string; doc_count: number; top_groups?: { buckets?: { key: string }[] } }
    interface SearchResponse { aggregations?: { top_countries?: { buckets?: Bucket[] } } }

    // Excludes RFC1918 / loopback / link-local so internal agent-to-agent traffic
    // never shows up disguised as an "attack".
    const PRIVATE_PREFIXES = [
        '10.', '127.', '192.168.', '169.254.',
        ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.`),
    ];

    const NAME_TO_ISO: Record<string, string> = {
        'United States': 'US', 'United Kingdom': 'GB', 'China': 'CN', 'Russia': 'RU',
        'Germany': 'DE', 'Netherlands': 'NL', 'France': 'FR', 'Brazil': 'BR', 'India': 'IN',
        'Ukraine': 'UA', 'South Korea': 'KR', 'Indonesia': 'ID', 'Japan': 'JP', 'Vietnam': 'VN',
        'Poland': 'PL', 'Romania': 'RO', 'Turkey': 'TR', 'Iran': 'IR', 'Singapore': 'SG',
        'Hong Kong': 'HK', 'Taiwan': 'TW', 'Mexico': 'MX', 'Italy': 'IT', 'Spain': 'ES',
        'Sweden': 'SE', 'Switzerland': 'CH', 'Australia': 'AU', 'South Africa': 'ZA',
        'Nigeria': 'NG', 'Egypt': 'EG', 'Israel': 'IL', 'Thailand': 'TH', 'Malaysia': 'MY',
        'Philippines': 'PH', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Argentina': 'AR',
        'Colombia': 'CO', 'Chile': 'CL', 'Belgium': 'BE', 'Austria': 'AT', 'Czechia': 'CZ',
        'Czech Republic': 'CZ', 'Portugal': 'PT', 'Ireland': 'IE', 'Norway': 'NO', 'Denmark': 'DK',
        'Finland': 'FI', 'Greece': 'GR', 'Hungary': 'HU', 'Bulgaria': 'BG', 'Moldova': 'MD',
        'Belarus': 'BY', 'Kazakhstan': 'KZ', 'Uzbekistan': 'UZ', 'Iraq': 'IQ', 'Saudi Arabia': 'SA',
        'United Arab Emirates': 'AE', 'Morocco': 'MA', 'Algeria': 'DZ', 'Kenya': 'KE',
        'Venezuela': 'VE', 'Peru': 'PE', 'Ecuador': 'EC', 'Panama': 'PA', 'Costa Rica': 'CR',
        'Cuba': 'CU', 'Lithuania': 'LT', 'Latvia': 'LV', 'Estonia': 'EE', 'Slovakia': 'SK',
        'Slovenia': 'SI', 'Croatia': 'HR', 'Serbia': 'RS', 'Canada': 'CA', 'New Zealand': 'NZ',
    };

    const isoCode = (countryName: string): string => NAME_TO_ISO[countryName] ?? countryName.slice(0, 2).toUpperCase();

    // Classifies the dominant attack pattern for a country's alerts from the
    // rule.groups Wazuh itself assigned, rather than guessing from the description text.
    const classify = (groups: string[]): string => {
        const set = new Set(groups);
        if (set.has('sshd') || set.has('authentication_failed') || set.has('invalid_login')) return 'Brute Force';
        if (set.has('web') || set.has('attack') || set.has('sqlinjection') || set.has('xss')) return 'Web Attack';
        if (set.has('recon') || set.has('nmap') || set.has('portscan') || set.has('scan')) return 'Scanning';
        if (set.has('malware') || set.has('virus') || set.has('rootkit')) return 'Malware';
        if (set.has('firewall') || set.has('ids') || set.has('firewall_drop')) return 'Intrusion Attempt';
        return 'Suspicious Activity';
    };

    try {
        const group = groupParam(req);
        const agentNames = group ? await getAgentNamesForGroup(group) : null;

        const must: unknown[] = [{ exists: { field: 'data.srcip' } }, { range: { timestamp: { gte: 'now-24h' } } }];
        if (agentNames) must.push({ terms: { 'agent.name': agentNames } });

        const result = await search<SearchResponse>('wazuh-alerts-4.x-*', {
            size: 0,
            query: { bool: { must, must_not: PRIVATE_PREFIXES.map((p) => ({ prefix: { 'data.srcip': p } })) } },
            aggs: {
                top_countries: {
                    terms: { field: 'GeoLocation.country_name', size: 5 },
                    aggs: { top_groups: { terms: { field: 'rule.groups', size: 6 } } },
                },
            },
        });

        const buckets = result?.aggregations?.top_countries?.buckets ?? [];
        const origins = buckets.map((b) => ({
            country: isoCode(b.key),
            name: b.key,
            count: b.doc_count,
            label: classify((b.top_groups?.buckets ?? []).map((g) => g.key)),
        }));

        res.json(origins);
    } catch {
        res.status(502).json([]);
    }
});

// GET /api/wazuh/incidents
router.get('/incidents', async (req, res) => {
    interface WazuhHit {
        _id: string;
        _source: { timestamp?: string; rule?: { description?: string; level?: number; mitre?: { technique?: string[] } }; agent?: { name?: string } };
    }
    interface SearchResponse { hits?: { hits?: WazuhHit[]; total?: { value?: number } } }

    const severityFor = (level: number): 'Critical' | 'High' | 'Medium' | 'Low' =>
        level >= 12 ? 'Critical' : level >= 10 ? 'High' : level >= 7 ? 'Medium' : 'Low';
    const slaTimeFor = (level: number): string => (level >= 12 ? '00:30:00' : level >= 7 ? '02:00:00' : '06:00:00');

    const countInRange = (minLevel: number, maxLevelExclusive: number | undefined, agentNames: string[] | null) => {
        const levelRange: { gte: number; lt?: number } = { gte: minLevel };
        if (maxLevelExclusive !== undefined) levelRange.lt = maxLevelExclusive;
        const must: unknown[] = [{ range: { 'rule.level': levelRange } }, { range: { timestamp: { gte: 'now-7d' } } }];
        if (agentNames) must.push({ terms: { 'agent.name': agentNames } });
        return search<SearchResponse>('wazuh-alerts-4.x-*', { size: 0, track_total_hits: true, query: { bool: { must } } });
    };

    try {
        const group = groupParam(req);
        const agentNames = group ? await getAgentNamesForGroup(group) : null;

        const mainMust: unknown[] = [{ range: { 'rule.level': { gte: 3 } } }, { range: { timestamp: { gte: 'now-7d' } } }];
        if (agentNames) mainMust.push({ terms: { 'agent.name': agentNames } });

        const [alertsRes, criticalRes, highRes, mediumRes, lowRes] = await Promise.allSettled([
            search<SearchResponse>('wazuh-alerts-4.x-*', {
                size: 20,
                sort: [{ 'rule.level': { order: 'desc' } }, { timestamp: { order: 'desc' } }],
                query: { bool: { must: mainMust } },
                _source: ['timestamp', 'rule.description', 'rule.level', 'rule.groups', 'agent.name', 'agent.ip', 'location', 'data.srcip', 'rule.mitre.technique'],
            }),
            countInRange(12, undefined, agentNames),
            countInRange(10, 12, agentNames),
            countInRange(7, 10, agentNames),
            countInRange(3, 7, agentNames),
        ]).then((results) => results.map((r) => (r.status === 'fulfilled' ? r.value : null)));

        const rawHits = alertsRes?.hits?.hits ?? [];
        const incidents = rawHits.map((h) => {
            const level = h._source.rule?.level ?? 0;
            return {
                id: h._id,
                severity: severityFor(level),
                name: h._source.rule?.description ?? 'Wazuh alert',
                source: 'Wazuh-Agent',
                asset: h._source.agent?.name ?? 'Unknown',
                status: 'Open' as const,
                analyst: 'Unassigned',
                slaTime: slaTimeFor(level),
                mitre: h._source.rule?.mitre?.technique?.[0] ?? 'T1059',
                timestamp: h._source.timestamp ?? null,
                level,
            };
        });

        const critical = criticalRes?.hits?.total?.value ?? 0;
        const high = highRes?.hits?.total?.value ?? 0;
        const medium = mediumRes?.hits?.total?.value ?? 0;
        const low = lowRes?.hits?.total?.value ?? 0;

        const kpis = { total: critical + high + medium + low, critical, high, medium, low, investigating: 0, escalated: 0, avgSla: '02:00:00' };

        res.json({ incidents, kpis });
    } catch {
        res.status(502).json({
            incidents: [],
            kpis: { total: 0, critical: 0, high: 0, medium: 0, low: 0, investigating: 0, escalated: 0, avgSla: '00:00:00' },
        });
    }
});

export default router;
