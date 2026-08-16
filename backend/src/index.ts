import 'dotenv/config';
import express from 'express';
import cors from 'cors';

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

const app = express();
const PORT = Number(process.env.PORT || 4001);

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

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check endpoint (Railway uses this) — kept ahead of every other route so it's
// always reachable even if a downstream router throws during registration.
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'novrsoc-backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'novrsoc-backend' });
});

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
app.use('/api/vendors', vendorsRouter);
app.use('/api/recovery', dataRecoveryRouter);
app.use('/api/sla', slaRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/threats', threatManagementRouter);
app.use('/api/incidents', incidentResponseRouter);
app.use('/api/weblogic', weblogicRouter);
app.use('/api/assets', assetsRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`novrsoc-backend listening on http://localhost:${PORT}`);
});
