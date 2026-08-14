// URLScan.io — historical URL scan data and new scan submission
// Free: 100 public scans/day
// Key: URLSCAN_API_KEY in .env

const URLSCAN_BASE = 'https://urlscan.io/api/v1';

function getKey(): string | null {
    const key = process.env.URLSCAN_API_KEY;
    if (!key || key === 'REPLACE_WHEN_OBTAINED') return null;
    return key;
}

export interface URLScanResult {
    id: string;
    url: string;
    domain: string;
    verdict: {
        overall: { score: number; categories: string[]; brands: string[]; malicious: boolean };
        urlscan: { score: number; malicious: boolean };
        community: { score: number; votes: Array<{ verdict: string; comment: string }> };
    };
    stats: {
        requests: number;
        domains: number;
        countries: number;
        ips: number;
        uniqIPs: number;
        consoleMsgs: number;
        adBlocked: number;
    };
    page: {
        domain: string;
        country: string;
        city: string;
        server: string;
        ip: string;
        mimeType: string;
        title: string;
        tlsIssuer: string;
        tlsValidFrom: string;
        tlsValidDays: number;
    };
    screenshot: string;
    task: { uuid: string; time: string; url: string };
}

export interface URLScanSearchHit {
    id: string;
    url: string;
    domain: string;
    time: string;
    score: number;
    malicious: boolean;
    screenshot: string;
}

export interface URLScanSearchResult {
    query: string;
    results: URLScanSearchHit[];
    total: number;
}

interface RawSearchHit {
    _id: string;
    page?: { url?: string; domain?: string };
    task?: { time?: string };
    verdicts?: { overall?: { score?: number; malicious?: boolean } };
    screenshot?: string;
}
interface RawSearchResponse {
    total?: number;
    results?: RawSearchHit[];
}

function parseSearchResults(data: RawSearchResponse, query: string, fallbackDomain: string): URLScanSearchResult {
    return {
        query,
        total: data.total || 0,
        results: (data.results || []).map((r) => ({
            id: r._id,
            url: r.page?.url || query,
            domain: r.page?.domain || fallbackDomain,
            time: r.task?.time || '',
            score: r.verdicts?.overall?.score || 0,
            malicious: r.verdicts?.overall?.malicious || false,
            screenshot: r.screenshot || '',
        })),
    };
}

// Search existing scans for a URL (no quota used)
export async function searchURL(url: string): Promise<URLScanSearchResult | null> {
    const key = getKey();
    if (!key) return null;

    try {
        const query = encodeURIComponent(`page.url:"${url}"`);
        const res = await fetch(`${URLSCAN_BASE}/search/?q=${query}&size=5`, {
            headers: { 'API-Key': key, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return null;
        const data = (await res.json()) as RawSearchResponse;
        return parseSearchResults(data, url, '');
    } catch {
        return null;
    }
}

// Search by domain
export async function searchDomain(domain: string): Promise<URLScanSearchResult | null> {
    const key = getKey();
    if (!key) return null;

    try {
        const query = encodeURIComponent(`page.domain:${domain}`);
        const res = await fetch(`${URLSCAN_BASE}/search/?q=${query}&size=10`, {
            headers: { 'API-Key': key },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return null;
        const data = (await res.json()) as RawSearchResponse;
        return parseSearchResults(data, domain, domain);
    } catch {
        return null;
    }
}

// Submit new URL for scanning
export async function submitScan(url: string, isPrivate = true): Promise<{ uuid: string; result_url: string } | null> {
    const key = getKey();
    if (!key) return null;

    try {
        const res = await fetch(`${URLSCAN_BASE}/scan/`, {
            method: 'POST',
            headers: { 'API-Key': key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, visibility: isPrivate ? 'private' : 'public' }),
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return null;
        const data = await res.json();
        return { uuid: data.uuid, result_url: data.result };
    } catch {
        return null;
    }
}

// Get scan result by UUID (poll after submitScan)
export async function getScanResult(uuid: string): Promise<URLScanResult | null> {
    const key = getKey();
    if (!key) return null;

    try {
        const res = await fetch(`${URLSCAN_BASE}/result/${uuid}/`, {
            headers: { 'API-Key': key },
            signal: AbortSignal.timeout(10000),
        });

        // 404 means scan still processing
        if (res.status === 404) return null;
        if (!res.ok) return null;

        return (await res.json()) as URLScanResult;
    } catch {
        return null;
    }
}

export function isConfigured(): boolean {
    return !!getKey();
}
