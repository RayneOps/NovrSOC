import { search } from './wazuh-indexer';

// Shared in-memory org CTI store — used by both routes/orgCTI.ts and jobs/ctiWatcher.ts.
// Replace with Supabase once a real schema exists (see routes/orgCTI.ts's header comment);
// this deliberately mirrors routes/threatManagement.ts's existing "module-level mutable
// cache, live until process restart" pattern rather than inventing a new persistence style.
//
// Correctness note vs. the original spec for this feature: a naive version of this re-derives
// "seen_count"/"first_seen" from whatever the last N Wazuh alerts happen to be on every GET
// request. That both undercounts (an IOC seen 200 alerts ago silently drops off once size=100
// only covers the newest 100) and double-counts (two GETs a minute apart re-ingest overlapping
// alert windows). Fixed here with a persistent accumulator plus a moving "last synced" cursor
// that only advances on a successful indexer query — both the periodic watcher and an
// on-demand GET both call the same syncWazuhIOCs(), so repeated calls never re-ingest the same
// alerts twice.

export interface OrgIOC {
    id: string;
    org_id: string;
    value: string;
    type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
    source: 'wazuh' | 'analyst' | 'shared' | 'feed';
    first_seen: string;
    last_seen: string;
    seen_count: number;
    risk_score: number;
    verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown';
    tags: string[];
    notes: string;
    shared: boolean;
    mitre_tactic: string | null;
    alert_ids: string[];
    added_by: string;
}

interface IndexerAlertHit {
    _source?: {
        timestamp?: string;
        rule?: { level?: number; description?: string; groups?: string[] };
        agent?: { name?: string };
        data?: { srcip?: string };
    };
}
interface IndexerSearchResponse {
    hits?: { hits?: IndexerAlertHit[] };
}

const PRIVATE_IP_RE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/;

function verdictForLevel(level: number): OrgIOC['verdict'] {
    if (level >= 12) return 'malicious';
    if (level >= 6) return 'suspicious';
    return 'unknown';
}

// ── WAZUH-SOURCED IOC ACCUMULATOR ──────────────────────────────────────────

interface AccumulatedIp {
    count: number;
    firstSeenTs: string;
    lastSeenTs: string;
    maxLevel: number;
    latestRule: string;
    latestAgent: string;
}
const wazuhAccumulator = new Map<string, AccumulatedIp>();
let lastSyncTs = new Date(Date.now() - 5 * 60 * 1000).toISOString();
let totalAlertsIngested = 0;

function ingestAlertHits(hits: IndexerAlertHit[]): number {
    let newIps = 0;
    for (const hit of hits) {
        const src = hit._source;
        const ip = src?.data?.srcip;
        if (!ip || PRIVATE_IP_RE.test(ip)) continue;

        const ts = src?.timestamp || new Date().toISOString();
        const level = src?.rule?.level ?? 0;
        const existing = wazuhAccumulator.get(ip);
        if (existing) {
            existing.count++;
            if (ts < existing.firstSeenTs) existing.firstSeenTs = ts;
            if (ts > existing.lastSeenTs) existing.lastSeenTs = ts;
            if (level >= existing.maxLevel) {
                existing.maxLevel = level;
                existing.latestRule = src?.rule?.description || existing.latestRule;
            }
            existing.latestAgent = src?.agent?.name || existing.latestAgent;
        } else {
            wazuhAccumulator.set(ip, {
                count: 1, firstSeenTs: ts, lastSeenTs: ts, maxLevel: level,
                latestRule: src?.rule?.description || '', latestAgent: src?.agent?.name || '',
            });
            newIps++;
        }
    }
    totalAlertsIngested += hits.length;
    return newIps;
}

/** Pull alerts since the last successful sync and fold new external IPs into the accumulator. */
export async function syncWazuhIOCs(size = 100): Promise<{ newIps: number; hitCount: number }> {
    const since = lastSyncTs;
    const result = await search<IndexerSearchResponse>('wazuh-alerts-4.x-*', {
        size,
        sort: [{ timestamp: { order: 'desc' } }],
        query: { range: { timestamp: { gte: since } } },
        _source: ['timestamp', 'data.srcip', 'rule.level', 'rule.description', 'rule.groups', 'agent.name'],
    });
    // Only advance the cursor on a successful query — a thrown/failed request (indexer down,
    // not configured) should retry the same window next time rather than silently skip it.
    lastSyncTs = new Date().toISOString();

    const hits = result?.hits?.hits ?? [];
    const newIps = ingestAlertHits(hits);
    return { newIps, hitCount: hits.length };
}

export function wazuhIOCsForOrg(orgId: string): OrgIOC[] {
    return [...wazuhAccumulator.entries()].map(([ip, d]) => ({
        id: `wazuh-${ip.replace(/\./g, '-')}`,
        org_id: orgId,
        value: ip,
        type: 'ip',
        source: 'wazuh',
        first_seen: d.firstSeenTs,
        last_seen: d.lastSeenTs,
        seen_count: d.count,
        risk_score: Math.min(d.maxLevel * 6, 100),
        verdict: verdictForLevel(d.maxLevel),
        tags: [d.latestRule].filter(Boolean),
        notes: `Seen on agent: ${d.latestAgent}`,
        shared: false,
        mitre_tactic: null,
        alert_ids: [],
        added_by: 'wazuh-auto',
    }));
}

export function watcherStats() {
    return { tracked_ips: wazuhAccumulator.size, total_alerts_ingested: totalAlertsIngested, last_synced: lastSyncTs };
}

// ── MANUAL / ANALYST-ADDED IOC STORE ───────────────────────────────────────

const manualIOCStore = new Map<string, OrgIOC[]>();

export function getManualIOCs(orgId: string): OrgIOC[] {
    return manualIOCStore.get(orgId) ?? [];
}
export function addManualIOC(orgId: string, ioc: OrgIOC): void {
    manualIOCStore.set(orgId, [...(manualIOCStore.get(orgId) ?? []), ioc]);
}
export function removeManualIOC(orgId: string, iocId: string): boolean {
    const existing = manualIOCStore.get(orgId);
    if (!existing) return false;
    const next = existing.filter((i) => i.id !== iocId);
    manualIOCStore.set(orgId, next);
    return next.length !== existing.length;
}
export function updateManualIOC(orgId: string, iocId: string, patch: Partial<OrgIOC>): OrgIOC | null {
    const existing = manualIOCStore.get(orgId);
    if (!existing) return null;
    let updated: OrgIOC | null = null;
    const next = existing.map((i) => {
        if (i.id !== iocId) return i;
        updated = { ...i, ...patch };
        return updated;
    });
    if (updated) manualIOCStore.set(orgId, next);
    return updated;
}
/** Every analyst-added IOC across every org that's been marked shared — used by GET /shared. */
export function allSharedManualIOCs(): OrgIOC[] {
    return [...manualIOCStore.values()].flat().filter((i) => i.shared);
}
export function orgCount(): number {
    return manualIOCStore.size;
}
