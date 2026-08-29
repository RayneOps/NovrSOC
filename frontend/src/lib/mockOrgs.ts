// Mock client roster — replace with a real organisations table once one exists (today every
// client-facing number elsewhere in the app — agents, alerts, incidents — is either live
// Wazuh data or per-feature demo data; there is no persisted "list of onboarded orgs" yet).
// Shared between the organisations list page and the org setup wizard (Step 1 pre-fill) rather
// than duplicated, and kept out of page.tsx (page files are a routing convention, not meant to
// be imported from elsewhere as a plain module).
export interface MockOrg {
    id: string;
    name: string;
    industry: string;
    plan: 'Starter' | 'Professional' | 'Enterprise';
    agents: number;
    domains: number;
    status: 'active' | 'trial' | 'suspended';
    joined: string;
    monthly_value: number;
}

export const MOCK_ORGS: MockOrg[] = [
    {
        id: 'org_001', name: 'Cybernovr (Internal)', industry: 'Cybersecurity',
        plan: 'Enterprise', agents: 2, domains: 2, status: 'active',
        joined: '2026-01-01', monthly_value: 0,
    },
    {
        id: 'org_002', name: 'Dangote Group', industry: 'Manufacturing',
        plan: 'Professional', agents: 0, domains: 3, status: 'trial',
        joined: '2026-08-10', monthly_value: 799,
    },
];
