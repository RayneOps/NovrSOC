import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth';

const router = Router();
const BACKEND_URL = process.env.APP_API_BASE_URL || 'http://138.197.188.132:4000';

// requireAuth is mounted on this router (see index.ts) — req.user is always populated here.
// This route is a pure proxy with no local data of its own to filter, so real per-org
// filtering still depends on APP_API_BASE_URL actually honouring the org_id param below —
// that's outside this repo. What this DOES fix: an org user can no longer omit/spoof org_id
// to pull every customer; a super_admin (full MSSP staff) still sees the unfiltered list.
router.get('/', async (req: AuthRequest, res) => {
    try {
        const url = new URL(`${BACKEND_URL}/api/customers`);
        if (req.user?.role !== 'super_admin' && req.user?.org_id) {
            url.searchParams.set('org_id', req.user.org_id);
        }
        const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ customers: [] });
    }
});

router.post('/', async (req: AuthRequest, res) => {
    try {
        const body = req.user?.role !== 'super_admin' && req.user?.org_id
            ? { ...req.body, org_id: req.user.org_id }
            : req.body;
        const response = await fetch(`${BACKEND_URL}/api/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ error: 'Failed to reach backend' });
    }
});

export default router;
