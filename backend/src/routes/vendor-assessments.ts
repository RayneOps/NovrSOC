import { Router } from 'express';

const router = Router();
const BACKEND_URL = process.env.APP_API_BASE_URL || 'http://138.197.188.132:4000';

// GET /api/vendor-assessments
router.get('/', async (req, res) => {
    try {
        const search = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';
        const response = await fetch(`${BACKEND_URL}/api/vendor-assessments${search}`, { cache: 'no-store' });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ assessments: [] });
    }
});

// POST /api/vendor-assessments
router.post('/', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/vendor-assessments`, {
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

// GET /api/vendor-assessments/:id
router.get('/:id', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/vendor-assessments/${req.params.id}`, { cache: 'no-store' });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ error: 'Failed to reach backend' });
    }
});

// PUT /api/vendor-assessments/:id
router.put('/:id', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/vendor-assessments/${req.params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ error: 'Failed to reach backend' });
    }
});

// DELETE /api/vendor-assessments/:id
router.delete('/:id', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/vendor-assessments/${req.params.id}`, { method: 'DELETE' });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ error: 'Failed to reach backend' });
    }
});

export default router;
