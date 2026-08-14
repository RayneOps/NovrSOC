import { Router } from 'express';
import { lookupIP, isConfigured as maxmindConfigured } from '../services/maxmind';

// Email Security domain — DMARC SaaS, Messaging Suite, Intelli CODE PHISHID.
// DMARC/Messaging/PHISHID feed and stats endpoints below return demo data (real DMARC-report
// ingestion via Mailgun inbound routes and Zeek smtp.log parsing don't exist yet — this mirrors
// the "structured mock data now, real crawlers later" pattern used elsewhere in this backend).
// The RBL check and phishing classification endpoints are genuinely live.

const router = Router();

// ── DMARC SaaS ──────────────────────────────────────────────────────

const MOCK_DMARC_DOMAINS = [
    {
        domain: 'cybernovr.com',
        policy: 'reject',
        dkim_pass_rate: 98.2,
        spf_pass_rate: 97.8,
        total_messages: 1284,
        compliant: 1258,
        failed: 26,
        unauthorized_senders: 3,
        last_report: '2026-08-11',
        status: 'protected',
    },
    {
        domain: 'novrsoc.com',
        policy: 'quarantine',
        dkim_pass_rate: 91.4,
        spf_pass_rate: 94.2,
        total_messages: 347,
        compliant: 317,
        failed: 30,
        unauthorized_senders: 1,
        last_report: '2026-08-11',
        status: 'warning',
    },
];

const MOCK_UNAUTHORIZED_SENDERS = [
    {
        ip: '102.89.45.13',
        country: 'NG',
        isp: 'MTN Nigeria',
        messages_sent: 12,
        spf: 'fail',
        dkim: 'fail',
        disposition: 'reject',
        first_seen: '2026-08-09',
        threat_level: 'HIGH',
        note: 'Phishing attempt — spoofing cybernovr.com from Nigerian MTN IP',
    },
    {
        ip: '185.220.101.47',
        country: 'DE',
        isp: 'Hetzner Online GmbH',
        messages_sent: 8,
        spf: 'fail',
        dkim: 'fail',
        disposition: 'reject',
        first_seen: '2026-08-10',
        threat_level: 'HIGH',
        note: 'Known Tor exit node — likely automated phishing infrastructure',
    },
    {
        ip: '209.85.220.41',
        country: 'US',
        isp: 'Google LLC',
        messages_sent: 1258,
        spf: 'pass',
        dkim: 'pass',
        disposition: 'none',
        first_seen: '2026-01-01',
        threat_level: 'AUTHORIZED',
        note: 'Google Workspace — authorized sending source',
    },
];

router.get('/dmarc/domains', (_req, res) => {
    res.json({ domains: MOCK_DMARC_DOMAINS });
});

router.get('/dmarc/senders', async (_req, res) => {
    const enriched = await Promise.all(
        MOCK_UNAUTHORIZED_SENDERS.map(async (sender) => {
            if (maxmindConfigured()) {
                const geo = await lookupIP(sender.ip);
                if (geo) {
                    return {
                        ...sender,
                        geo_city: geo.city,
                        geo_region: geo.region,
                        geo_country: geo.country_name,
                        geo_lat: geo.latitude,
                        geo_lng: geo.longitude,
                    };
                }
            }
            return sender;
        })
    );
    res.json({ senders: enriched });
});

router.post('/dmarc/domains', (_req, res) => {
    res.json({ success: true, message: 'Domain added to monitoring' });
});

// ── Messaging Suite ─────────────────────────────────────────────────

const MOCK_MAIL_GATEWAYS = [
    {
        name: 'Google Workspace (cybernovr.com)',
        type: 'outbound',
        ip: '209.85.220.41',
        status: 'healthy',
        delivery_rate: 99.2,
        avg_latency_ms: 340,
        messages_24h: 47,
        rbl_listed: false,
        last_checked: '5 min ago',
    },
    {
        name: 'Mailgun (transactional)',
        type: 'outbound',
        ip: '198.61.254.107',
        status: 'healthy',
        delivery_rate: 98.7,
        avg_latency_ms: 520,
        messages_24h: 312,
        rbl_listed: false,
        last_checked: '5 min ago',
    },
];

const MOCK_SUSPICIOUS_EMAILS = [
    {
        id: 'em_001',
        from: 'support@cybernovr.com.phish-attack.ru',
        to: 'rayne@cybernovr.com',
        subject: 'Urgent: Your account has been suspended',
        relay_ip: '185.220.101.47',
        relay_country: 'DE',
        received_at: '2026-08-11 09:23:14',
        helo_domain: 'mail.cybernovr.com',
        spf: 'fail',
        dkim: 'fail',
        suspicious_reason: 'Domain spoofing + forged HELO + known Tor exit node',
        severity: 'critical',
        attachment: null,
    },
    {
        id: 'em_002',
        from: 'invoice@dangote-group.ng',
        to: 'finance@cybernovr.com',
        subject: 'Q3 2026 Invoice #DG-4471',
        relay_ip: '102.91.42.10',
        relay_country: 'NG',
        received_at: '2026-08-11 11:45:02',
        helo_domain: 'mail.dangote-group.ng',
        spf: 'pass',
        dkim: 'pass',
        suspicious_reason: 'Attachment: invoice_DG4471.exe (disguised executable)',
        severity: 'high',
        attachment: 'invoice_DG4471.exe',
    },
    {
        id: 'em_003',
        from: 'alerts@gtbank.com',
        to: 'rayne@cybernovr.com',
        subject: 'Transaction Alert: NGN 250,000',
        relay_ip: '197.255.231.6',
        relay_country: 'NG',
        received_at: '2026-08-11 14:12:33',
        helo_domain: 'mail.gtbank.com',
        spf: 'pass',
        dkim: 'pass',
        suspicious_reason: null,
        severity: 'clean',
        attachment: null,
    },
];

router.get('/messaging/gateways', (_req, res) => {
    res.json({ gateways: MOCK_MAIL_GATEWAYS });
});

router.get('/messaging/suspicious', (_req, res) => {
    res.json({ emails: MOCK_SUSPICIOUS_EMAILS });
});

function reverseIP(ip: string): string {
    return ip.split('.').reverse().join('.');
}

interface CloudflareDnsAnswer {
    data: string;
}
interface CloudflareDnsResponse {
    Status: number;
    Answer?: CloudflareDnsAnswer[];
}

interface RblCheckDef {
    name: string;
    query: string;
}
interface RblResult extends RblCheckDef {
    listed: boolean;
    answer: string | null;
    error?: boolean;
}

// POST /api/email/messaging/rbl-check — genuinely live DNS blocklist lookups
router.post('/messaging/rbl-check', async (req, res) => {
    const { ip } = req.body ?? {};
    if (!ip || typeof ip !== 'string') {
        res.status(400).json({ error: 'ip required' });
        return;
    }

    const reversed = reverseIP(ip);
    const rbls: RblCheckDef[] = [
        { name: 'Spamhaus ZEN', query: `${reversed}.zen.spamhaus.org` },
        { name: 'Barracuda', query: `${reversed}.b.barracudacentral.org` },
        { name: 'SURBL', query: `${reversed}.multi.surbl.org` },
        { name: 'SpamCop', query: `${reversed}.bl.spamcop.net` },
    ];

    const results = await Promise.allSettled<RblResult>(
        rbls.map(async (rbl) => {
            try {
                const dnsRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${rbl.query}&type=A`, {
                    headers: { Accept: 'application/dns-json' },
                    signal: AbortSignal.timeout(3000),
                }).then((r) => r.json() as Promise<CloudflareDnsResponse>);
                const listed = dnsRes.Status === 0 && Boolean(dnsRes.Answer?.length);
                return { ...rbl, listed, answer: dnsRes.Answer?.[0]?.data ?? null };
            } catch {
                return { ...rbl, listed: false, answer: null, error: true };
            }
        })
    );

    res.json({
        ip,
        results: results.map((r, i) => (r.status === 'fulfilled' ? r.value : { ...rbls[i], listed: false, answer: null, error: true })),
    });
});

// ── Intelli CODE PHISHID ─────────────────────────────────────────────

const MOCK_EXTENSION_STATS = {
    endpoints_protected: 2,
    pages_scanned_24h: 847,
    threats_blocked: 3,
    threats_warned: 7,
    clean_pages: 837,
    avg_classification_ms: 340,
};

const MOCK_PHISH_EVENTS = [
    {
        id: 'ph_001',
        url: 'https://cybernovr.com.account-verify.ru/login',
        domain: 'account-verify.ru',
        page_title: 'CyberNovr - Sign In',
        form_action: 'http://45.32.18.9/collect.php',
        verdict: 'block',
        risk: 94,
        reason: 'Page impersonates cybernovr.com login on unauthorized domain. Form submits credentials to known malicious IP 45.32.18.9.',
        endpoint: 'rayne-laptop',
        user: 'rayne@cybernovr.com',
        detected_at: '2026-08-11 10:14:23',
        action_taken: 'Form blocked, user warned',
    },
    {
        id: 'ph_002',
        url: 'https://gtb-online-banking.phish.ng/login',
        domain: 'gtb-online-banking.phish.ng',
        page_title: 'GTBank Internet Banking',
        form_action: 'https://gtb-online-banking.phish.ng/submit',
        verdict: 'block',
        risk: 88,
        reason: 'Page mimics GTBank internet banking portal. Domain registered 3 days ago. No official GTBank SSL certificate.',
        endpoint: 'karl-laptop',
        user: 'karl@cybernovr.com',
        detected_at: '2026-08-11 14:33:07',
        action_taken: 'Form blocked, incident created',
    },
    {
        id: 'ph_003',
        url: 'https://login.microsoftonline.com',
        domain: 'login.microsoftonline.com',
        page_title: 'Microsoft Sign In',
        form_action: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        verdict: 'allow',
        risk: 2,
        reason: 'Official Microsoft login page. Verified domain, valid certificate.',
        endpoint: 'rayne-laptop',
        user: 'rayne@cybernovr.com',
        detected_at: '2026-08-11 09:02:41',
        action_taken: 'Allowed',
    },
];

router.get('/phishid/stats', (_req, res) => {
    res.json(MOCK_EXTENSION_STATS);
});

router.get('/phishid/events', (_req, res) => {
    res.json({ events: MOCK_PHISH_EVENTS });
});

interface ClassifyBody {
    url?: string;
    domain?: string;
    page_title?: string;
    form_action?: string;
    input_types?: string[];
}

interface ClassifyResult {
    risk: number;
    verdict: 'allow' | 'warn' | 'block';
    reason: string;
    classified_by: string;
}

function heuristicClassify(body: ClassifyBody): ClassifyResult {
    const { url = '', domain = '', form_action } = body;
    const suspicious = Boolean(
        (form_action && domain && !form_action.includes(domain)) ||
        url.includes('phish') || url.includes('secure-login') || url.includes('verify') || url.includes('account-update')
    );
    return {
        risk: suspicious ? 75 : 5,
        verdict: suspicious ? 'block' : 'allow',
        reason: suspicious
            ? 'Heuristic: form submits to external domain or URL contains suspicious keywords'
            : 'Heuristic: no obvious phishing indicators detected',
        classified_by: 'heuristic',
    };
}

// POST /api/email/phishid/classify — genuinely live (falls back to heuristics if no/failed Claude call)
router.post('/phishid/classify', async (req, res) => {
    const body: ClassifyBody = req.body ?? {};
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Anything that isn't a real-looking key (unset, or the repo's own placeholder value) skips
    // straight to the heuristic — no point spending a request on a key we know will 401.
    if (!apiKey || apiKey === 'your-key-here' || apiKey === 'REPLACE_WHEN_OBTAINED') {
        res.json(heuristicClassify(body));
        return;
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 200,
                messages: [{
                    role: 'user',
                    content: `You are a phishing detection classifier. Analyze this web page metadata and respond ONLY with valid JSON.

Page URL: ${body.url}
Domain: ${body.domain}
Page title: ${body.page_title || 'unknown'}
Form action URL: ${body.form_action || 'none'}
Input field types: ${(body.input_types || []).join(', ') || 'none'}

Respond with exactly this JSON structure:
{"risk": <0-100>, "verdict": "<allow|warn|block>", "reason": "<one sentence explanation>"}

Rules:
- risk >= 70 = block (clear phishing)
- risk 40-69 = warn (suspicious)
- risk < 40 = allow (legitimate)
- Consider: domain mismatch, suspicious form actions, URL patterns, page title vs domain`,
                }],
            }),
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) throw new Error(`Anthropic API ${response.status}`);

        const data = await response.json();
        const text: string = data.content?.[0]?.text || '{}';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        res.json({ ...parsed, classified_by: 'claude-ai' });
    } catch {
        // Real API unavailable/misconfigured — fall back to the heuristic rather than a dead 50/warn.
        res.json(heuristicClassify(body));
    }
});

export default router;
