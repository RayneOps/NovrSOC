// AbuseIPDB — Malicious IP reputation scoring
// Free: 1,000 checks/day
//
// Note: backend/src/lib/scan.ts already has a lightweight AbuseIPDB call used by the existing
// URL Scan Suite. This is a separate, fuller-typed client meant for the new unified IOC
// enrichment service (services/iocEnrichment.ts) — both read the same ABUSEIPDB_API_KEY.

const ABUSE_BASE = 'https://api.abuseipdb.com/api/v2';
const KEY = process.env.ABUSEIPDB_API_KEY ?? '';

export interface AbuseIPDBReport {
    reportedAt: string;
    comment: string;
    categories: number[];
    reporterId: number;
    reporterCountryCode: string;
}

export interface AbuseIPDBResult {
    ipAddress: string;
    isPublic: boolean;
    ipVersion: number;
    isWhitelisted: boolean | null;
    abuseConfidenceScore: number; // 0-100
    countryCode: string | null;
    usageType: string | null;
    isp: string | null;
    domain: string | null;
    hostnames: string[];
    isTor: boolean;
    totalReports: number;
    numDistinctUsers: number;
    lastReportedAt: string | null;
    reports?: AbuseIPDBReport[];
}

export async function checkIP(ip: string, maxAgeInDays = 90, verbose = false): Promise<AbuseIPDBResult | null> {
    try {
        const params = new URLSearchParams({
            ipAddress: ip,
            maxAgeInDays: String(maxAgeInDays),
            ...(verbose ? { verbose: 'true' } : {}),
        });

        const res = await fetch(`${ABUSE_BASE}/check?${params}`, {
            headers: { Key: KEY, Accept: 'application/json' },
            signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.data as AbuseIPDBResult;
    } catch {
        return null;
    }
}

function isPrivateIP(ip: string): boolean {
    return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1)/.test(ip);
}

// Check multiple IPs — loops individually with a small delay to respect the free-tier rate limit.
export async function checkIPBulk(ips: string[]): Promise<Map<string, AbuseIPDBResult>> {
    const results = new Map<string, AbuseIPDBResult>();
    const unique = [...new Set(ips)].filter((ip) => !isPrivateIP(ip));

    for (const ip of unique) {
        const result = await checkIP(ip);
        if (result) results.set(ip, result);
        await new Promise((r) => setTimeout(r, 100));
    }

    return results;
}

// Field names verified live against a real populated block (a Tor exit /24) — check-block's
// per-IP shape is genuinely different from check's (numReports/mostRecentReport here vs.
// totalReports/lastReportedAt on AbuseIPDBResult above).
export interface AbuseIPDBBlockReport {
    ipAddress: string;
    countryCode: string | null;
    abuseConfidenceScore: number;
    numReports: number;
    mostRecentReport: string | null;
}

// Check every reported IP within a CIDR block. Note: AbuseIPDB's check-block endpoint takes a
// CIDR network (e.g. '197.210.240.0/24'), NOT an ASN — `network=AS29465` 422s with "Invalid
// CIDR format" (verified live). To check a whole ASN, resolve one of its announced prefixes
// via RIPE Stat first (services/ripeStat.ts's lookupASN) and pass that prefix here.
export async function checkBlock(cidr: string, maxAgeInDays = 30): Promise<AbuseIPDBBlockReport[]> {
    try {
        const params = new URLSearchParams({ network: cidr, maxAgeInDays: String(maxAgeInDays) });
        const res = await fetch(`${ABUSE_BASE}/check-block?${params}`, {
            headers: { Key: KEY, Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data?.data?.reportedAddress ?? []) as AbuseIPDBBlockReport[];
    } catch {
        return [];
    }
}

// Report a malicious IP
export async function reportIP(ip: string, categories: number[], comment: string): Promise<boolean> {
    try {
        const body = new URLSearchParams({ ip, categories: categories.join(','), comment });

        const res = await fetch(`${ABUSE_BASE}/report`, {
            method: 'POST',
            headers: { Key: KEY, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            signal: AbortSignal.timeout(6000),
        });

        return res.ok;
    } catch {
        return false;
    }
}

// AbuseIPDB category codes reference
export const ABUSE_CATEGORIES: Record<number, string> = {
    3: 'Fraud Orders',
    4: 'DDOS Attack',
    5: 'FTP Brute-Force',
    6: 'Ping of Death',
    7: 'Phishing',
    8: 'Fraud VoIP',
    9: 'Open Proxy',
    10: 'Web Spam',
    11: 'Email Spam',
    14: 'Port Scan',
    15: 'Hacking',
    16: 'SQL Injection',
    17: 'Spoofing',
    18: 'Brute-Force',
    19: 'Bad Web Bot',
    20: 'Exploited Host',
    21: 'Web App Attack',
    22: 'SSH',
    23: 'IoT Targeted',
};
