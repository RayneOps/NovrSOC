import { Router } from 'express';

const router = Router();
const BACKEND_URL = process.env.APP_API_BASE_URL || 'http://138.197.188.132:4000';

router.get('/', async (req, res) => {
    try {
        const search = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';
        const response = await fetch(`${BACKEND_URL}/api/advisories${search}`, { cache: 'no-store' });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ advisories: [] });
    }
});

router.post('/', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/advisories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ error: 'Failed to reach backend' });
    }
});

export default router;
