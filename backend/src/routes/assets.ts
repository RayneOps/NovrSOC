import { Router } from 'express';
import { isConfigured, getAgents } from '../services/wazuh';

// Digital Assets — backed by the Wazuh Manager REST API (services/wazuh.ts). Returns real
// enrolled agents when WAZUH_HOST/WAZUH_PASSWORD are configured; an empty, clearly-labeled
// list otherwise (no mock data — an asset inventory pretending to have hosts it doesn't is
// worse than an honest empty state).
const router = Router();

// GET /api/assets
router.get('/', async (_req, res) => {
    if (!isConfigured()) {
        res.json({ agents: [], count: 0, source: 'unconfigured' });
        return;
    }

    try {
        const agents = await getAgents();
        res.json({ agents, count: agents.length, source: 'wazuh' });
    } catch (err) {
        res.status(502).json({
            agents: [],
            count: 0,
            source: 'error',
            error: err instanceof Error ? err.message : 'Wazuh fetch failed',
        });
    }
});

export default router;
