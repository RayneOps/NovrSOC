// Serper (serper.dev) — Google Search/News results via a lightweight proxy API. Replaces
// services/google.ts's Custom Search usage for brand mentions, counterfeit sites, social
// monitoring, executive dark-web/breach-news search, and Nigerian cyber news.
//
// Requires SERPER_API_KEY (free tier: 2,500 one-time credits on signup at serper.dev, no card
// required at signup). Not currently set in this environment — every export here degrades to
// `null`/`[]` via isConfigured()/getKey() the same way services/google.ts already does, so
// callers that already handle a "not configured" branch need no changes to stay correct.
//
// Google Safe Browsing and Cloud Vision (services/google.ts's other two exports) are untouched —
// Serper has no equivalent for either, so that file keeps those responsibilities.

function getKey(): string | null {
    const key = process.env.SERPER_API_KEY;
    if (!key || key === 'REPLACE_WHEN_OBTAINED') return null;
    return key;
}

export function isConfigured(): boolean {
    return !!getKey();
}

// ── WEB SEARCH ────────────────────────────────────────────────────

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

interface SerperOrganicItem {
    title: string;
    link: string;
    snippet?: string;
    date?: string;
}
interface SerperSearchResponse {
    searchParameters?: { q?: string };
    organic?: SerperOrganicItem[];
}

async function serperPost<T>(endpoint: 'search' | 'news', body: Record<string, unknown>): Promise<T | null> {
    const key = getKey();
    if (!key) return null;

    try {
        const res = await fetch(`https://google.serper.dev/${endpoint}`, {
            method: 'POST',
            headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });

        if (res.status === 429) {
            console.warn('[Serper] Rate limited — out of query credits');
            return null;
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('[Serper] Error:', res.status, err);
            return null;
        }

        return (await res.json()) as T;
    } catch (err) {
        console.warn(`[Serper] ${endpoint} request failed:`, err);
        return null;
    }
}

function safeDomain(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

async function executeSearch(query: string): Promise<SearchResponse | null> {
    const startTime = Date.now();
    const data = await serperPost<SerperSearchResponse>('search', { q: query, num: 10 });
    if (!data) return null;

    const organic = data.organic || [];
    return {
        query,
        total_results: organic.length,
        search_time_ms: Date.now() - startTime,
        results: organic.map((item) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet || '',
            domain: safeDomain(item.link),
            date: item.date ?? null,
        })),
    };
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

// Dark-web / breach-news search for a specific person — used by the executive protection scan
// alongside services/breachCheck.ts's structured breach lookup. This is a plain web search
// scoped to breach/leak/paste-site phrasing, not an actual dark-web crawl (no free API does
// that) — named for what it searches for, not where it searches.
export async function searchBreachMentions(name: string, email?: string): Promise<SearchResponse | null> {
    const subject = email ? `"${name}" OR "${email}"` : `"${name}"`;
    const query = `${subject} (breach OR leaked OR "data leak" OR pastebin OR "combo list" OR dump)`;
    return executeSearch(query);
}

// General web search
export async function searchWeb(query: string): Promise<SearchResponse | null> {
    return executeSearch(query);
}

// ── NEWS SEARCH ───────────────────────────────────────────────────

export interface NewsResult {
    title: string;
    url: string;
    snippet: string;
    source: string;
    date: string | null;
}

interface SerperNewsItem {
    title: string;
    link: string;
    snippet?: string;
    source?: string;
    date?: string;
}
interface SerperNewsResponse {
    news?: SerperNewsItem[];
}

async function executeNewsSearch(query: string, num = 10): Promise<NewsResult[]> {
    const data = await serperPost<SerperNewsResponse>('news', { q: query, num });
    if (!data) return [];
    return (data.news || []).map((item) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet || '',
        source: item.source || safeDomain(item.link),
        date: item.date ?? null,
    }));
}

// Nigerian cybersecurity news — feeds the Nigerian Threat Feed page alongside the (mock)
// NCC-CSIRT/NGCERT advisories, since neither agency exposes a scrapable feed of its own.
export async function getNigerianCyberNews(limit = 10): Promise<NewsResult[]> {
    return executeNewsSearch('Nigeria cybersecurity OR cyberattack OR data breach OR NDPC OR NITDA', limit);
}

// General cyber-news search, for callers that want a custom query (e.g. brand-specific breach
// news alongside searchBreachMentions's plain-web version).
export async function searchNews(query: string, limit = 10): Promise<NewsResult[]> {
    return executeNewsSearch(query, limit);
}
