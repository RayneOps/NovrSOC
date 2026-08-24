import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Built but NOT mounted anywhere yet — see index.ts for why. Ready for whenever the frontend
// is updated to attach `Authorization: Bearer <token>` to its fetch calls; wiring this in
// before that happens would 401 every request the app currently makes (verified: zero fetch
// calls anywhere in frontend/src send an Authorization header today).
export interface AuthRequest extends Request {
    user?: {
        sub: string;
        email: string;
        role: string;
        org_id?: string;
    };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorised — no token' });
    }

    const token = header.slice(7);
    const secret = process.env.JWT_SECRET || process.env.DEV_TOKEN_SECRET;

    if (!secret) {
        return res.status(500).json({ error: 'Server misconfigured — no JWT secret' });
    }

    try {
        const payload = jwt.verify(token, secret) as jwt.JwtPayload;
        req.user = {
            sub: String(payload.sub ?? ''),
            email: String(payload.email ?? ''),
            role: String(payload.role ?? ''),
            org_id: payload.org_id ? String(payload.org_id) : undefined,
        };
        next();
    } catch {
        return res.status(401).json({ error: 'Unauthorised — invalid or expired token' });
    }
}

export function requireRole(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorised' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden — insufficient role' });
        }
        next();
    };
}

// Paths under /api that requireAuth must never gate, checked against the FULL path
// (req.originalUrl's pathname), not just a prefix relative to wherever this gets mounted —
// the spec this was drafted from checked `req.path.startsWith('/auth/')` from an `app.use('/api', ...)`
// mount, which would miss /api/portal/auth/signin entirely (its path there is
// '/portal/auth/signin', which doesn't start with '/auth/'). Kept here, next to the
// middleware, so whoever wires this in has the exemption list in one place.
export const AUTH_EXEMPT_PATHS = [
    '/api/auth/signin',
    '/api/auth/google',
    '/api/auth/signup',
    '/api/portal/auth/signin',
];

// Note on /api/portal/*: those routes proxy wholesale to a separate external backend
// (APP_API_BASE_URL) that mints and verifies its own JWTs with its own secret — requireAuth
// verifying against JWT_SECRET/DEV_TOKEN_SECRET would reject every legitimate portal token.
// Don't gate /api/portal/* with this middleware; that proxy already forwards the client's
// Authorization header through untouched and lets the external service verify it.

// Unlike requireAuth, this is mounted globally in index.ts today — it only blocks obvious
// script/bot traffic and a filled honeypot field on auth-shaped paths, so it doesn't depend
// on the frontend sending any token.
export function botProtection(req: Request, res: Response, next: NextFunction) {
    const ua = req.headers['user-agent'] || '';

    // Block obvious bots hitting any auth-shaped path. Checked against req.originalUrl, not
    // req.path — req.path is relative to wherever this middleware is *mounted*, so at
    // '/api/auth' a request to /api/auth/signin has req.path === '/signin' (the '/auth/'
    // prefix is already stripped by the time this runs). originalUrl always has the full
    // request path regardless of mount depth, so this check works the same whether this is
    // mounted narrowly (as it is today, on /api/auth and /api/portal/auth) or ever moved to
    // a broader mount later.
    const botPatterns = /curl|wget|python-requests|scrapy|bot|crawler|spider/i;
    if (botPatterns.test(ua) && req.originalUrl.includes('/auth/')) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Honeypot field — frontend adds a hidden input named _gotcha to login forms; anything
    // that fills it in is a bot (real users never see or fill in a hidden field).
    if (req.body?._gotcha) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    next();
}
