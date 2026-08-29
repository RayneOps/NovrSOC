import { Router } from 'express';

// Org onboarding wizard — POST /api/organisations/:id/setup persists the 4-step form
// (frontend/src/app/admin/settings/organisations/[id]/setup) in memory. There is no
// organisations table in Supabase yet (see app/admin/settings/organisations/page.tsx's own
// comment — that whole list is mock data too), so "in memory" here means exactly that: gone on
// restart. Swap for a real table + persistence the moment one exists; the request/response
// shape below is designed not to need to change when that happens.

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

const setupStore = new Map<string, OrgSetup>();

// GET /api/organisations/:id/setup — read back whatever's saved so far, so the wizard can
// resume instead of always starting blank.
router.get('/:id/setup', (req, res) => {
    const existing = setupStore.get(req.params.id);
    res.json(existing ?? { orgId: req.params.id, setup_complete: false });
});

// POST /api/organisations/:id/setup
router.post('/:id/setup', (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<Omit<OrgSetup, 'orgId' | 'setup_complete' | 'updated_at'>>;

    const setup: OrgSetup = {
        orgId: id,
        basicInfo: body.basicInfo ?? { name: '', industry: '', plan: '' },
        frameworks: body.frameworks ?? [],
        contacts: body.contacts ?? { cisoName: '', cisoEmail: '', itDirectorEmail: '', onCallPhone: '' },
        wazuhGroup: body.wazuhGroup ?? '',
        setup_complete: true,
        updated_at: new Date().toISOString(),
    };
    setupStore.set(id, setup);

    res.json({ success: true, setup_complete: true });
});

export default router;
