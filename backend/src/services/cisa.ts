// CISA KEV — Known Exploited Vulnerabilities catalog
// Free public URL, no key needed
// Cached in-memory, refreshed every 12 hours

const CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

export interface KEVEntry {
    cveID: string;
    vendorProject: string;
    product: string;
    vulnerabilityName: string;
    dateAdded: string;
    shortDescription: string;
    requiredAction: string;
    dueDate: string;
    knownRansomwareCampaignUse: string;
    notes: string;
}

export interface KEVCatalog {
    title: string;
    catalogVersion: string;
    dateReleased: string;
    count: number;
    vulnerabilities: KEVEntry[];
}

let kevCache: KEVCatalog | null = null;
let kevCachedAt = 0;
const KEV_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

export async function getKEVCatalog(): Promise<KEVCatalog | null> {
    const now = Date.now();
    if (kevCache && now - kevCachedAt < KEV_CACHE_TTL) {
        return kevCache;
    }

    try {
        const res = await fetch(CISA_KEV_URL, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) return kevCache; // return stale cache on failure
        kevCache = (await res.json()) as KEVCatalog;
        kevCachedAt = now;
        console.log(`[CISA KEV] Refreshed: ${kevCache.count} known exploited vulnerabilities`);
        return kevCache;
    } catch (err) {
        console.error('[CISA KEV] Fetch failed:', err);
        return kevCache; // stale cache is better than nothing
    }
}

// Check if a specific CVE is in the KEV catalog
export async function isInKEV(cveId: string): Promise<KEVEntry | null> {
    const catalog = await getKEVCatalog();
    if (!catalog) return null;
    return catalog.vulnerabilities.find((v) => v.cveID === cveId) ?? null;
}

// Check multiple CVEs at once
export async function checkMultipleKEV(cveIds: string[]): Promise<Map<string, KEVEntry>> {
    const catalog = await getKEVCatalog();
    const results = new Map<string, KEVEntry>();
    if (!catalog) return results;

    const kevMap = new Map(catalog.vulnerabilities.map((v) => [v.cveID, v]));
    for (const cveId of cveIds) {
        const entry = kevMap.get(cveId);
        if (entry) results.set(cveId, entry);
    }
    return results;
}

// Get all KEV entries for a vendor/product
export async function getKEVByVendor(vendorName: string): Promise<KEVEntry[]> {
    const catalog = await getKEVCatalog();
    if (!catalog) return [];
    const lower = vendorName.toLowerCase();
    return catalog.vulnerabilities.filter((v) => v.vendorProject.toLowerCase().includes(lower));
}
