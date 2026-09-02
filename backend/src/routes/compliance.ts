import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth';

const router = Router();
const BACKEND_URL = process.env.APP_API_BASE_URL || 'http://138.197.188.132:4000';

// requireAuth is mounted on this router (see index.ts) — req.user is always populated by the
// time a handler below runs. Every endpoint here used to trust a client-supplied `orgId`
// query/body param outright (anyone could read or write any org's compliance data by
// guessing an ID); now it's the token's own org_id unless the caller is a super_admin
// explicitly asking to inspect a different org.
function resolveOrgId(req: AuthRequest, requested: string | null): string {
    if (requested && req.user?.role === 'super_admin') return requested;
    return req.user?.org_id || requested || '';
}

// Mirrors the compliance_frameworks seed rows from the STEP 1 migration. This is
// static reference metadata (names/descriptions/control counts), not fabricated
// scores — actual assessment data always comes from the backend when available.
export const COMPLIANCE_FRAMEWORKS = [
    { id: 1, name: 'Nigeria Data Protection Act', shortName: 'NDPA', description: 'Nigerian data protection regulation', totalControls: 20 },
    { id: 2, name: 'CBN Cybersecurity Framework', shortName: 'CBN', description: 'Central Bank of Nigeria cybersecurity requirements', totalControls: 25 },
    { id: 3, name: 'NCC Cybersecurity Regulations', shortName: 'NCC', description: 'Nigerian Communications Commission security rules', totalControls: 20 },
    { id: 4, name: 'ISO/IEC 27001:2022', shortName: 'ISO 27001', description: 'International information security management', totalControls: 30 },
    { id: 5, name: 'PCI DSS v4.0', shortName: 'PCI-DSS', description: 'Payment card industry data security standard', totalControls: 25 },
    { id: 6, name: 'NIST Cybersecurity Framework', shortName: 'NIST CSF', description: 'NIST cybersecurity framework', totalControls: 23 },
    { id: 7, name: 'SWIFT Customer Security Programme', shortName: 'SWIFT CSP', description: 'SWIFT financial messaging security', totalControls: 22 },
];

interface BackendFrameworkScore {
    framework_id: number;
    assessed: number;
    compliant: number;
}

// GET /api/compliance
router.get('/', async (req: AuthRequest, res) => {
    const requested = typeof req.query.orgId === 'string' ? req.query.orgId : null;
    const orgId = resolveOrgId(req, requested);
    if (!orgId) {
        res.status(400).json({ error: 'orgId is required' });
        return;
    }

    // The compliance backend isn't deployed yet (no report_history-style endpoint
    // exists for this either) — fall through to an honest zero-assessed state
    // rather than fabricating scores. This starts returning real numbers the
    // moment GET /api/compliance?orgId= exists on the backend.
    let liveScores: BackendFrameworkScore[] = [];
    try {
        const response = await fetch(`${BACKEND_URL}/api/compliance?orgId=${encodeURIComponent(orgId)}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) liveScores = data;
        }
    } catch {
        // ignored — honest zero-state below
    }

    const scoreById = new Map(liveScores.map((s) => [s.framework_id, s]));

    const frameworks = COMPLIANCE_FRAMEWORKS.map((f) => {
        const live = scoreById.get(f.id);
        const assessed = live?.assessed ?? 0;
        const compliant = live?.compliant ?? 0;
        return {
            id: f.id,
            name: f.name,
            shortName: f.shortName,
            description: f.description,
            totalControls: f.totalControls,
            assessed,
            compliant,
            score: f.totalControls > 0 ? Math.round((compliant / f.totalControls) * 100) : 0,
        };
    });

    res.json(frameworks);
});

interface AssessmentBody {
    orgId?: number | string;
    controlId?: number;
    status?: string;
    notes?: string;
    assessedBy?: string;
}

// POST /api/compliance
router.post('/', async (req: AuthRequest, res) => {
    const body = req.body as AssessmentBody;
    const requested = body.orgId != null ? String(body.orgId) : null;
    const orgId = resolveOrgId(req, requested);
    if (!orgId || !body.controlId || !body.status) {
        res.status(400).json({ error: 'orgId, controlId, and status are required' });
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/compliance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, orgId }),
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error('backend rejected assessment');
        const data = await response.json();
        res.json(data);
    } catch {
        res.status(502).json({ error: 'Compliance backend is not deployed yet — this assessment was not saved.' });
    }
});

// GET /api/compliance/controls
router.get('/controls', async (req: AuthRequest, res) => {
    const frameworkId = typeof req.query.frameworkId === 'string' ? req.query.frameworkId : null;
    const requested = typeof req.query.orgId === 'string' ? req.query.orgId : null;
    const orgId = resolveOrgId(req, requested);
    if (!frameworkId) {
        res.status(400).json({ error: 'frameworkId is required' });
        return;
    }

    try {
        const params = new URLSearchParams({ frameworkId });
        if (orgId) params.set('orgId', orgId);
        const response = await fetch(`${BACKEND_URL}/api/compliance/controls?${params.toString()}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error('not available');
        const data = await response.json();
        res.json(Array.isArray(data) ? data : []);
    } catch {
        // No compliance backend deployed yet — empty control list rather than fabricated rows.
        res.json([]);
    }
});

export default router;
