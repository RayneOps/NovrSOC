import { Router } from 'express';

// Automated vendor security-posture scoring — demo data for now (real scoring would compose
// services/sslLabs.ts + services/rdap.ts + DNS SPF/DMARC/DKIM checks + a future HIBP breach
// lookup, same sources already used by routes/webscan.ts). This is a *different* feature from
// the pre-existing manual vendor-assessment questionnaire (routes/vendor-assessments.ts,
// /api/vendor-assessments) — that one is a compliance-style Q&A workflow; this one is
// automated technical posture scoring.

const router = Router();

interface VendorIssue {
    severity: 'critical' | 'high' | 'medium' | 'low';
    text: string;
}

interface Vendor {
    id: string;
    name: string;
    domain: string;
    relationship: string;
    discovery: 'auto' | 'manual';
    score: number;
    risk_level: 'low' | 'medium' | 'high';
    ssl_grade: string;
    spf: boolean;
    dmarc: boolean;
    dkim: boolean;
    dnssec: boolean;
    breach_count: number;
    open_ports: number[];
    last_assessed: string;
    issues: VendorIssue[];
}

const MOCK_VENDORS: Vendor[] = [
    {
        id: 'v_001',
        name: 'MTN Nigeria',
        domain: 'mtn.ng',
        relationship: 'Telecom Provider',
        discovery: 'auto',
        score: 72,
        risk_level: 'medium',
        ssl_grade: 'A',
        spf: true,
        dmarc: true,
        dkim: true,
        dnssec: false,
        breach_count: 0,
        open_ports: [80, 443, 8080],
        last_assessed: '2026-08-11',
        issues: [
            { severity: 'medium', text: 'DNSSEC not enabled on mtn.ng' },
            { severity: 'low', text: 'Port 8080 exposed publicly' },
        ],
    },
    {
        id: 'v_002',
        name: 'GTBank',
        domain: 'gtbank.com',
        relationship: 'Banking Partner',
        discovery: 'manual',
        score: 85,
        risk_level: 'low',
        ssl_grade: 'A+',
        spf: true,
        dmarc: true,
        dkim: true,
        dnssec: true,
        breach_count: 1,
        open_ports: [443],
        last_assessed: '2026-08-11',
        issues: [
            { severity: 'low', text: '1 historical breach (2014) — resolved' },
        ],
    },
    {
        id: 'v_003',
        name: 'Dangote Group',
        domain: 'dangote.com',
        relationship: 'Enterprise Client',
        discovery: 'manual',
        score: 61,
        risk_level: 'medium',
        ssl_grade: 'B',
        spf: true,
        dmarc: false,
        dkim: false,
        dnssec: false,
        breach_count: 0,
        open_ports: [80, 443, 22, 3306],
        last_assessed: '2026-08-11',
        issues: [
            { severity: 'high', text: 'DMARC not configured — domain can be spoofed' },
            { severity: 'high', text: 'Port 3306 (MySQL) exposed to public internet' },
            { severity: 'medium', text: 'SSL grade B — weak cipher suites detected' },
            { severity: 'medium', text: 'DKIM not configured for email authentication' },
        ],
    },
    {
        id: 'v_004',
        name: 'Airtel Nigeria',
        domain: 'ng.airtel.com',
        relationship: 'Telecom Provider',
        discovery: 'auto',
        score: 78,
        risk_level: 'medium',
        ssl_grade: 'A',
        spf: true,
        dmarc: true,
        dkim: false,
        dnssec: false,
        breach_count: 0,
        open_ports: [80, 443],
        last_assessed: '2026-08-11',
        issues: [
            { severity: 'medium', text: 'DKIM not configured' },
            { severity: 'low', text: 'DNSSEC not enabled' },
        ],
    },
    {
        id: 'v_005',
        name: 'MainOne',
        domain: 'mainone.net',
        relationship: 'Internet Provider',
        discovery: 'auto',
        score: 91,
        risk_level: 'low',
        ssl_grade: 'A+',
        spf: true,
        dmarc: true,
        dkim: true,
        dnssec: true,
        breach_count: 0,
        open_ports: [443],
        last_assessed: '2026-08-11',
        issues: [],
    },
    {
        id: 'v_006',
        name: 'First Bank Nigeria',
        domain: 'firstbanknigeria.com',
        relationship: 'Banking Partner',
        discovery: 'manual',
        score: 48,
        risk_level: 'high',
        ssl_grade: 'C',
        spf: false,
        dmarc: false,
        dkim: false,
        dnssec: false,
        breach_count: 2,
        open_ports: [80, 443, 22, 8443, 9090],
        last_assessed: '2026-08-11',
        issues: [
            { severity: 'critical', text: '2 historical breaches — 2019 and 2022' },
            { severity: 'high', text: 'SSL grade C — TLS 1.0/1.1 still enabled' },
            { severity: 'high', text: 'No SPF, DMARC or DKIM — fully spoofable domain' },
            { severity: 'high', text: 'Ports 8443 and 9090 exposed publicly' },
            { severity: 'medium', text: 'DNSSEC not enabled' },
        ],
    },
];

router.get('/', (_req, res) => {
    res.json({ vendors: MOCK_VENDORS, count: MOCK_VENDORS.length });
});

router.get('/:id', (req, res) => {
    const vendor = MOCK_VENDORS.find((v) => v.id === req.params.id);
    if (!vendor) {
        res.status(404).json({ error: 'Vendor not found' });
        return;
    }
    res.json(vendor);
});

router.post('/', (_req, res) => {
    res.json({ success: true, message: 'Vendor added to assessment queue' });
});

router.post('/:id/reassess', (_req, res) => {
    res.json({ success: true, message: 'Re-assessment scheduled' });
});

export default router;
