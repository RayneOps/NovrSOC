// GreyNoise — free "is this IP mass-scanning the internet" context, no key required for the
// Community tier. Verified live (both a benign and a known-scanner-ish IP): the community
// endpoint (api.greynoise.io/v3/community/{ip}) returns a real JSON body — {ip, noise, riot,
// message} — on both 200 and 404 status codes; a 404 here means "not observed", not "endpoint
// missing", so the body is parsed either way rather than discarded on non-200.

export interface GreyNoiseResult {
    noise: boolean; // actively scanning/crawling the internet (mass-scanner, not necessarily malicious)
    riot: boolean; // a known-benign business service (CDN, cloud provider, etc.)
    classification: 'malicious' | 'benign' | 'unknown';
    name?: string;
    tags?: string[];
    source: string;
    error?: string;
}

export async function checkGreyNoise(ip: string): Promise<GreyNoiseResult> {
    const apiKey = process.env.GREYNOISE_API_KEY;

    if (!apiKey) {
        try {
            const r = await fetch(`https://api.greynoise.io/v3/community/${encodeURIComponent(ip)}`, {
                signal: AbortSignal.timeout(6000),
            });
            let data: { noise?: boolean; riot?: boolean; classification?: string; name?: string; message?: string };
            try {
                data = await r.json();
            } catch {
                return { noise: false, riot: false, classification: 'unknown', source: 'greynoise', error: `HTTP ${r.status}, non-JSON response` };
            }
            const classification = data.classification === 'malicious' || data.classification === 'benign' ? data.classification : 'unknown';
            return { noise: !!data.noise, riot: !!data.riot, classification, name: data.name, source: 'greynoise' };
        } catch (err) {
            return { noise: false, riot: false, classification: 'unknown', source: 'greynoise', error: err instanceof Error ? err.message : 'unreachable' };
        }
    }

    try {
        const r = await fetch(`https://api.greynoise.io/v2/noise/context/${encodeURIComponent(ip)}`, {
            headers: { key: apiKey },
            signal: AbortSignal.timeout(6000),
        });
        if (!r.ok) return { noise: false, riot: false, classification: 'unknown', source: 'greynoise', error: `HTTP ${r.status}` };
        const data = await r.json();
        const classification = data.classification === 'malicious' || data.classification === 'benign' ? data.classification : 'unknown';
        return { noise: !!data.seen, riot: !!data.riot, classification, name: data.name, tags: data.tags || [], source: 'greynoise' };
    } catch (err) {
        return { noise: false, riot: false, classification: 'unknown', source: 'greynoise', error: err instanceof Error ? err.message : 'unreachable' };
    }
}
