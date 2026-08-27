import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { botProtection } from './middleware/auth';

import authRouter from './routes/auth';
import portalRouter from './routes/portal';
import accountRouter from './routes/account';
import customersRouter from './routes/customers';
import advisoriesRouter from './routes/advisories';
import complianceRouter from './routes/compliance';
import vendorAssessmentsRouter from './routes/vendor-assessments';
import scanRouter from './routes/scan';
import dnsRouter from './routes/dns';
import domainsRouter from './routes/domains';
import reportsRouter from './routes/reports';
import novrAiRouter from './routes/novr-ai';
import ctipRouter from './routes/ctip';
import threatIntelRouter from './routes/threat-intel';
import wazuhRouter from './routes/wazuh';
import geoRouter from './routes/geo';
import brandRouter from './routes/brand';
import domainSuiteRouter from './routes/domainSuite';
import contactRouter from './routes/contact';
import threatRouter from './routes/threat';
import ctiRouter from './routes/cti';
import urlscanRouter from './routes/urlscan';
import webscanRouter from './routes/webscan';
import emailSecurityRouter from './routes/emailSecurity';
import vendorsRouter from './routes/vendors';
import dataRecoveryRouter from './routes/dataRecovery';
import slaRouter from './routes/sla';
import alertsRouter from './routes/alerts';
import threatManagementRouter from './routes/threatManagement';
import incidentResponseRouter from './routes/incidentResponse';
import weblogicRouter from './routes/weblogic';
import assetsRouter from './routes/assets';
import dashboardRouter from './routes/dashboard';
import handoverRouter from './routes/handover';
import emailRouter from './routes/email';
import orgCTIRouter from './routes/orgCTI';
import { runCTIWatcher } from './jobs/ctiWatcher';
import platformRouter from './routes/platform';

const app = express();
const PORT = Number(process.env.PORT || 8080);

// Health check routes — registered before every other app.use() on purpose, not just
// commented as such (a prior version of this file had that comment on a /health route that
// was actually registered after helmet, a permissions-policy middleware, the HTTPS-redirect
// below, cors, and express.json — the comment was simply wrong about what the code did).
// This matters concretely for Railway: its healthcheck prober hits the container directly
// over Railway's internal network, not through the public HTTPS edge, so it never sends
// `x-forwarded-proto: https`. The production-only HTTPS-redirect middleware further down
// treats that as "insecure request" and 301s it — which a healthcheck prober does not follow,
// so it read as "unreachable" even though the process was up and the route existed. Placing
// these two routes before any middleware at all — no helmet headers, no redirect, no CORS, no
// body parsing, no rate limit — guarantees a direct 200 no matter what headers the caller did
// or didn't send.
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy' });
});
app.get('/', (_req, res) => {
    res.status(200).json({ ok: true, service: 'novrsoc-backend' });
});

// middleware/auth.ts's requireAuth exists and is ready, but is deliberately NOT mounted here.
// Verified before this security pass: zero fetch() calls anywhere in frontend/src send an
// Authorization header today. Mounting `app.use('/api', requireAuth)` (minus an exemption
// list) right now would 401 every request the app currently makes — the whole admin
// dashboard and client portal, not a short whitelist of routes to fix up after. Wire it in
// once the frontend attaches `Authorization: Bearer <token>` to its calls; see
// middleware/auth.ts's AUTH_EXEMPT_PATHS for the routes that must stay exempt even then
// (including /api/portal/* generally — that proxies to a separate backend with its own JWTs).

// Origins allowed to call this API with credentials. Known Vercel deployments (prod +
// preview) and local dev ports are listed explicitly; FRONTEND_URL and the legacy
// comma-separated FRONTEND_ORIGIN are folded in too so a Railway env var can add one
// without a code change or override what's hardcoded here.
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://socnovr.vercel.app',
    'https://novrsoc-prev.vercel.app',
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_ORIGIN?.split(',').map((o) => o.trim()) ?? []),
].filter((o): o is string => Boolean(o));

// This backend only ever serves JSON, never HTML, so most of helmet's CSP directives are
// inert here in practice (a browser only enforces a response's CSP against the document that
// response itself renders as — fetch()/XHR responses from other tabs/scripts aren't governed
// by it). Kept anyway as defense-in-depth and to satisfy the security review baseline;
// next.config.ts carries the headers that actually matter for what the frontend renders.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://api.anthropic.com', 'https://*.supabase.co'],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' },
}));

app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// Redirect HTTP to HTTPS in production (Railway terminates TLS in front of this process and
// forwards x-forwarded-proto, so this is the only place that can see the original scheme).
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Rate limiting — auth endpoints get a tight per-IP window (stacks with the general limiter
// below); everything else gets the looser general one. skipSuccessfulRequests on the auth
// limiter means only *failed* attempts count toward the 10/15min cap, so a legitimate user
// who mistypes their password a couple of times before succeeding isn't penalised.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts — try again in 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth', authLimiter, botProtection);
app.use('/api/portal/auth', authLimiter, botProtection);
app.use('/api', apiLimiter);

app.use('/api/auth', authRouter);
app.use('/api/portal', portalRouter);
app.use('/api/account', accountRouter);
app.use('/api/customers', customersRouter);
app.use('/api/advisories', advisoriesRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/vendor-assessments', vendorAssessmentsRouter);
app.use('/api/scan', scanRouter);
app.use('/api/dns', dnsRouter);
app.use('/api/domains', domainsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/novr-ai', novrAiRouter);
app.use('/api/ctip', ctipRouter);
app.use('/api/threat-intel', threatIntelRouter);
app.use('/api/wazuh', wazuhRouter);
app.use('/api/geo', geoRouter);
app.use('/api/brand/domains', domainSuiteRouter);
app.use('/api/brand', brandRouter);
app.use('/api/contact', contactRouter);
app.use('/api/threat', threatRouter);
app.use('/api/cti', ctiRouter);
app.use('/api/urlscan', urlscanRouter);
app.use('/api/webscan', webscanRouter);
app.use('/api/email', emailSecurityRouter);
// Same '/api/email' prefix as emailSecurityRouter above (DMARC domain monitoring /
// messaging gateway checks) — this one is outbound send (SendGrid alerts/reports) plus the
// Mailgun DMARC inbound webhook. Sub-paths don't collide; kept distinct files since the two
// are different concerns (sending vs. scanning) that happen to share a URL namespace.
app.use('/api/email', emailRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/recovery', dataRecoveryRouter);
app.use('/api/sla', slaRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/threats', threatManagementRouter);
app.use('/api/incidents', incidentResponseRouter);
app.use('/api/weblogic', weblogicRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/handover', handoverRouter);
app.use('/api/org-cti', orgCTIRouter);
app.use('/api/platform', platformRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`novrsoc-backend listening on http://localhost:${PORT}`);
});

// CTI watcher — periodically folds newly-seen external IPs from Wazuh alerts into the org CTI
// store (lib/orgCtiStore.ts). Runs once on boot, then every 5 minutes; unref() so it can't
// keep the process alive on its own (matches Node's default expectation that a bare interval
// shouldn't block a clean shutdown).
//
// runCTIWatcher() already catches every error internally (a Wazuh connection failure there
// logs and returns, it never throws/rejects) — a synchronous try/catch wrapped around the call
// site below would NOT actually add protection, since that only catches synchronous throws,
// not a promise that rejects later. The real belt-and-suspenders equivalent is the .catch()
// below: if runCTIWatcher's own handling were ever accidentally broken by a future edit, an
// unhandled rejection here would otherwise crash the process outright on modern Node (default
// behavior since Node 15) — this is what actually stands between "Wazuh down" and "server down".
const startCTIWatcher = () => {
    runCTIWatcher().catch((err) => {
        console.log(`CTI Watcher: Wazuh indexer unavailable, will retry (${err instanceof Error ? err.message : err})`);
    });
};
startCTIWatcher();
setInterval(startCTIWatcher, 5 * 60 * 1000).unref();
