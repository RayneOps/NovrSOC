import { Router } from 'express';
import crypto from 'crypto';

const router = Router();
const BACKEND_URL = process.env.APP_API_BASE_URL || 'http://138.197.188.132:4000';

// Hand-rolled JWT-shaped token (header.payload.signature, HMAC-SHA256) — dev-only, no
// external verification ever happens against it. Avoids pulling in a jsonwebtoken
// dependency for what's purely a local-dev convenience.
function issueDevToken(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', process.env.DEV_TOKEN_SECRET || 'novrsoc-dev-secret')
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}

// POST /api/auth/signin (admin/staff login proxy)
router.post('/signin', async (req, res) => {
    // Dev-mode bypass: only active outside production, and only when DEV_ADMIN_EMAIL /
    // DEV_ADMIN_PASSWORD are explicitly set in the environment. If the submitted
    // credentials match, issue a local dev JWT without ever calling the external API —
    // this exists so the platform is loginable in local/dev setups with no real backend
    // account provisioned yet. Never set these env vars in a production deployment.
    const devEmail = process.env.DEV_ADMIN_EMAIL;
    const devPassword = process.env.DEV_ADMIN_PASSWORD;
    if (process.env.NODE_ENV !== 'production' && devEmail && devPassword) {
        const { email, password } = req.body ?? {};
        if (email === devEmail && password === devPassword) {
            const name = process.env.DEV_ADMIN_NAME || 'Dev Admin';
            const company = process.env.DEV_ADMIN_COMPANY || 'Cybernovr';
            const role = process.env.DEV_ADMIN_ROLE || 'super_admin';
            const nowSeconds = Math.floor(Date.now() / 1000);
            const token = issueDevToken({
                sub: 'dev-admin',
                email: devEmail,
                name,
                company,
                role,
                dev: true,
                iat: nowSeconds,
                exp: nowSeconds + 60 * 60 * 24, // 24h
            });
            res.json({ token, user: { email: devEmail, name, company, role } });
            return;
        }
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/signin`, {
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

// POST /api/auth/google — Google OAuth sign-in proxy. Stubbed ahead of the downstream
// API implementing this: frontend and backend are both wired, but this will 502 until
// APP_API_BASE_URL exposes a matching POST /api/auth/google endpoint of its own.
router.post('/google', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ error: 'Google sign-in is not available yet' });
    }
});

// POST /api/auth/signup — self-serve sign-up proxy. Same stub situation as /google:
// no downstream registration endpoint exists yet, so this 502s until one does.
router.post('/signup', async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ error: 'Sign-up is not available yet. Please contact sales.' });
    }
});

export default router;
