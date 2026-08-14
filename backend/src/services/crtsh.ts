// crt.sh — Certificate Transparency log monitoring
// Free, no key needed

const CRTSH_BASE = 'https://crt.sh';

export interface CertEntry {
    id: number;
    logged_at: string;
    not_before: string;
    not_after: string;
    common_name: string;
    matching_identities: string;
    issuer_name: string;
}

// Search CT logs for brand string matches
export async function searchCTLogs(brandString: string): Promise<CertEntry[]> {
    try {
        const params = new URLSearchParams({ q: `%.${brandString}`, output: 'json' });

        const res = await fetch(`${CRTSH_BASE}/?${params}`, {
            signal: AbortSignal.timeout(15000),
            headers: { Accept: 'application/json' },
        });

        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? (data as CertEntry[]) : [];
    } catch {
        return [];
    }
}

// Check for suspicious certs (brand in cert, but not on an official domain)
export function filterSuspiciousCerts(certs: CertEntry[], officialDomains: string[]): CertEntry[] {
    return certs.filter((cert) => {
        const cn = cert.common_name.toLowerCase();
        return !officialDomains.some((d) => cn === d.toLowerCase() || cn.endsWith(`.${d.toLowerCase()}`));
    });
}
