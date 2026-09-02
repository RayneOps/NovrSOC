import { Router } from 'express';

const router = Router();
const BACKEND_URL = process.env.APP_API_BASE_URL || 'http://138.197.188.132:4000';

// GET /api/account
router.get('/', async (req, res) => {
    try {
        const auth = req.headers.authorization;
        const response = await fetch(`${BACKEND_URL}/api/account`, {
            headers: auth ? { Authorization: auth } : {},
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ error: 'Failed to reach backend' });
    }
});

export default router;
