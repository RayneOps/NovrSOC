import { Router } from 'express';
import { enrichIP, enrichIPBatch, getSupabase } from '../services/geoEnrichment';

const router = Router();

// GET /api/geo/enrich?ip=102.89.45.13
router.get('/enrich', async (req, res) => {
    const { ip } = req.query;
    if (!ip || typeof ip !== 'string') {
        res.status(400).json({ error: 'ip parameter required' });
        return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        res.status(400).json({ error: 'Invalid IP address format' });
        return;
    }

    // Skip private IPs
    const privateRanges = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/;
    if (privateRanges.test(ip)) {
        res.json({ ip, is_private: true, country_code: 'PRIVATE' });
        return;
    }

    try {
        const enriched = await enrichIP(ip);
        res.json(enriched);
    } catch (error) {
        console.error('Geo enrichment error:', error);
        res.status(500).json({ error: 'Enrichment failed', ip });
    }
});

// POST /api/geo/enrich/batch
// Body: { ips: ['1.2.3.4', '5.6.7.8'] }
router.post('/enrich/batch', async (req, res) => {
    const { ips } = req.body ?? {};
    if (!Array.isArray(ips) || ips.length === 0) {
        res.status(400).json({ error: 'ips array required' });
        return;
    }
    if (ips.length > 50) {
        res.status(400).json({ error: 'Maximum 50 IPs per batch' });
        return;
    }

    try {
        const results = await enrichIPBatch(ips);
        res.json(Object.fromEntries(results));
    } catch {
        res.status(500).json({ error: 'Batch enrichment failed' });
    }
});

// GET /api/geo/nigeria/states — for the Nigeria map
// Pulled from Supabase's nigeria_state_threats table — pre-computed nightly, not live enrichment.
router.get('/nigeria/states', async (_req, res) => {
    const sb = getSupabase();
    if (!sb) {
        res.status(503).json({ error: 'Supabase not configured' });
        return;
    }

    try {
        const { data, error } = await sb
            .from('nigeria_state_threats')
            .select('*')
            .order('threat_score', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Nigeria state threats fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch state threats' });
    }
});

export default router;
