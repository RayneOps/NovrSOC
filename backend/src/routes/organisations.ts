import { Router } from 'express';
import { getSupabase } from '../services/geoEnrichment';

// Org onboarding wizard — POST /api/organisations/:id/setup persists the 4-step form
// (frontend/src/components/features/OrgSetupWizard.tsx). Backed by Supabase's `org_setup`
// table when configured, falling back to the original in-memory store (gone on restart) when
// it isn't or a call to it fails — matches this codebase's established pattern for optional
// Supabase-backed persistence (see services/geoEnrichment.ts's getSupabase()).
//
// Schema note: `org_setup`'s real columns (confirmed live against the actual table) are
// org_id, compliance_frameworks, contacts, wazuh_group, initial_scores, setup_complete,
// updated_at, created_at — there is NO column for the wizard's step-1 "basic info" (name/
// industry/plan). That step's values are accepted and echoed back within a single request/
// response cycle so the wizard UI keeps working, but they are NOT persisted across reloads
// when Supabase is the active backend (the in-memory fallback path still keeps them, since it
// has nowhere better to put them either, but it doesn't survive a restart anyway). Add a
// basic_info column (or a name/industry/plan set of columns) to persist that step for real.

const router = Router();

interface ComplianceFrameworkSelection {
    framework: string;
    enabled: boolean;
    initialScore: number;
}
interface OrgContacts {
    cisoName: string;
    cisoEmail: string;
    itDirectorEmail: string;
    onCallPhone: string;
}
interface OrgSetup {
    orgId: string;
    basicInfo: { name: string; industry: string; plan: string };
    frameworks: ComplianceFrameworkSelection[];
    contacts: OrgContacts;
    wazuhGroup: string;
    setup_complete: boolean;
    updated_at: string;
}

// In-memory fallback — used when Supabase isn't configured, or a read/write to it fails.
const setupStore = new Map<string, OrgSetup>();

function emptySetup(orgId: string): OrgSetup {
    return {
        orgId,
        basicInfo: { name: '', industry: '', plan: '' },
        frameworks: [],
        contacts: { cisoName: '', cisoEmail: '', itDirectorEmail: '', onCallPhone: '' },
        wazuhGroup: '',
        setup_complete: false,
        updated_at: new Date().toISOString(),
    };
}

// Maps a Supabase org_setup row onto the OrgSetup shape the frontend wizard actually reads.
// `basic_info` doesn't exist as a column (see the file header) — those fields come back empty,
// same as a brand-new org would look via the in-memory path.
//
// compliance_frameworks is confirmed live to be an array column that round-trips each element
// as a JSON-encoded string, not a native object — `["{\"framework\":...}"]`, not
// `[{"framework":...}]` — so each entry needs an explicit JSON.parse, not a plain cast.
function rowToOrgSetup(orgId: string, row: Record<string, unknown>): OrgSetup {
    const frameworks = Array.isArray(row.compliance_frameworks)
        ? row.compliance_frameworks.map((f) => {
            if (typeof f !== 'string') return f as ComplianceFrameworkSelection;
            try {
                return JSON.parse(f) as ComplianceFrameworkSelection;
            } catch {
                return null;
            }
        }).filter((f): f is ComplianceFrameworkSelection => f !== null)
        : [];

    return {
        orgId,
        basicInfo: { name: '', industry: '', plan: '' },
        frameworks,
        contacts: (row.contacts as OrgContacts) ?? { cisoName: '', cisoEmail: '', itDirectorEmail: '', onCallPhone: '' },
        wazuhGroup: typeof row.wazuh_group === 'string' ? row.wazuh_group : '',
        setup_complete: !!row.setup_complete,
        updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
    };
}

// GET /api/organisations/:id/setup — read back whatever's saved so far, so the wizard can
// resume instead of always starting blank.
router.get('/:id/setup', async (req, res) => {
    const { id } = req.params;
    const supabase = getSupabase();

    if (supabase) {
        const { data, error } = await supabase.from('org_setup').select('*').eq('org_id', id).maybeSingle();
        if (!error) {
            res.json(data ? rowToOrgSetup(id, data) : emptySetup(id));
            return;
        }
        console.error('[organisations] Supabase read failed, falling back to in-memory:', error.message);
    }

    res.json(setupStore.get(id) ?? emptySetup(id));
});

// POST /api/organisations/:id/setup
router.post('/:id/setup', async (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<Omit<OrgSetup, 'orgId' | 'setup_complete' | 'updated_at'>>;

    const basicInfo = body.basicInfo ?? { name: '', industry: '', plan: '' };
    const frameworks = body.frameworks ?? [];
    const contacts = body.contacts ?? { cisoName: '', cisoEmail: '', itDirectorEmail: '', onCallPhone: '' };
    const wazuhGroup = body.wazuhGroup ?? '';
    const updated_at = new Date().toISOString();

    const supabase = getSupabase();
    if (supabase) {
        const row = {
            compliance_frameworks: frameworks,
            contacts,
            wazuh_group: wazuhGroup,
            // The dedicated column this table actually has for scores — derived from each
            // enabled framework's initialScore rather than duplicating the whole frameworks
            // array a second time.
            initial_scores: Object.fromEntries(frameworks.map((f) => [f.framework, f.initialScore])),
            setup_complete: true,
            updated_at,
        };

        // `org_id` has no unique/exclusion constraint on this table (confirmed live —
        // .upsert(..., { onConflict: 'org_id' }) 42P10s: "no unique or exclusion constraint
        // matching the ON CONFLICT specification"), so a real upsert isn't available here.
        // Select-then-update-or-insert instead.
        const { data: existing, error: selectError } = await supabase.from('org_setup').select('id').eq('org_id', id).maybeSingle();
        const { error } = selectError
            ? { error: selectError }
            : existing
                ? await supabase.from('org_setup').update(row).eq('org_id', id)
                : await supabase.from('org_setup').insert({ org_id: id, ...row });

        if (!error) {
            res.json({ success: true, source: 'supabase', setup_complete: true });
            return;
        }
        console.error('[organisations] Supabase write failed, falling back to in-memory:', error.message);
    }

    setupStore.set(id, { orgId: id, basicInfo, frameworks, contacts, wazuhGroup, setup_complete: true, updated_at });
    res.json({ success: true, source: 'memory', setup_complete: true, warning: supabase ? 'Supabase write failed — see server logs' : undefined });
});

export default router;
