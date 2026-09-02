import { Router } from 'express';
import crypto from 'crypto';
import { logAudit } from '../lib/audit';

const router = Router();
const BACKEND_URL = process.env.APP_API_BASE_URL || 'http://138.197.188.132:4000';

// Hand-rolled JWT-shaped token (header.payload.signature, HMAC-SHA256) — dev-only convenience,
// avoids pulling in a jsonwebtoken dependency just to sign these. IS verified now: requireAuth
// (middleware/auth.ts) checks this signature on every request to a protected route — see the
// secret-selection note below for why that verification used to always fail.
function issueDevToken(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    // Must match requireAuth's exact secret-selection order (middleware/auth.ts) — a hotfix
    // for a live production bug found during the requireAuth rollout: this used to sign with
    // DEV_TOKEN_SECRET alone, but requireAuth verifies with JWT_SECRET first, falling back to
    // DEV_TOKEN_SECRET. When both are set (as they are here) to different values — the normal
    // case, they're separate secrets on purpose — every dev-issued token was signed with one
    // secret and verified against the other, so it always failed verification. Confirmed live:
    // a freshly-issued dev-admin token 401'd as "invalid or expired" against every route this
    // rollout just protected. Signing with the same priority order requireAuth verifies with
    // fixes it regardless of which of the two vars is actually set.
    const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || process.env.DEV_TOKEN_SECRET || 'novrsoc-dev-secret')
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}

// POST /api/auth/signin (admin/staff login proxy)
router.post('/signin', async (req, res) => {
    // Admin bypass, gated purely on DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD being set — not on
    // NODE_ENV. Deliberately allowed in production: it's how this platform logs in at all
    // right now, since no downstream account-backed auth exists yet at APP_API_BASE_URL.
    // The env vars ARE the "is this enabled" flag — if they're set (anywhere, including
    // Railway), matching credentials mint a super_admin token. Treat DEV_ADMIN_PASSWORD and
    // DEV_TOKEN_SECRET (below) as real production secrets, not placeholders, and unset
    // DEV_ADMIN_EMAIL/DEV_ADMIN_PASSWORD if this bypass should ever stop being reachable.
    const devEmail = process.env.DEV_ADMIN_EMAIL;
    const devPassword = process.env.DEV_ADMIN_PASSWORD;
    if (devEmail && devPassword) {
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
                // Single-tenant placeholder — see routes/orgCTI.ts's header comment for what's
                // actually needed before this can be a real per-client value (short version:
                // the client portal already issues its own org-scoped tokens via a separate
                // external auth backend with its own signing secret, which this backend's
                // requireAuth can't verify — org-cti's tenancy therefore isn't just "read
                // org_id off the token," it needs to handle two structurally different token
                // sources first).
                org_id: 'cybernovr',
                dev: true,
                iat: nowSeconds,
                exp: nowSeconds + 60 * 60 * 24, // 24h
            });
            logAudit({
                user: devEmail,
                action: 'LOGIN',
                resource: 'Admin Portal',
                ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
                result: 'success',
            });
            res.json({ token, user: { email: devEmail, name, company, role } });
            return;
        }
        // Wrong credentials against the dev bypass — worth a failed-login audit entry too,
        // same as a genuinely wrong password would be once real account auth exists.
        logAudit({
            user: (req.body?.email as string) || 'unknown',
            action: 'LOGIN',
            resource: 'Admin Portal',
            ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
            result: 'failed',
        });
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
            signal: AbortSignal.timeout(5000),
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
            signal: AbortSignal.timeout(5000),
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
            signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({ error: 'Sign-up is not available yet. Please contact sales.' });
    }
});

export default router;
