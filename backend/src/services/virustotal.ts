// VirusTotal API v3 — checks IPs, domains, hashes, URLs against 70+ AV engines
// Free tier: 4 req/min, 500/day
// Key: set VIRUSTOTAL_API_KEY in .env

const VT_BASE = 'https://www.virustotal.com/api/v3';

function getKey(): string | null {
    const key = process.env.VIRUSTOTAL_API_KEY;
    if (!key || key === 'REPLACE_WHEN_OBTAINED') return null;
    return key;
}

export interface VTStats {
    malicious: number;
    suspicious: number;
    undetected: number;
    harmless: number;
    timeout: number;
}

export interface VTResult {
    id: string;
    type: string;
    stats: VTStats;
    verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown';
    country?: string;
    asn?: number;
    as_owner?: string;
    reputation?: number;
    tags?: string[];
    last_analysis_date?: number;
}

interface VTRawResponse {
    data?: {
        id: string;
        attributes?: {
            last_analysis_stats?: VTStats;
            country?: string;
            asn?: number;
            as_owner?: string;
            reputation?: number;
            tags?: string[];
            last_analysis_date?: number;
        };
    };
}

async function vtFetch(path: string): Promise<VTRawResponse | null> {
    const key = getKey();
    if (!key) {
        console.warn('[VirusTotal] API key not configured — skipping');
        return null;
    }

    try {
        const res = await fetch(`${VT_BASE}${path}`, {
            headers: { 'x-apikey': key, Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
        });

        if (res.status === 429) {
            console.warn('[VirusTotal] Rate limited — free tier is 4 req/min');
            return null;
        }
        if (!res.ok) {
            console.warn(`[VirusTotal] HTTP ${res.status} for ${path}`);
            return null;
        }
        return (await res.json()) as VTRawResponse;
    } catch (err) {
        console.warn('[VirusTotal] Request failed:', err);
        return null;
    }
}

function parseVTResult(data: VTRawResponse | null, type: string): VTResult | null {
    if (!data?.data?.attributes) return null;

    const attrs = data.data.attributes;
    const stats: VTStats = attrs.last_analysis_stats || { malicious: 0, suspicious: 0, undetected: 0, harmless: 0, timeout: 0 };

    const verdict: VTResult['verdict'] =
        stats.malicious >= 3 ? 'malicious' :
        stats.suspicious >= 3 ? 'suspicious' :
        stats.malicious >= 1 ? 'suspicious' : 'clean';

    return {
        id: data.data.id,
        type,
        stats,
        verdict,
        country: attrs.country,
        asn: attrs.asn,
        as_owner: attrs.as_owner,
        reputation: attrs.reputation,
        tags: attrs.tags || [],
        last_analysis_date: attrs.last_analysis_date,
    };
}

export async function vtCheckIP(ip: string): Promise<VTResult | null> {
    return parseVTResult(await vtFetch(`/ip_addresses/${ip}`), 'ip');
}

export async function vtCheckDomain(domain: string): Promise<VTResult | null> {
    return parseVTResult(await vtFetch(`/domains/${domain}`), 'domain');
}

export async function vtCheckHash(hash: string): Promise<VTResult | null> {
    return parseVTResult(await vtFetch(`/files/${hash}`), 'file');
}

export async function vtCheckURL(url: string): Promise<VTResult | null> {
    // VT URL lookup requires base64url encoding of the URL
    const encoded = Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return parseVTResult(await vtFetch(`/urls/${encoded}`), 'url');
}

// Convert VT result to a risk score contribution (0-35 points max)
export function vtToRiskScore(result: VTResult | null): number {
    if (!result) return 0;
    const total = result.stats.malicious + result.stats.suspicious + result.stats.undetected + result.stats.harmless;
    if (total === 0) return 0;

    const maliciousPct = result.stats.malicious / total;
    return Math.min(35, Math.round(maliciousPct * 35 + result.stats.malicious * 2));
}

export function isConfigured(): boolean {
    return !!getKey();
}
