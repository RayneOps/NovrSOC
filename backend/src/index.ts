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

const app = express();
const PORT = Number(process.env.PORT || 4001);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`novrsoc-backend listening on http://localhost:${PORT}`);
});
