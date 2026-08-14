import { Router } from 'express';
import { searchCTLogs, type CertEntry } from '../services/crtsh';
import { lookupDomain, type ParsedWhois } from '../services/rdap';

// Brand Protection > Domain Suite — monitored brand domains, scanned for lookalikes, DNS
// changes, expiring registrations, and unauthorized SSL certs. Real crt.sh (CT logs) and
// RDAP (WHOIS) lookups; Cloudflare DoH for live DNS. In-memory store — same pattern as
// routes/brand.ts (which this replaces the /domains section of; see index.ts wiring).

const router = Router();

interface DomainAlerts {
    lookalike: boolean;
    dns_change: boolean;
    expiry: boolean;
    new_cert: boolean;
}

interface MonitoredDomain {
    id: string;
    domain: string;
    brand_keywords: string[];
    similarity_threshold: number;
    alerts: DomainAlerts;
    status: 'active';
    added_at: string;
}

const monitoredDomains: MonitoredDomain[] = [
    {
        id: 'dom_001',
        domain: 'cybernovr.com',
        brand_keywords: ['cybernovr', 'novrsoc'],
        similarity_threshold: 80,
        alerts: { lookalike: true, dns_change: true, expiry: true, new_cert: true },
        status: 'active',
        added_at: '2026-01-15',
    },
];

let nextId = 100;
const newId = () => `dom_${nextId++}`;

// GET /api/brand/domains — list all monitored domains
router.get('/', (_req, res) => {
    res.json({ domains: monitoredDomains });
});

// POST /api/brand/domains — add a domain
router.post('/', (req, res) => {
    const { domain, brand_keywords, similarity_threshold, alerts }: {
        domain?: string;
        brand_keywords?: string[];
        similarity_threshold?: number;
        alerts?: Partial<DomainAlerts>;
    } = req.body ?? {};

    if (!domain || typeof domain !== 'string') {
        res.status(400).json({ error: 'domain required' });
        return;
    }

    const cleaned = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (monitoredDomains.some((d) => d.domain === cleaned)) {
        res.status(409).json({ error: 'Domain already monitored' });
        return;
    }

    const entry: MonitoredDomain = {
        id: newId(),
        domain: cleaned,
        brand_keywords: brand_keywords && brand_keywords.length > 0 ? brand_keywords : [cleaned.split('.')[0]],
        similarity_threshold: similarity_threshold ?? 80,
        alerts: { lookalike: true, dns_change: true, expiry: true, new_cert: true, ...alerts },
        status: 'active',
        added_at: new Date().toISOString().split('T')[0],
    };

    monitoredDomains.push(entry);
    res.status(201).json(entry);
});

// DELETE /api/brand/domains/:id
router.delete('/:id', (req, res) => {
    const idx = monitoredDomains.findIndex((d) => d.id === req.params.id);
    if (idx === -1) {
        res.status(404).json({ error: 'Domain not found' });
        return;
    }
    monitoredDomains.splice(idx, 1);
    res.status(204).end();
});

interface DomainScanResult {
    domain: string;
    scanned_at: string;
    whois: ParsedWhois | null;
    ct_logs: Array<{ domain: string; issuer: string; not_before: string; not_after: string; suspicious: boolean }>;
    lookalikes: Array<{ domain: string; similarity: number; risk: 'HIGH' | 'MEDIUM' | 'LOW' }>;
}

// GET /api/brand/domains/:id/scan — run live scan on domain (real RDAP + real crt.sh)
router.get('/:id/scan', async (req, res) => {
    const domain = monitoredDomains.find((d) => d.id === req.params.id);
    if (!domain) {
        res.status(404).json({ error: 'Domain not found' });
        return;
    }

    const results: DomainScanResult = {
        domain: domain.domain,
        scanned_at: new Date().toISOString(),
        whois: null,
        ct_logs: [],
        lookalikes: [],
    };

    try {
        results.whois = await lookupDomain(domain.domain);
    } catch {
        // non-fatal
    }

    try {
        const certs: CertEntry[] = await searchCTLogs(domain.domain);
        results.ct_logs = certs.slice(0, 10).map((c) => ({
            domain: c.common_name,
            issuer: c.issuer_name,
            not_before: c.not_before,
            not_after: c.not_after,
            suspicious: c.common_name !== domain.domain && !c.common_name.endsWith(`.${domain.domain}`),
        }));
    } catch {
        // non-fatal
    }

    // Generated typosquat candidates — real registration/resolution status isn't checked here,
    // just pattern generation (same approach as the mock lookalikes routes/brand.ts used to serve).
    const base = domain.domain.split('.')[0];
    const tld = domain.domain.split('.').slice(1).join('.');
    results.lookalikes = (
        [
            { domain: `${base}-official.com`, similarity: 82, risk: 'MEDIUM' },
            { domain: `${base}security.com`, similarity: 79, risk: 'MEDIUM' },
            { domain: `${base}.ng`, similarity: 95, risk: 'HIGH' },
            { domain: `${base.slice(0, -1)}k.${tld}`, similarity: 91, risk: 'HIGH' },
        ] as const
    ).filter((l) => l.domain !== domain.domain);

    res.json(results);
});

interface DnsRecord {
    type: string;
    name: string;
    value: string;
    ttl: number;
}

interface DoHAnswer {
    name: string;
    type: number;
    TTL: number;
    data: string;
}

interface DoHResponse {
    Answer?: DoHAnswer[];
}

// GET /api/brand/domains/:id/dns — live DNS check via Cloudflare DoH
router.get('/:id/dns', async (req, res) => {
    const domain = monitoredDomains.find((d) => d.id === req.params.id);
    if (!domain) {
        res.status(404).json({ error: 'Domain not found' });
        return;
    }

    const records: DnsRecord[] = [];

    for (const type of ['A', 'MX', 'TXT', 'NS']) {
        try {
            const dohRes = await fetch(
                `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.domain)}&type=${type}`,
                { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000) }
            );
            const data = (await dohRes.json()) as DoHResponse;
            (data.Answer ?? []).forEach((a) => {
                records.push({ type, name: a.name, value: a.data, ttl: a.TTL });
            });
        } catch {
            // skip record type on error
        }
    }

    const txtRecords = records.filter((r) => r.type === 'TXT').map((r) => r.value);
    const hasSPF = txtRecords.some((t) => t.includes('v=spf1'));
    const hasDMARC = txtRecords.some((t) => t.includes('v=DMARC1'));

    res.json({
        domain: domain.domain,
        records,
        email_security: { spf: hasSPF, dmarc: hasDMARC },
        checked_at: new Date().toISOString(),
    });
});

export default router;
