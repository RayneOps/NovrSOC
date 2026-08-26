// AlienVault OTX — Threat pulses, IOCs, MITRE tags
// Free, unlimited

const OTX_BASE = 'https://otx.alienvault.com/api/v1';
const KEY = process.env.OTX_API_KEY ?? '';

const otxHeaders = {
    'X-OTX-API-KEY': KEY,
    'Content-Type': 'application/json',
};

export interface OTXPulse {
    id: string;
    name: string;
    description: string;
    tags: string[];
    attack_ids: Array<{ id: string; display_name: string }>;
    malware_families: Array<{ id: string; display_name: string }>;
    created: string;
}

// Normalized shape this module exposes — flattens OTX's actual nested `pulse_info.{count,pulses}`
// response (verified against a live call; it is NOT the flat `pulse_count`/`pulses` some docs imply).
export interface OTXIndicator {
    pulse_count: number;
    pulses: OTXPulse[];
    reputation: number;
    sections: string[];
}

// Raw shape OTX's `/indicators/.../general` endpoints actually return.
interface OTXRawIndicator {
    pulse_info: { count: number; pulses: OTXPulse[] };
    reputation: number;
    sections: string[];
}

// The /general indicator endpoints aggregate GeoIP + reputation + every subscribed pulse
// server-side. In testing, the *first* request to otx.alienvault.com from a fresh process
// reliably takes 15-20s+ (cold DNS/TLS), while every request after that — reusing the warm
// keep-alive connection — comes back in well under a second. So instead of one long timeout,
// this tries a short one first and, only on that specific cold-start case, retries once with a
// longer budget; a warm connection will already exist for the retry.
async function otxFetch<T>(path: string): Promise<T | null> {
    const attempt = async (timeoutMs: number): Promise<T | null> => {
        const res = await fetch(`${OTX_BASE}${path}`, { headers: otxHeaders, signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) return null;
        return (await res.json()) as T;
    };

    try {
        return await attempt(5000);
    } catch {
        try {
            return await attempt(20000);
        } catch {
            return null;
        }
    }
}

function normalizeIndicator(raw: OTXRawIndicator | null): OTXIndicator | null {
    if (!raw) return null;
    return {
        pulse_count: raw.pulse_info?.count ?? 0,
        pulses: raw.pulse_info?.pulses ?? [],
        reputation: raw.reputation,
        sections: raw.sections,
    };
}

// Lookup an IP address
export async function otxLookupIP(ip: string): Promise<OTXIndicator | null> {
    return normalizeIndicator(await otxFetch<OTXRawIndicator>(`/indicators/IPv4/${ip}/general`));
}

// Lookup a domain
export async function otxLookupDomain(domain: string): Promise<OTXIndicator | null> {
    return normalizeIndicator(await otxFetch<OTXRawIndicator>(`/indicators/domain/${domain}/general`));
}

// Lookup a file hash (MD5 or SHA256)
export async function otxLookupHash(hash: string): Promise<OTXIndicator | null> {
    return normalizeIndicator(await otxFetch<OTXRawIndicator>(`/indicators/file/${hash}/general`));
}

// Lookup a URL
export async function otxLookupURL(url: string): Promise<OTXIndicator | null> {
    const encoded = encodeURIComponent(url);
    return normalizeIndicator(await otxFetch<OTXRawIndicator>(`/indicators/url/${encoded}/general`));
}

// Get latest threat pulses subscribed to
export async function otxGetPulses(limit = 20): Promise<OTXPulse[]> {
    const data = await otxFetch<{ results: OTXPulse[] }>(`/pulses/subscribed?limit=${limit}`);
    return data?.results ?? [];
}

// Full-text search across ALL public OTX pulses (not just this account's subscriptions) — used
// for e.g. "Nigeria threat pulses" on the Nigeria map, where the subscribed-pulses feed above
// has no reason to contain anything Nigeria-specific at all.
export async function otxSearchPulses(query: string, limit = 20): Promise<OTXPulse[]> {
    const data = await otxFetch<{ results: OTXPulse[] }>(`/search/pulses?q=${encodeURIComponent(query)}&limit=${limit}`);
    return data?.results ?? [];
}

export interface OTXPulseIndicator {
    indicator: string;
    type: string;
    created: string;
    title?: string;
    description?: string;
}

// Get IOCs from a specific pulse
export async function otxGetPulseIndicators(pulseId: string): Promise<OTXPulseIndicator[]> {
    const data = await otxFetch<{ results: OTXPulseIndicator[] }>(`/pulses/${pulseId}/indicators`);
    return data?.results ?? [];
}
