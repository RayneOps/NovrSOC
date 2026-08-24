'use client';

import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Building2 } from 'lucide-react';

// Mock client roster — replace with a real organisations table once one exists (today every
// client-facing number elsewhere in the app — agents, alerts, incidents — is either live
// Wazuh data or per-feature demo data; there is no persisted "list of onboarded orgs" yet).
interface MockOrg {
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

const MOCK_ORGS: MockOrg[] = [
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

const STATUS_STYLE: Record<MockOrg['status'], string> = {
    active: 'bg-green/10 text-green',
    trial: 'bg-amber/10 text-amber',
    suspended: 'bg-red-500/10 text-red-500',
};

const PLAN_STYLE: Record<MockOrg['plan'], string> = {
    Starter: 'bg-card-muted text-foreground-muted',
    Professional: 'bg-blue/10 text-blue',
    Enterprise: 'bg-purple/10 text-purple',
};

export default function OrganisationsPage() {
    const [orgs] = useState<MockOrg[]>(MOCK_ORGS);
    const [expanded, setExpanded] = useState<string | null>(null);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-black text-foreground">Organisations</h1>
                    <p className="text-xs text-foreground-muted">Administration · All onboarded client organisations</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Orgs', value: orgs.length, color: 'text-foreground' },
                    { label: 'Active', value: orgs.filter((o) => o.status === 'active').length, color: 'text-green' },
                    { label: 'Trial', value: orgs.filter((o) => o.status === 'trial').length, color: 'text-amber' },
                    { label: 'Suspended', value: orgs.filter((o) => o.status === 'suspended').length, color: 'text-red-500' },
                ].map((k) => (
                    <div key={k.label} className="bg-card border border-border rounded-xl p-3">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                        <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                {orgs.map((org) => (
                    <div key={org.id} className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-purple/10 text-purple flex items-center justify-center flex-shrink-0">
                                    <Building2 size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-foreground truncate">{org.name}</p>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${STATUS_STYLE[org.status]}`}>{org.status}</span>
                                    </div>
                                    <p className="text-[10px] text-foreground-muted mt-0.5">
                                        {org.industry} · Joined {org.joined} · {org.agents} agent{org.agents === 1 ? '' : 's'} · {org.domains} domain{org.domains === 1 ? '' : 's'} monitored
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${PLAN_STYLE[org.plan]}`}>{org.plan}</span>
                                {/* The client portal has no multi-org routing yet (one login = one
                                    org context) — this links to the portal itself rather than a
                                    ?org= param nothing would read. */}
                                <a
                                    href="/client/dashboard"
                                    className="flex items-center gap-1 text-[11px] font-bold text-foreground-muted hover:text-foreground border border-border rounded-lg px-2.5 py-1.5"
                                >
                                    <ExternalLink size={12} /> View
                                </a>
                                <button
                                    onClick={() => setExpanded(expanded === org.id ? null : org.id)}
                                    className="flex items-center gap-1 text-[11px] font-bold text-white bg-purple rounded-lg px-2.5 py-1.5"
                                >
                                    Manage {expanded === org.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                            </div>
                        </div>

                        {expanded === org.id && (
                            <div className="border-t border-border bg-card-muted px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button className="text-xs font-bold text-foreground border border-border rounded-lg px-3 py-2 bg-card hover:bg-card-muted transition-colors">
                                    {org.status === 'suspended' ? 'Reinstate Organisation' : 'Suspend Organisation'}
                                </button>
                                <button className="text-xs font-bold text-foreground border border-border rounded-lg px-3 py-2 bg-card hover:bg-card-muted transition-colors">
                                    Change Plan
                                </button>
                                <button className="text-xs font-bold text-foreground border border-border rounded-lg px-3 py-2 bg-card hover:bg-card-muted transition-colors">
                                    Add Domain
                                </button>
                                <a
                                    href="/admin/settings/billing"
                                    className="text-xs font-bold text-purple border border-purple/30 bg-purple/5 rounded-lg px-3 py-2 text-center hover:bg-purple/10 transition-colors"
                                >
                                    View Billing
                                </a>
                                <p className="col-span-2 md:col-span-4 text-[10px] text-foreground-muted">
                                    Monthly value: ${org.monthly_value.toLocaleString()} · Management actions above are not yet wired to a backend — no organisations table exists yet to persist them against.
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
