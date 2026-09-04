// X/Twitter brand-mention monitoring via rsshub (no API key) + web search across the social
// platforms, preferring Serper (services/serper.ts) and falling back to Google Custom Search
// (services/google.ts) when SERPER_API_KEY isn't set — same provider-preference pattern used in
// routes/brand.ts's /search route, so an already-working Google CSE key keeps working unchanged.
//
// Verified live before writing this: the public rsshub.app instance's /twitter/search route is
// dead — it 302-redirects to google.com/404, not real RSS content. That's most likely rsshub.app
// specifically disabling that route (X's API changes have broken most third-party scrapers of
// it), not something wrong with the request here. RSSHUB_URL is a configurable base for exactly
// that reason — if it's ever pointed at a working public instance or a self-hosted one, this
// starts returning real results with no code change; against the default public instance today
// it will consistently come back empty.

import { searchWeb as serperSearchWeb, isConfigured as serperConfigured } from './serper';
import { searchWeb as googleSearchWeb } from './google';

const RSSHUB_BASE = process.env.RSSHUB_URL || 'https://rsshub.app';

export interface SocialMention {
    title: string;
    link: string;
    date: string;
    source: string;
    platform: string;
    snippet?: string;
}

export async function searchXMentions(brandName: string): Promise<SocialMention[]> {
    try {
        const searchTerm = encodeURIComponent(`${brandName} OR @${brandName}`);
        const r = await fetch(`${RSSHUB_BASE}/twitter/search/${searchTerm}`, { signal: AbortSignal.timeout(10000) });
        if (!r.ok) return [];
        const xml = await r.text();
        if (!xml.trim().startsWith('<?xml') && !xml.includes('<rss')) return []; // not real RSS — e.g. an HTML error/redirect page

        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        return items.slice(0, 20).map((item) => {
            const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || '';
            const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
            const date = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
            return { title, link, date, source: 'twitter', platform: 'X' };
        });
    } catch {
        return [];
    }
}

// Thin wrapper over services/serper.ts (or services/google.ts as fallback) searchWeb() — scoped
// to the social platforms this feature cares about, not a second search client of its own.
export async function searchGoogleMentions(brandName: string): Promise<SocialMention[]> {
    const query = `"${brandName}" (site:twitter.com OR site:x.com OR site:linkedin.com OR site:facebook.com OR site:instagram.com)`;
    const provider = serperConfigured() ? 'serper' : 'google';
    const result = provider === 'serper' ? await serperSearchWeb(query) : await googleSearchWeb(query);
    if (!result) return [];
    return result.results.map((item) => ({
        title: item.title,
        link: item.url,
        date: item.date ?? '',
        source: provider,
        platform: item.domain,
        snippet: item.snippet,
    }));
}

export async function searchSocialMentions(brandName: string): Promise<{ mentions: SocialMention[]; sources: string[] }> {
    const [x, web] = await Promise.allSettled([searchXMentions(brandName), searchGoogleMentions(brandName)]);
    const xMentions = x.status === 'fulfilled' ? x.value : [];
    const webMentions = web.status === 'fulfilled' ? web.value : [];

    return {
        mentions: [...xMentions, ...webMentions],
        sources: [xMentions.length > 0 ? 'twitter' : null, webMentions[0]?.source ?? null].filter((s): s is string => s !== null),
    };
}
