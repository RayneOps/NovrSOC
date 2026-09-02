import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { getSupabase } from '../services/geoEnrichment';

const router = Router();

// Was a proxy to APP_API_BASE_URL (138.197.188.132:4000, confirmed dead from Railway's own
// network). Replaced with a direct query against the real `organisations` table — schema
// verified live against Supabase before writing this (id UUID, name, slug, plan, industry,
// country, is_active; no status/agentsTotal/activeIncidents/wazuhGroup columns exist, so
// those are honestly derived/zeroed below rather than invented). req.user.org_id is the JWT's
// slug-style claim (e.g. "cybernovr"), which maps to `slug`, not the UUID `id` column — a
// literal `.eq('id', orgId)` would silently never match anything.
router.get('/', async (req: AuthRequest, res) => {
    const supabase = getSupabase();
    if (!supabase) {
        res.status(503).json({ customers: [], error: 'Supabase not configured' });
        return;
    }

    try {
        let query = supabase.from('organisations').select('id, name, slug, plan, industry, country, is_active, created_at');
        if (req.user?.role !== 'super_admin' && req.user?.org_id) {
            query = query.eq('slug', req.user.org_id);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        const customers = (data ?? []).map((org) => ({
            id: org.id,
            name: org.name,
            industry: org.industry,
            status: org.is_active ? 'active' : 'inactive',
            // No agent/incident/wazuh-group columns on this table, and nothing yet joins
            // an org to a Wazuh group — honest zero/null rather than a fabricated count.
            agentsTotal: 0,
            activeIncidents: 0,
            wazuhGroup: null as string | null,
        }));

        res.json({ customers, total: customers.length, source: 'supabase' });
    } catch (err) {
        console.error('[customers] Supabase query failed:', err);
        res.status(502).json({ customers: [], error: 'Query failed' });
    }
});

router.post('/', async (req: AuthRequest, res) => {
    const supabase = getSupabase();
    if (!supabase) {
        res.status(503).json({ error: 'Supabase not configured' });
        return;
    }

    const { name, industry, plan, country } = req.body ?? {};
    if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    try {
        const { data, error } = await supabase
            .from('organisations')
            .insert({ name, slug, industry: industry ?? null, plan: plan ?? 'starter', country: country ?? null, is_active: true })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json({ customer: data, source: 'supabase' });
    } catch (err) {
        console.error('[customers] Supabase insert failed:', err);
        res.status(502).json({ error: err instanceof Error ? err.message : 'Insert failed' });
    }
});

export default router;
