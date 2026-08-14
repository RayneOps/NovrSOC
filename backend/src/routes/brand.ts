import { Router } from 'express';
import { searchCode as githubSearch, isConfigured as githubConfigured, type GitHubCodeMatch } from '../services/github';
import { searchCode as gitlabSearch, isConfigured as gitlabConfigured, type GitLabCodeMatch } from '../services/gitlab';
import { searchBrandMentions, searchCounterfeitSites, isConfigured as googleConfigured } from '../services/google';
import { checkEmail as hibpCheckEmail, isConfigured as hibpConfigured } from '../services/hibp';
import gplay from 'google-play-scraper';

// Brand Protection — domains, socials, executives, apps, and code-leak monitoring.
// Every route here returns structured mock data for now; the real crawlers (crt.sh, RDAP,
// GitHub/GitLab code search, iTunes/Play Store search, X API) land in a later pass. Endpoints
// that add/list/remove a monitored entity (domains, socials, executives, apps, signatures) keep
// their state in-memory per resource below so the UI is genuinely usable while crawlers don't
// exist yet — restarting the backend resets it, same as everything else in this project that
// isn't backed by Postgres/Supabase yet.

const router = Router();

let nextId = 100;
const newId = () => String(nextId++);

// ── DOMAINS ─────────────────────────────────────────────────────────
// Moved to routes/domainSuite.ts (mounted at /api/brand/domains) — real crt.sh + RDAP lookups,
// monitored-domain add/remove/scan/dns flow. Kept out of this file to avoid a route collision.

// ── SOCIALS ─────────────────────────────────────────────────────────

interface MonitoredSocial {
    id: string;
    platform: string;
    handle: string;
    display_name: string;
    profile_url: string;
    exec_names: string[];
    keywords: string[];
    followers: number;
    verified: boolean;
    last_checked: string;
}

const socials: MonitoredSocial[] = [
    { id: '1', platform: 'twitter', handle: '@cybernovr', display_name: 'Cybernovr', profile_url: 'https://x.com/cybernovr', exec_names: [], keywords: ['cybernovr', 'novrsoc'], followers: 4200, verified: true, last_checked: '1 hour ago' },
    { id: '2', platform: 'linkedin', handle: 'Cybernovr', display_name: 'Cybernovr', profile_url: 'https://linkedin.com/company/cybernovr', exec_names: [], keywords: ['cybernovr'], followers: 1800, verified: true, last_checked: '1 hour ago' },
];

const MOCK_IMPERSONATION = [
    { handle: '@cybernovr_security', platform: 'Twitter', score: 87, followers: 12, created: '2026-07-30' },
    { handle: 'Cybernovr Official', platform: 'Facebook', score: 74, followers: 230, created: '2026-06-15' },
    { handle: '@cybernovr.ng', platform: 'Instagram', score: 61, followers: 45, created: '2026-08-01' },
];

const MOCK_MENTIONS = [
    { text: 'Anyone using @cybernovr for SOC? thinking of switching from our current MSSP', platform: 'Twitter', sentiment: 'Positive', time: '12m ago' },
    { text: 'cybernovr.com support hasn’t replied in 2 days, kind of annoying tbh', platform: 'Twitter', sentiment: 'Negative', time: '3h ago' },
    { text: 'NovrSOC dashboard update looks clean', platform: 'LinkedIn', sentiment: 'Positive', time: '1d ago' },
];

router.get('/socials', (_req, res) => {
    res.json({ socials });
});

router.post('/socials', (req, res) => {
    const {
        platform, handle, display_name, profile_url, exec_names, keywords,
    }: {
        platform?: string;
        handle?: string;
        display_name?: string;
        profile_url?: string;
        exec_names?: string[];
        keywords?: string[];
    } = req.body ?? {};

    if (!platform || !handle) {
        res.status(400).json({ error: 'platform and handle are required' });
        return;
    }
    const entry: MonitoredSocial = {
        id: newId(),
        platform,
        handle,
        display_name: display_name ?? handle,
        profile_url: profile_url ?? '',
        exec_names: exec_names ?? [],
        keywords: keywords ?? [],
        followers: 0,
        verified: false,
        last_checked: 'Just now',
    };
    socials.push(entry);
    res.status(201).json(entry);
});

router.get('/socials/alerts', (_req, res) => {
    res.json({ impersonations: MOCK_IMPERSONATION, mentions: MOCK_MENTIONS });
});

// ── EXECUTIVES ──────────────────────────────────────────────────────

interface ExecBreach {
    source: string;
    title: string;
    breach_date: string;
    data_classes: string[];
    is_sensitive: boolean;
    is_verified: boolean;
}

interface MonitoredExecutive {
    id: string;
    name: string;
    email: string;
    role: string;
    org: string;
    status: 'monitored' | 'at_risk' | 'clear';
    added_at: string;
    last_scanned: string | null;
    breach_count: number;
    breaches: ExecBreach[];
    scan_status: 'pending' | 'scanning' | 'complete' | 'error';
}

const executives: MonitoredExecutive[] = [
    {
        id: '1', name: 'RayneOps', email: 'rayne@cybernovr.com', role: 'CEO', org: 'Cybernovr',
        status: 'monitored', added_at: '2026-01-01', last_scanned: null, breach_count: 0, breaches: [], scan_status: 'pending',
    },
    {
        id: '2', name: 'Karl', email: 'karl@cybernovr.com', role: 'CTO', org: 'Cybernovr',
        status: 'at_risk', added_at: '2026-01-01', last_scanned: '2026-08-01T09:00:00.000Z', breach_count: 1,
        breaches: [{ source: 'LinkedIn2024', title: 'LinkedIn 2024', breach_date: '2024-03-15', data_classes: ['Email', 'Password hash'], is_sensitive: false, is_verified: true }],
        scan_status: 'complete',
    },
];

function maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!domain) return email;
    return `${user[0] ?? ''}***@${domain}`;
}

router.get('/executives', (_req, res) => {
    res.json({
        executives: executives.map((e) => ({ ...e, email_masked: maskEmail(e.email) })),
        capabilities: {
            hibp: hibpConfigured(),
            wazuh: false, // true once Wazuh is reachable from this backend
            darkweb: false, // true once Flare.io is configured (Phase 2)
        },
    });
});

router.post('/executives', (req, res) => {
    const { name, email, role, org }: { name?: string; email?: string; role?: string; org?: string } = req.body ?? {};
    if (!name || !email) {
        res.status(400).json({ error: 'name and email are required' });
        return;
    }
    const entry: MonitoredExecutive = {
        id: newId(),
        name,
        email,
        role: role ?? 'Executive',
        org: org ?? 'Cybernovr',
        status: 'monitored',
        added_at: new Date().toISOString().split('T')[0],
        last_scanned: null,
        breach_count: 0,
        breaches: [],
        scan_status: 'pending',
    };
    executives.push(entry);
    res.status(201).json(entry);
});

router.get('/executives/alerts', (_req, res) => {
    const breaches = executives.flatMap((e) => e.breaches.map((b) => ({
        name: e.name,
        source: b.title,
        date: b.breach_date,
        classes: b.data_classes,
        severity: b.is_sensitive ? 'critical' : 'high',
    })));
    res.json({ breaches });
});

interface ExecScanResult {
    executive_id: string;
    scanned_at: string;
    hibp_checked: boolean;
    breaches: ExecBreach[];
    note?: string;
}

// POST /api/brand/executives/:id/scan — real HIBP breach check when HIBP_API_KEY is configured
router.post('/executives/:id/scan', async (req, res) => {
    const exec = executives.find((e) => e.id === req.params.id);
    if (!exec) {
        res.status(404).json({ error: 'Executive not found' });
        return;
    }

    exec.scan_status = 'scanning';
    const scanResult: ExecScanResult = {
        executive_id: exec.id,
        scanned_at: new Date().toISOString(),
        hibp_checked: false,
        breaches: [],
    };

    if (hibpConfigured()) {
        try {
            const found = await hibpCheckEmail(exec.email);
            scanResult.hibp_checked = true;
            scanResult.breaches = found.map((b) => ({
                source: b.Name,
                title: b.Title,
                breach_date: b.BreachDate,
                data_classes: b.DataClasses,
                is_sensitive: b.IsSensitive,
                is_verified: b.IsVerified,
            }));
            exec.breach_count = scanResult.breaches.length;
            exec.breaches = scanResult.breaches;
            exec.last_scanned = scanResult.scanned_at;
            exec.scan_status = 'complete';
            exec.status = exec.breach_count > 0 ? 'at_risk' : 'clear';
        } catch {
            exec.scan_status = 'error';
        }
    } else {
        exec.scan_status = 'pending';
        scanResult.note = 'HIBP API key not configured — add HIBP_API_KEY ($3.50/month, haveibeenpwned.com/API/Key) to enable breach checking';
    }

    res.json(scanResult);
});

// POST /api/brand/executives/scan-all — queue a scan across all monitored executives
router.post('/executives/scan-all', (_req, res) => {
    res.json({
        message: `Scan initiated for ${executives.length} executives`,
        estimated_time: `${executives.length * 2} seconds`,
        executives: executives.map((e) => ({ id: e.id, name: e.name, status: 'queued' })),
    });
});

// ── MOBILE APPS ─────────────────────────────────────────────────────

interface MonitoredApp {
    id: string;
    name: string;
    bundle_id: string;
    platform: 'iOS' | 'Android';
    developer: string;
    verified: boolean;
}

const apps: MonitoredApp[] = [
    { id: '1', name: 'NovrSOC', bundle_id: 'com.cybernovr.novrsoc', platform: 'iOS', developer: 'Cybernovr Ltd', verified: true },
    { id: '2', name: 'NovrSOC', bundle_id: 'com.cybernovr.novrsoc', platform: 'Android', developer: 'Cybernovr Ltd', verified: true },
];

const MOCK_ROGUE_APPS = [
    { name: 'NovrSOC Pro Security', platform: 'Android', developer: 'UnknownDev2024', downloads: 2400, risk: 'HIGH', store_url: 'https://play.google.com/store' },
    { name: 'CyberNovr VPN', platform: 'iOS', developer: 'AppStudio Ltd', downloads: 890, risk: 'MEDIUM', store_url: 'https://apps.apple.com' },
];

router.get('/apps', (_req, res) => {
    res.json({ apps });
});

router.post('/apps', (req, res) => {
    const { name, bundle_id, platform, developer } = req.body ?? {};
    if (!name || !platform) {
        res.status(400).json({ error: 'name and platform are required' });
        return;
    }
    const entry: MonitoredApp = { id: newId(), name, bundle_id: bundle_id ?? '—', platform, developer: developer ?? '—', verified: false };
    apps.push(entry);
    res.status(201).json(entry);
});

router.get('/apps/alerts', (_req, res) => {
    res.json({ rogueApps: MOCK_ROGUE_APPS });
});

interface AppStoreHit {
    name: string;
    bundle_id: string;
    developer: string;
    store_url: string;
    icon_url: string;
    price: string;
    rating: number | null;
    review_count: number | null;
}

interface PlayStoreHit {
    name: string;
    bundle_id: string;
    developer: string;
    store_url: string;
    icon_url: string;
    rating: number | null;
}

interface ITunesResult {
    trackName: string;
    bundleId: string;
    artistName: string;
    trackViewUrl: string;
    artworkUrl100: string;
    formattedPrice: string;
    averageUserRating: number | null;
    userRatingCount: number | null;
}

interface ITunesSearchResponse {
    results: ITunesResult[];
}

// POST /api/brand/apps/scan — real iTunes Search API + Google Play search
router.post('/apps/scan', async (req, res) => {
    const brandName: string = typeof req.body?.brand_name === 'string' && req.body.brand_name.trim() ? req.body.brand_name.trim() : 'cybernovr';

    const results: { brand_name: string; scanned_at: string; appstore: AppStoreHit[]; playstore: PlayStoreHit[] } = {
        brand_name: brandName,
        scanned_at: new Date().toISOString(),
        appstore: [],
        playstore: [],
    };

    try {
        const itunesRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(brandName)}&entity=software&limit=10`,
            { signal: AbortSignal.timeout(8000) }
        );
        const data = (await itunesRes.json()) as ITunesSearchResponse;
        results.appstore = (data.results ?? []).map((app) => ({
            name: app.trackName,
            bundle_id: app.bundleId,
            developer: app.artistName,
            store_url: app.trackViewUrl,
            icon_url: app.artworkUrl100,
            price: app.formattedPrice,
            rating: app.averageUserRating ?? null,
            review_count: app.userRatingCount ?? null,
        }));
    } catch (err) {
        console.warn('[Mobile App Suite] iTunes search error:', err);
    }

    try {
        const playResults = await gplay.search({ term: brandName, num: 10, lang: 'en', country: 'ng' });
        results.playstore = playResults.map((app) => ({
            name: app.title,
            bundle_id: app.appId,
            developer: app.developer,
            store_url: app.url,
            icon_url: app.icon,
            rating: app.score ?? null,
        }));
    } catch (err) {
        console.warn('[Mobile App Suite] Play Store search error:', err);
    }

    res.json(results);
});

// ── CODE SIGNATURES / LEAK DETECTION ───────────────────────────────

interface CodeSignature {
    id: string;
    type: 'STRING' | 'REGEX' | 'HASH';
    pattern: string;
    description: string;
    matches: number;
}

const signatures: CodeSignature[] = [
    { id: '1', type: 'REGEX', pattern: 'AKIA[0-9A-Z]{16}', description: 'AWS Access Key', matches: 1 },
    { id: '2', type: 'STRING', pattern: '"cybernovr.com"', description: 'Domain in code', matches: 3 },
    { id: '3', type: 'REGEX', pattern: 'sk-[a-zA-Z0-9]{48}', description: 'OpenAI API Key', matches: 0 },
];

const MOCK_LEAKS = [
    { platform: 'GitHub', repo: 'github.com/someuser/project', file: '.env', line: 14, committer: 'someuser', date: '2026-08-09', severity: 'critical' },
];

router.get('/signatures', (_req, res) => {
    res.json({ signatures });
});

router.post('/signatures', (req, res) => {
    const { type, pattern, description } = req.body ?? {};
    if (!type || !pattern) {
        res.status(400).json({ error: 'type and pattern are required' });
        return;
    }
    const entry: CodeSignature = { id: newId(), type, pattern, description: description ?? '—', matches: 0 };
    signatures.push(entry);
    res.status(201).json(entry);
});

router.get('/leaks', (_req, res) => {
    res.json({ leaks: MOCK_LEAKS });
});

interface LeakScanHit extends Partial<GitHubCodeMatch>, Partial<GitLabCodeMatch> {
    source: 'github' | 'gitlab';
}

// POST /api/brand/leaks/scan — triggers a real GitHub + GitLab code search when tokens are
// configured (services/github.ts, services/gitlab.ts); falls back to the queued-ack response
// UrlScanSuite-style pages use when there's nothing real to call yet.
router.post('/leaks/scan', async (req, res) => {
    const orgName: string = typeof req.body?.org_name === 'string' ? req.body.org_name : 'cybernovr';

    const results: LeakScanHit[] = [];
    const summary = {
        github_configured: githubConfigured(),
        gitlab_configured: gitlabConfigured(),
        github_results: 0,
        gitlab_results: 0,
        scanned_at: new Date().toISOString(),
    };

    if (!summary.github_configured && !summary.gitlab_configured) {
        res.json({ status: 'queued', queued_at: summary.scanned_at });
        return;
    }

    if (summary.github_configured) {
        try {
            const [brandMatches, keyMatches, apiKeyMatches] = await Promise.allSettled([
                githubSearch(`"${orgName}.com" filename:.env`, 5),
                githubSearch(`"${orgName}" AKIA`, 5), // AWS key pattern
                githubSearch(`"${orgName}" api_key`, 5),
            ]);
            const allMatches = [brandMatches, keyMatches, apiKeyMatches]
                .filter((r): r is PromiseFulfilledResult<GitHubCodeMatch[]> => r.status === 'fulfilled')
                .flatMap((r) => r.value);
            summary.github_results = allMatches.length;
            results.push(...allMatches.map((m) => ({ ...m, source: 'github' as const })));
        } catch (err) {
            console.warn('[copyID] GitHub scan error:', err);
        }
    }

    if (summary.gitlab_configured) {
        try {
            const gitlabMatches = await gitlabSearch(`${orgName}.com`);
            summary.gitlab_results = gitlabMatches.length;
            results.push(...gitlabMatches.map((m) => ({ ...m, source: 'gitlab' as const })));
        } catch (err) {
            console.warn('[copyID] GitLab scan error:', err);
        }
    }

    res.json({ results, summary });
});

// POST /api/brand/search — Google Custom Search brand-mention monitoring
router.post('/search', async (req, res) => {
    const { brand_name, official_domains = [], search_type = 'mentions' } = req.body ?? {};

    if (!brand_name || typeof brand_name !== 'string') {
        res.status(400).json({ error: 'brand_name required' });
        return;
    }

    if (!googleConfigured()) {
        // Demo data — configure GOOGLE_API_KEY and GOOGLE_SEARCH_CX for live results
        res.json({
            configured: false,
            results: [
                {
                    title: `${brand_name} — Fake Discount Store`,
                    url: `https://www.${brand_name.toLowerCase()}-deals-ng.com/products`,
                    snippet: `Get ${brand_name} products at 80% discount. Limited time offer...`,
                    domain: `${brand_name.toLowerCase()}-deals-ng.com`,
                },
                {
                    title: `${brand_name} Review — Is it legit? | Nairaland`,
                    url: `https://www.nairaland.com/security/${brand_name.toLowerCase()}-review`,
                    snippet: `I've been using ${brand_name} for months. Here's my honest review...`,
                    domain: 'nairaland.com',
                },
            ],
            note: 'Demo data — configure GOOGLE_API_KEY and GOOGLE_SEARCH_CX for live results',
        });
        return;
    }

    try {
        const result = search_type === 'counterfeit'
            ? await searchCounterfeitSites(brand_name, official_domains)
            : await searchBrandMentions(brand_name, official_domains);

        res.json({ configured: true, ...(result ?? { results: [], total_results: 0 }) });
    } catch {
        res.status(500).json({ error: 'Brand search failed' });
    }
});

// ── BRAND ASSETS ────────────────────────────────────────────────────

interface BrandAssets {
    official_domain: string;
    brand_name: string;
    trademark_keywords: string[];
    logo_uploaded: boolean;
    logo_filename: string | null;
}

const brandAssets: BrandAssets = {
    official_domain: 'cybernovr.com',
    brand_name: 'Cybernovr',
    trademark_keywords: ['cybernovr', 'novrsoc', 'novr'],
    logo_uploaded: false,
    logo_filename: null,
};

router.get('/assets', (_req, res) => {
    res.json({ ...brandAssets, capabilities: { vision: false, web_search: googleConfigured() } });
});

router.patch('/assets', (req, res) => {
    const { official_domain, brand_name, trademark_keywords }: {
        official_domain?: string;
        brand_name?: string;
        trademark_keywords?: string[];
    } = req.body ?? {};

    if (official_domain) brandAssets.official_domain = official_domain;
    if (brand_name) brandAssets.brand_name = brand_name;
    if (trademark_keywords) brandAssets.trademark_keywords = trademark_keywords;
    res.json(brandAssets);
});

// POST /api/brand/assets/logo — logo upload acknowledgement (real file storage/S3 lands with
// a later multer + object-storage pass; this records that a logo was provided).
router.post('/assets/logo', (req, res) => {
    const { filename }: { filename?: string } = req.body ?? {};
    brandAssets.logo_uploaded = true;
    brandAssets.logo_filename = filename ?? 'logo.png';
    res.json({ success: true, message: 'Logo uploaded successfully', logo_filename: brandAssets.logo_filename });
});

export default router;
