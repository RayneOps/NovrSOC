import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { getSupabase } from '../services/geoEnrichment';

const router = Router();

// Was a proxy to APP_API_BASE_URL (138.197.188.132:4000, confirmed dead from Railway's own
// network). Replaced with direct Supabase queries — schema verified live before writing this:
// organisations(id uuid, name, slug, ...), compliance_frameworks(id uuid, name, total_controls,
// ...), compliance_assessments(id uuid, org_id uuid FK, framework_id uuid FK, control_id text,
// control_name text, status text default 'not_assessed', assessed_by uuid FK users.id,
// assessed_at, notes, ...). There is no separate "control catalog" table — a framework's
// control list is exactly whatever rows exist in compliance_assessments for it, which today is
// none (table is empty). That means the control-list pages will keep showing "No controls
// loaded" until either someone seeds a few rows directly in Supabase or a future task builds a
// real catalog — this fix makes the read/write paths real and persistent, it doesn't invent
// data that doesn't exist. See PRODUCTION_NOTES.md for the full writeup.

// requireAuth is mounted on this router (see index.ts) — req.user is always populated by the
// time a handler below runs. Trusts the token's own org_id, full stop — the frontend's
// `?orgId=1`/`orgId: 1` on every call is vestigial from before real orgs/slugs existed (it
// doesn't match anything real), and a previous version of this function let a super_admin's
// query param override the token, which meant the dev-admin's own requests were silently
// resolving to a nonexistent org "1" instead of the real "cybernovr" — caught while verifying
// this fix against live data, not by inspection alone.
function resolveOrgId(req: AuthRequest): string {
    return req.user?.org_id || '';
}

// Nigerian-context reference list this app has always shown (NDPA/CBN/NCC are Nigeria-specific
// frameworks with no upstream international registry to pull from — kept as static metadata,
// same as before). Mapped to the 5 real rows Supabase actually has today by name: NDPR is the
// 2019 regulation NDPA's 2023 Act formally replaced — same subject, matched deliberately, not a
// guess. CBN, NCC, and SWIFT CSP have no Supabase row yet, so they stay an honest zero exactly
// as they were under the old dead-proxy fallback — nothing regresses for them, they just aren't
// backed by anything live yet either.
export const COMPLIANCE_FRAMEWORKS = [
    { id: 1, name: 'Nigeria Data Protection Act', shortName: 'NDPA', description: 'Nigerian data protection regulation', totalControls: 20, supabaseName: 'NDPR' },
    { id: 2, name: 'CBN Cybersecurity Framework', shortName: 'CBN', description: 'Central Bank of Nigeria cybersecurity requirements', totalControls: 25, supabaseName: null },
    { id: 3, name: 'NCC Cybersecurity Regulations', shortName: 'NCC', description: 'Nigerian Communications Commission security rules', totalControls: 20, supabaseName: null },
    { id: 4, name: 'ISO/IEC 27001:2022', shortName: 'ISO 27001', description: 'International information security management', totalControls: 30, supabaseName: 'ISO27001' },
    { id: 5, name: 'PCI DSS v4.0', shortName: 'PCI-DSS', description: 'Payment card industry data security standard', totalControls: 25, supabaseName: 'PCI-DSS' },
    { id: 6, name: 'NIST Cybersecurity Framework', shortName: 'NIST CSF', description: 'NIST cybersecurity framework', totalControls: 23, supabaseName: 'NIST CSF' },
    { id: 7, name: 'SWIFT Customer Security Programme', shortName: 'SWIFT CSP', description: 'SWIFT financial messaging security', totalControls: 22, supabaseName: null },
];

interface SupabaseFramework { id: string; name: string; total_controls: number }
interface SupabaseAssessment { framework_id: string; status: string }
interface SupabaseOrg { id: string }

// GET /api/compliance
router.get('/', async (req: AuthRequest, res) => {
    const orgId = resolveOrgId(req);
    if (!orgId) {
        res.status(400).json({ error: 'No org_id on token' });
        return;
    }

    const supabase = getSupabase();
    if (!supabase) {
        res.json(COMPLIANCE_FRAMEWORKS.map((f) => ({ id: f.id, name: f.name, shortName: f.shortName, description: f.description, totalControls: f.totalControls, assessed: 0, compliant: 0, score: 0 })));
        return;
    }

    try {
        const { data: org } = await supabase.from('organisations').select('id').eq('slug', orgId).maybeSingle<SupabaseOrg>();

        const { data: sbFrameworks } = await supabase.from('compliance_frameworks').select('id, name, total_controls');
        const byName = new Map((sbFrameworks ?? []).map((f: SupabaseFramework) => [f.name, f]));

        let assessments: SupabaseAssessment[] = [];
        if (org) {
            const { data } = await supabase.from('compliance_assessments').select('framework_id, status').eq('org_id', org.id);
            assessments = data ?? [];
        }

        const frameworks = COMPLIANCE_FRAMEWORKS.map((f) => {
            const sbf = f.supabaseName ? byName.get(f.supabaseName) : undefined;
            const rows = sbf ? assessments.filter((a) => a.framework_id === sbf.id) : [];
            const assessed = rows.length;
            const compliant = rows.filter((a) => a.status === 'compliant').length;
            const totalControls = sbf?.total_controls ?? f.totalControls;
            return {
                id: f.id,
                name: f.name,
                shortName: f.shortName,
                description: f.description,
                totalControls,
                assessed,
                compliant,
                score: totalControls > 0 ? Math.round((compliant / totalControls) * 100) : 0,
            };
        });

        res.json(frameworks);
    } catch (err) {
        console.error('[compliance] Supabase query failed:', err);
        res.json(COMPLIANCE_FRAMEWORKS.map((f) => ({ id: f.id, name: f.name, shortName: f.shortName, description: f.description, totalControls: f.totalControls, assessed: 0, compliant: 0, score: 0 })));
    }
});

interface AssessmentBody {
    frameworkId?: number;
    controlId?: string;
    controlName?: string;
    status?: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
    notes?: string;
}

// POST /api/compliance — upserts one control's assessment, keyed on (org, framework, control_id).
// Requires `frameworkId` (the numeric id from COMPLIANCE_FRAMEWORKS above) in the body now —
// the previous contract only sent controlId/status/orgId with no way to know which framework a
// brand-new control belonged to. See ComplianceFramework.tsx's assess() for the matching change.
router.post('/', async (req: AuthRequest, res) => {
    const orgId = resolveOrgId(req);
    const body = req.body as AssessmentBody;
    if (!orgId || !body.frameworkId || !body.controlId || !body.status) {
        res.status(400).json({ error: 'frameworkId, controlId, and status are required' });
        return;
    }

    const meta = COMPLIANCE_FRAMEWORKS.find((f) => f.id === body.frameworkId);
    if (!meta?.supabaseName) {
        res.status(501).json({ error: `${meta?.shortName ?? 'This framework'} has no matching entry in Supabase yet — cannot save an assessment against it.` });
        return;
    }

    const supabase = getSupabase();
    if (!supabase) {
        res.status(503).json({ error: 'Supabase not configured' });
        return;
    }

    try {
        const { data: org, error: orgErr } = await supabase.from('organisations').select('id').eq('slug', orgId).maybeSingle<SupabaseOrg>();
        if (orgErr || !org) throw new Error('org not found');

        const { data: sbFramework } = await supabase.from('compliance_frameworks').select('id').eq('name', meta.supabaseName).maybeSingle<{ id: string }>();
        if (!sbFramework) throw new Error('framework not found in Supabase');

        let assessedBy: string | null = null;
        if (req.user?.email) {
            const { data: userRow } = await supabase.from('users').select('id').eq('email', req.user.email).maybeSingle<{ id: string }>();
            assessedBy = userRow?.id ?? null;
        }

        const { data, error } = await supabase
            .from('compliance_assessments')
            .upsert(
                {
                    org_id: org.id,
                    framework_id: sbFramework.id,
                    control_id: body.controlId,
                    control_name: body.controlName ?? body.controlId,
                    status: body.status,
                    notes: body.notes ?? null,
                    assessed_by: assessedBy,
                    assessed_at: new Date().toISOString(),
                },
                { onConflict: 'org_id,framework_id,control_id' },
            )
            .select()
            .single();
        if (error) throw error;

        res.json({ success: true, assessment: data, source: 'supabase' });
    } catch (err) {
        console.error('[compliance] Supabase upsert failed:', err);
        res.status(502).json({ error: err instanceof Error ? err.message : 'Save failed' });
    }
});

// GET /api/compliance/controls
router.get('/controls', async (req: AuthRequest, res) => {
    const frameworkId = typeof req.query.frameworkId === 'string' ? Number(req.query.frameworkId) : null;
    const orgId = resolveOrgId(req);
    if (!frameworkId) {
        res.status(400).json({ error: 'frameworkId is required' });
        return;
    }

    const meta = COMPLIANCE_FRAMEWORKS.find((f) => f.id === frameworkId);
    const supabase = getSupabase();
    if (!supabase || !orgId || !meta?.supabaseName) {
        res.json([]);
        return;
    }

    try {
        const { data: org } = await supabase.from('organisations').select('id').eq('slug', orgId).maybeSingle<SupabaseOrg>();
        const { data: sbFramework } = await supabase.from('compliance_frameworks').select('id').eq('name', meta.supabaseName).maybeSingle<{ id: string }>();
        if (!org || !sbFramework) {
            res.json([]);
            return;
        }

        const { data, error } = await supabase
            .from('compliance_assessments')
            .select('id, control_id, control_name, status, notes')
            .eq('org_id', org.id)
            .eq('framework_id', sbFramework.id)
            .order('control_id');
        if (error) throw error;

        res.json((data ?? []).map((c) => ({ id: c.id, control_id: c.control_id, title: c.control_name, description: '', status: c.status, notes: c.notes })));
    } catch (err) {
        console.error('[compliance/controls] Supabase query failed:', err);
        res.json([]);
    }
});

export default router;
