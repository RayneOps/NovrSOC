// Censys — free tier (250 queries/month), replaces Shodan for network exposure lookups.
// No credentials configured in this environment (CENSYS_API_ID/CENSYS_API_SECRET aren't set),
// so this could only be verified for correct request shape and graceful "not configured"
// behavior, not a real live response — matches the "add when you get the keys" situation this
// task itself describes for Censys/GreyNoise's paid tier/PhishTank's key.

function getCredentials(): { apiId: string; apiSecret: string } | null {
    const apiId = process.env.CENSYS_API_ID;
    const apiSecret = process.env.CENSYS_API_SECRET;
    if (!apiId || !apiSecret || apiId === 'REPLACE_WHEN_OBTAINED' || apiSecret === 'REPLACE_WHEN_OBTAINED') return null;
    return { apiId, apiSecret };
}

export interface CensysSearchResult {
    results: unknown[];
    total: number;
    source: string;
    error?: string;
}

export async function searchCensys(query: string): Promise<CensysSearchResult> {
    const creds = getCredentials();
    if (!creds) return { results: [], total: 0, source: 'censys', error: 'not configured' };

    try {
        const credentials = Buffer.from(`${creds.apiId}:${creds.apiSecret}`).toString('base64');
        const r = await fetch('https://search.censys.io/api/v2/hosts/search', {
            method: 'POST',
            headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query, per_page: 10 }),
            signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) return { results: [], total: 0, source: 'censys', error: `HTTP ${r.status}` };
        const data = await r.json();
        return { results: data.result?.hits || [], total: data.result?.total?.value || 0, source: 'censys' };
    } catch (err) {
        return { results: [], total: 0, source: 'censys', error: err instanceof Error ? err.message : 'unreachable' };
    }
}

export async function getCensysHost(ip: string): Promise<unknown | null> {
    const creds = getCredentials();
    if (!creds) return null;

    try {
        const credentials = Buffer.from(`${creds.apiId}:${creds.apiSecret}`).toString('base64');
        const r = await fetch(`https://search.censys.io/api/v2/hosts/${encodeURIComponent(ip)}`, {
            headers: { Authorization: `Basic ${credentials}` },
            signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) return null;
        return await r.json();
    } catch {
        return null;
    }
}

export function isConfigured(): boolean {
    return !!getCredentials();
}
