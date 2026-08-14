// NVD (NIST National Vulnerability Database) — CVE data with CVSS scores
// Free: 50 req/30sec with key (5 without key)

const NVD_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const KEY = process.env.NVD_API_KEY ?? '';

export interface CVSSData {
    version: string;
    vectorString: string;
    baseScore: number;
    baseSeverity: string;
    attackVector: string;
    attackComplexity: string;
    privilegesRequired: string;
    userInteraction: string;
    scope: string;
    confidentialityImpact: string;
    integrityImpact: string;
    availabilityImpact: string;
}

export interface CVEItem {
    id: string;
    sourceIdentifier: string;
    published: string;
    lastModified: string;
    vulnStatus: string;
    descriptions: Array<{ lang: string; value: string }>;
    metrics: {
        cvssMetricV31?: Array<{ source: string; type: string; cvssData: CVSSData; exploitabilityScore: number; impactScore: number }>;
        cvssMetricV2?: Array<{ cvssData: { baseScore: number; vectorString: string }; baseSeverity: string }>;
    };
    weaknesses: Array<{ source: string; description: Array<{ lang: string; value: string }> }>;
    configurations: unknown[];
    references: Array<{ url: string; source: string; tags?: string[] }>;
}

export interface NVDResponse {
    totalResults: number;
    resultsPerPage: number;
    startIndex: number;
    vulnerabilities: Array<{ cve: CVEItem }>;
}

let keyKnownBad = false;

async function nvdFetch(params: URLSearchParams, timeoutMs = 15000): Promise<NVDResponse | null> {
    try {
        // NVD 404s the whole request on an invalid apiKey header (not 401/403), so a bad key
        // looks identical to "not found" — once that happens, stop sending it and fall back to
        // the unauthenticated tier (5 req/30s instead of 50) rather than failing every call.
        const useKey = KEY && !keyKnownBad;
        const res = await fetch(`${NVD_BASE}?${params}`, {
            headers: useKey ? { apiKey: KEY } : {},
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) {
            if (useKey && res.status === 404) {
                keyKnownBad = true;
                console.warn('[NVD] apiKey rejected (404) — falling back to unauthenticated requests for the rest of this process.');
                return nvdFetch(params, timeoutMs);
            }
            return null;
        }
        return (await res.json()) as NVDResponse;
    } catch {
        return null;
    }
}

// Search CVEs by CPE string (software identifier)
export async function getCVEsByCPE(cpeString: string): Promise<CVEItem[]> {
    const data = await nvdFetch(new URLSearchParams({ cpeName: cpeString, resultsPerPage: '20' }));
    return data?.vulnerabilities.map((v) => v.cve) ?? [];
}

// Get CVE by ID
export async function getCVEById(cveId: string): Promise<CVEItem | null> {
    const data = await nvdFetch(new URLSearchParams({ cveId }), 10000);
    return data?.vulnerabilities[0]?.cve ?? null;
}

// Get recently published CVEs (last N days)
export async function getRecentCVEs(days = 1, severity?: string): Promise<CVEItem[]> {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
        pubStartDate: start.toISOString().split('.')[0] + '.000',
        pubEndDate: end.toISOString().split('.')[0] + '.000',
        resultsPerPage: '100',
    });
    if (severity) params.set('cvssV3Severity', severity.toUpperCase());

    const data = await nvdFetch(params);
    return data?.vulnerabilities.map((v) => v.cve) ?? [];
}

// Extract CVSS base score safely from CVE item
export function getCVSSScore(cve: CVEItem): { score: number; severity: string; version: string } {
    const v31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
    if (v31) return { score: v31.baseScore, severity: v31.baseSeverity, version: '3.1' };

    const v2 = cve.metrics?.cvssMetricV2?.[0];
    if (v2) return { score: v2.cvssData.baseScore, severity: v2.baseSeverity, version: '2.0' };

    return { score: 0, severity: 'UNKNOWN', version: 'N/A' };
}

// Get description in English
export function getCVEDescription(cve: CVEItem): string {
    return cve.descriptions.find((d) => d.lang === 'en')?.value ?? 'No description available';
}
