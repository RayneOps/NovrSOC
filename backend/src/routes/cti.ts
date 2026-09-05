import { Router } from 'express';
import { enrichIOC, type IOCType } from '../services/iocEnrichment';
import { otxGetPulses } from '../services/otx';
import { getSupabase } from '../services/geoEnrichment';
import { searchCensys, isConfigured as censysConfigured } from '../services/censys';

const router = Router();

const VALID_IOC_TYPES: IOCType[] = ['ip', 'domain', 'hash', 'url'];
const PRIVATE_IP_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/;

// ── IOC Lookup ────────────────────────────────────────────────────

// POST /api/cti/lookup
// Body: { value: "1.2.3.4", type: "ip" }
router.post('/lookup', async (req, res) => {
    const { value, type } = req.body ?? {};
    if (!value || !type) {
        res.status(400).json({ error: 'value and type required' });
        return;
    }
    if (!VALID_IOC_TYPES.includes(type)) {
        res.status(400).json({ error: `type must be: ${VALID_IOC_TYPES.join(', ')}` });
        return;
    }

    // Skip private IPs
    if (type === 'ip' && PRIVATE_IP_RE.test(value)) {
        res.json({
            value,
            type,
            risk_score: 0,
            verdict: 'clean',
            note: 'Private/internal IP address',
            sources: { otx: null, abuseipdb: null, urlhaus: null, threatfox: null },
            tags: ['private'],
            enriched_at: new Date().toISOString(),
        });
        return;
    }

    try {
        const result = await enrichIOC(value, type as IOCType);

        // Cache to Supabase ioc_enrichments table — non-fatal if it fails or isn't configured
        try {
            const supabase = getSupabase();
            if (supabase) {
                await supabase.from('ioc_enrichments').upsert({
                    ioc_value: value,
                    ioc_type: type,
                    risk_score: result.risk_score,
                    otx_pulse_count: result.sources.otx?.pulse_count || 0,
                    abuseipdb_confidence: result.sources.abuseipdb?.confidence || 0,
                    country_code: result.sources.abuseipdb?.country || null,
                    isp: result.sources.abuseipdb?.isp || null,
                    is_tor: result.sources.abuseipdb?.is_tor || false,
                    tags: result.tags,
                    source: 'manual_lookup',
                    last_seen: new Date().toISOString(),
                }, { onConflict: 'ioc_value' });
            }
        } catch {
            // caching failure should not break the response
        }

        res.json(result);
    } catch (err) {
        console.error('[CTI] Lookup error:', err);
        res.status(500).json({ error: 'Enrichment failed' });
    }
});

// GET /api/cti/feed?limit=50&type=ip&min_score=50
// Returns recently looked-up IOCs from Supabase cache
router.get('/feed', async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
    const minScore = Number(req.query.min_score) || 0;

    try {
        const supabase = getSupabase();
        if (!supabase) {
            res.json({ iocs: [], count: 0 });
            return;
        }

        let query = supabase
            .from('ioc_enrichments')
            .select('*')
            .gte('risk_score', minScore)
            .order('last_seen', { ascending: false })
            .limit(limit);

        if (typeFilter) query = query.eq('ioc_type', typeFilter);

        const { data, error } = await query;
        if (error) throw error;

        res.json({ iocs: data || [], count: data?.length || 0 });
    } catch (err) {
        console.error('[CTI] Feed fetch error:', err);
        res.status(500).json({ error: 'Feed fetch failed' });
    }
});

// GET /api/cti/pulses?limit=20
router.get('/pulses', async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 20;
        const pulses = await otxGetPulses(limit);
        res.json({ pulses, count: pulses.length });
    } catch (err) {
        console.error('[CTI] Pulse fetch error:', err);
        res.status(500).json({ error: 'Pulse fetch failed' });
    }
});

// GET /api/cti/stats
// Summary stats for the CTI dashboard header
router.get('/stats', async (_req, res) => {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            res.json({ total: 0, malicious: 0, suspicious: 0, clean: 0 });
            return;
        }

        const { data } = await supabase.from('ioc_enrichments').select('risk_score');
        const iocs = (data || []) as { risk_score: number }[];

        res.json({
            total: iocs.length,
            malicious: iocs.filter((i) => i.risk_score >= 70).length,
            suspicious: iocs.filter((i) => i.risk_score >= 30 && i.risk_score < 70).length,
            clean: iocs.filter((i) => i.risk_score < 30).length,
        });
    } catch (err) {
        console.error('[CTI] Stats error:', err);
        res.status(500).json({ error: 'Stats failed' });
    }
});

// GET /api/cti/censys?q=... — network exposure search (services/censys.ts), surfaced on the
// Network Topology page. No credentials configured in this environment (CENSYS_API_ID/
// CENSYS_API_SECRET), so this reports `configured: false` honestly rather than a fake result —
// isConfigured() is exposed separately so the frontend can show that state without needing to
// fire a query first.
router.get('/censys', async (req, res) => {
    if (!censysConfigured()) {
        res.json({ configured: false, results: [], total: 0 });
        return;
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
        res.status(400).json({ error: 'q query param required' });
        return;
    }
    const result = await searchCensys(q);
    res.json({ configured: true, ...result });
});

export default router;
