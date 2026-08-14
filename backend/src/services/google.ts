// Google Cloud APIs — Custom Search, Safe Browsing, Cloud Vision
// All three use the same key (GOOGLE_API_KEY), duplicated into per-service env vars so each
// checker can be swapped independently later. Custom Search additionally needs GOOGLE_SEARCH_CX.

function getKey(): string | null {
    const key = process.env.GOOGLE_API_KEY || process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_VISION_API_KEY;
    if (!key || key === 'REPLACE_WHEN_OBTAINED') return null;
    return key;
}

function getCX(): string | null {
    const cx = process.env.GOOGLE_SEARCH_CX;
    if (!cx || cx === 'REPLACE_WHEN_OBTAINED') return null;
    return cx;
}

// ── CUSTOM SEARCH ─────────────────────────────────────────────────

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    domain: string;
    date?: string | null;
}

export interface SearchResponse {
    query: string;
    total_results: number;
    results: SearchResult[];
    search_time_ms: number;
}

interface CSEItem {
    title: string;
    link: string;
    snippet: string;
    pagemap?: { metatags?: Array<Record<string, string>> };
}
interface CSEResponse {
    searchInformation?: { totalResults?: string };
    items?: CSEItem[];
}

async function executeSearch(query: string): Promise<SearchResponse | null> {
    const key = getKey();
    const cx = getCX();
    if (!key || !cx) return null;

    try {
        const startTime = Date.now();
        const params = new URLSearchParams({ key, cx, q: query, num: '10' });

        const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, { signal: AbortSignal.timeout(10000) });

        if (res.status === 429) {
            console.warn('[Google Search] Rate limited — 100 queries/day on free tier');
            return null;
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('[Google Search] Error:', res.status, err);
            return null;
        }

        const data = (await res.json()) as CSEResponse;
        const elapsed = Date.now() - startTime;

        return {
            query,
            total_results: parseInt(data.searchInformation?.totalResults || '0', 10),
            search_time_ms: elapsed,
            results: (data.items || []).map((item) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                domain: new URL(item.link).hostname,
                date: item.pagemap?.metatags?.[0]?.['og:updated_time'] ?? null,
            })),
        };
    } catch (err) {
        console.warn('[Google Search] Request failed:', err);
        return null;
    }
}

// Brand monitoring search — finds web mentions of a brand, excluding its own official domains
export async function searchBrandMentions(brandName: string, officialDomains: string[] = [], modifiers = ''): Promise<SearchResponse | null> {
    const exclusions = officialDomains.map((d) => `-site:${d}`).join(' ');
    const query = `"${brandName}" ${exclusions} ${modifiers}`.trim();
    return executeSearch(query);
}

// Search for counterfeit/phishing storefronts impersonating the brand
export async function searchCounterfeitSites(brandName: string, officialDomains: string[] = []): Promise<SearchResponse | null> {
    const exclusions = officialDomains.map((d) => `-site:${d}`).join(' ');
    const query = `"${brandName}" (replica OR fake OR discount OR "official store" OR phishing) ${exclusions}`;
    return executeSearch(query);
}

// General web search
export async function searchWeb(query: string): Promise<SearchResponse | null> {
    return executeSearch(query);
}

// ── SAFE BROWSING ─────────────────────────────────────────────────

export interface SafeBrowsingResult {
    url: string;
    is_safe: boolean;
    threat_type?: string;
    platform?: string;
}

interface GSBMatch {
    threatType: string;
    platformType: string;
    threat: { url: string };
}
interface GSBResponse {
    matches?: GSBMatch[];
}

function getSafeBrowsingKey(): string | null {
    const key = process.env.GOOGLE_SAFE_BROWSING_KEY || process.env.GOOGLE_API_KEY;
    if (!key || key === 'REPLACE_WHEN_OBTAINED') return null;
    return key;
}

export async function checkURLSafety(url: string): Promise<SafeBrowsingResult> {
    const key = getSafeBrowsingKey();
    if (!key) return { url, is_safe: true }; // assume safe if not configured

    try {
        const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client: { clientId: 'novrsoc', clientVersion: '1.0' },
                threatInfo: {
                    threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
                    platformTypes: ['ANY_PLATFORM'],
                    threatEntryTypes: ['URL'],
                    threatEntries: [{ url }],
                },
            }),
            signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) return { url, is_safe: true };

        const data = (await res.json()) as GSBResponse;
        const match = data.matches?.[0];

        return { url, is_safe: !match, threat_type: match?.threatType, platform: match?.platformType };
    } catch {
        return { url, is_safe: true }; // assume safe on error
    }
}

// Batch URL safety check
export async function checkURLsSafety(urls: string[]): Promise<SafeBrowsingResult[]> {
    const key = getSafeBrowsingKey();
    if (!key) return urls.map((url) => ({ url, is_safe: true }));

    try {
        const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client: { clientId: 'novrsoc', clientVersion: '1.0' },
                threatInfo: {
                    threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
                    platformTypes: ['ANY_PLATFORM'],
                    threatEntryTypes: ['URL'],
                    threatEntries: urls.map((url) => ({ url })),
                },
            }),
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return urls.map((url) => ({ url, is_safe: true }));

        const data = (await res.json()) as GSBResponse;
        const matches = data.matches || [];
        const matchedURLs = new Set(matches.map((m) => m.threat.url));

        return urls.map((url) => ({
            url,
            is_safe: !matchedURLs.has(url),
            threat_type: matches.find((m) => m.threat.url === url)?.threatType,
        }));
    } catch {
        return urls.map((url) => ({ url, is_safe: true }));
    }
}

// ── CLOUD VISION ──────────────────────────────────────────────────

export interface VisionLogoResult {
    description: string; // logo name detected
    score: number; // 0-1 confidence
    topicality: number;
}

export interface VisionTextResult {
    text: string; // full detected text
    words: string[]; // individual words
}

export interface VisionResult {
    logos: VisionLogoResult[];
    text: VisionTextResult | null;
    safe: boolean; // safe search verdict
}

interface VisionRawResponse {
    responses?: Array<{
        logoAnnotations?: Array<{ description: string; score: number; topicality: number }>;
        textAnnotations?: Array<{ description: string }>;
        safeSearchAnnotation?: { adult?: string; violence?: string };
    }>;
}

function getVisionKey(): string | null {
    const key = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key || key === 'REPLACE_WHEN_OBTAINED') return null;
    return key;
}

export async function analyzeImage(imageUrl: string): Promise<VisionResult | null> {
    const key = getVisionKey();
    if (!key) return null;

    try {
        const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: { source: { imageUri: imageUrl } },
                    features: [
                        { type: 'LOGO_DETECTION', maxResults: 10 },
                        { type: 'TEXT_DETECTION', maxResults: 1 },
                        { type: 'SAFE_SEARCH_DETECTION' },
                    ],
                }],
            }),
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return null;

        const data = (await res.json()) as VisionRawResponse;
        const response = data.responses?.[0];
        if (!response) return null;

        const logos: VisionLogoResult[] = (response.logoAnnotations || []).map((l) => ({
            description: l.description,
            score: l.score,
            topicality: l.topicality,
        }));

        const fullText = response.textAnnotations?.[0]?.description || '';

        const safeSearch = response.safeSearchAnnotation || {};
        const isSafe = !['LIKELY', 'VERY_LIKELY'].includes(safeSearch.adult ?? '') && !['LIKELY', 'VERY_LIKELY'].includes(safeSearch.violence ?? '');

        return {
            logos,
            text: fullText ? { text: fullText, words: fullText.split(/\s+/).filter(Boolean) } : null,
            safe: isSafe,
        };
    } catch {
        return null;
    }
}

// Check if an image contains a specific brand's logo
export async function detectBrandLogo(imageUrl: string, brandName: string): Promise<{ detected: boolean; confidence: number }> {
    const result = await analyzeImage(imageUrl);
    if (!result) return { detected: false, confidence: 0 };

    const match = result.logos.find((l) => l.description.toLowerCase().includes(brandName.toLowerCase()));

    return { detected: !!match, confidence: match?.score || 0 };
}

export function isConfigured(): boolean {
    return !!(getKey() && getCX());
}

export function isSafeBrowsingConfigured(): boolean {
    return !!getSafeBrowsingKey();
}

export function isVisionConfigured(): boolean {
    return !!getVisionKey();
}
