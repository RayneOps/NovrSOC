import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getSupabase } from '../services/geoEnrichment';

const router = Router();

// Was a proxy to APP_API_BASE_URL (confirmed dead). No frontend page currently calls this route
// (checked — zero matches for /api/account anywhere in frontend/src), so there's no existing
// response contract to preserve; replaced with the token's own identity claims plus a real
// Supabase lookup of the caller's organisation, rather than another external proxy.
// requireAuth applied at the route level (not index.ts) since this file isn't in the set of
// routers confirmed safe to gate globally — this endpoint only makes sense for an authenticated
// caller anyway, so gating it here doesn't add scope beyond what it already needed.
router.get('/', requireAuth, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorised' });
        return;
    }

    let organisation: { id: string; name: string; plan: string; industry: string | null } | null = null;
    const supabase = getSupabase();
    if (supabase && user.org_id) {
        const { data } = await supabase
            .from('organisations')
            .select('id, name, plan, industry')
            .eq('slug', user.org_id)
            .maybeSingle();
        organisation = data ?? null;
    }

    res.json({
        id: user.sub,
        email: user.email,
        role: user.role,
        org_id: user.org_id,
        name: user.email?.split('@')[0] ?? user.sub,
        organisation,
        source: organisation ? 'jwt+supabase' : 'jwt',
    });
});

export default router;
