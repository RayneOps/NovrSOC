'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { apiUrl } from '@/lib/api';

// Mock client roster — same shape/data as the Organisations page (no persisted org table
// exists yet). Kept as a separate literal here rather than importing it, since a real
// billing table will have its own columns (invoices, payment status) that won't map 1:1
// onto the org list anyway.
interface MockBillingOrg {
    id: string;
    name: string;
    plan: 'Starter' | 'Professional' | 'Enterprise';
    monthly_value: number;
    billing_status: 'paid' | 'overdue' | 'trial';
    renews: string; // ISO date
}

const MOCK_BILLING_ORGS: MockBillingOrg[] = [
    { id: 'org_001', name: 'Cybernovr (Internal)', plan: 'Enterprise', monthly_value: 0, billing_status: 'paid', renews: '2026-09-01' },
    { id: 'org_002', name: 'Dangote Group', plan: 'Professional', monthly_value: 799, billing_status: 'trial', renews: '2026-09-10' },
];

const STATUS_STYLE: Record<MockBillingOrg['billing_status'], string> = {
    paid: 'bg-green/10 text-green',
    overdue: 'bg-red-500/10 text-red-500',
    trial: 'bg-amber/10 text-amber',
};

const PLAN_VALUE: Record<MockBillingOrg['plan'], number> = { Starter: 299, Professional: 799, Enterprise: 0 };

interface SLASummary {
    total_endpoints: number;
    breached: number;
    total_credits_usd: number;
}

function daysUntil(iso: string): number {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function BillingPage() {
    const [slaSummary, setSlaSummary] = useState<SLASummary | null>(null);
    const [slaError, setSlaError] = useState(false);

    useEffect(() => {
        fetch(apiUrl('/api/sla/overview'), { cache: 'no-store' })
            .then((r) => r.json())
            .then((d) => setSlaSummary(d?.summary ?? null))
            .catch(() => setSlaError(true));
    }, []);

    const mrr = MOCK_BILLING_ORGS.reduce((sum, o) => sum + o.monthly_value, 0);
    const planCounts = MOCK_BILLING_ORGS.reduce<Record<string, number>>((acc, o) => {
        acc[o.plan] = (acc[o.plan] ?? 0) + 1;
        return acc;
    }, {});
    const upcomingRenewals = MOCK_BILLING_ORGS
        .filter((o) => daysUntil(o.renews) <= 30 && daysUntil(o.renews) >= 0)
        .sort((a, b) => daysUntil(a.renews) - daysUntil(b.renews));

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-lg font-black text-foreground">Billing Overview</h1>
                <p className="text-xs text-foreground-muted">Administration · Revenue, plan distribution, and SLA credit liability across all clients</p>
            </div>

            {/* MRR + top stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Monthly Recurring Revenue</p>
                    <p className="text-2xl font-black text-purple mt-1">${mrr.toLocaleString()}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Paying Clients</p>
                    <p className="text-2xl font-black text-foreground mt-1">{MOCK_BILLING_ORGS.filter((o) => o.monthly_value > 0).length}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Overdue Accounts</p>
                    <p className="text-2xl font-black text-red-500 mt-1">{MOCK_BILLING_ORGS.filter((o) => o.billing_status === 'overdue').length}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Renewals (30d)</p>
                    <p className="text-2xl font-black text-blue mt-1">{upcomingRenewals.length}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                {/* Per-client billing status */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Per-Client Billing Status</p>
                    </div>
                    <div className="divide-y divide-border">
                        {MOCK_BILLING_ORGS.map((o) => (
                            <div key={o.id} className="p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{o.name}</p>
                                    <p className="text-[10px] text-foreground-muted">{o.plan} · ${o.monthly_value.toLocaleString()}/mo</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase shrink-0 ${STATUS_STYLE[o.billing_status]}`}>
                                    {o.billing_status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Plan distribution */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Plan Distribution</p>
                    <div className="space-y-3">
                        {(['Starter', 'Professional', 'Enterprise'] as const).map((plan) => {
                            const count = planCounts[plan] ?? 0;
                            const pct = MOCK_BILLING_ORGS.length > 0 ? (count / MOCK_BILLING_ORGS.length) * 100 : 0;
                            return (
                                <div key={plan}>
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-semibold text-foreground">{plan}</span>
                                        <span className="text-foreground-muted">{count} org{count === 1 ? '' : 's'} · ${PLAN_VALUE[plan]}/mo</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-card-muted overflow-hidden">
                                        <div className="h-full bg-purple rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* SLA credit liability — live from the Recovery Credit feature's real endpoint */}
            <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">SLA Credit Liability</p>
                {slaError ? (
                    <p className="text-xs text-foreground-muted">Could not reach the SLA service.</p>
                ) : !slaSummary ? (
                    <div className="h-16 bg-card-muted rounded-lg animate-pulse" />
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {slaSummary.total_credits_usd > 0 && <AlertTriangle className="w-5 h-5 text-amber shrink-0" />}
                            <div>
                                <p className={`text-2xl font-black ${slaSummary.total_credits_usd > 0 ? 'text-amber' : 'text-green'}`}>
                                    ${slaSummary.total_credits_usd.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-foreground-muted">
                                    {slaSummary.breached} of {slaSummary.total_endpoints} monitored endpoint{slaSummary.total_endpoints === 1 ? '' : 's'} in breach this month
                                </p>
                            </div>
                        </div>
                        <a href="/admin/data/sla" className="flex items-center gap-1 text-[11px] font-bold text-purple hover:underline">
                            View Recovery Credit <ExternalLink size={12} />
                        </a>
                    </div>
                )}
            </div>

            {/* Upcoming renewals */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Upcoming Renewals (Next 30 Days)</p>
                </div>
                {upcomingRenewals.length === 0 ? (
                    <p className="text-xs text-foreground-muted text-center py-8">No renewals due in the next 30 days.</p>
                ) : (
                    <div className="divide-y divide-border">
                        {upcomingRenewals.map((o) => (
                            <div key={o.id} className="p-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-foreground">{o.name}</p>
                                <p className="text-xs text-foreground-muted">{o.renews} · in {daysUntil(o.renews)} day{daysUntil(o.renews) === 1 ? '' : 's'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-[10px] text-foreground-muted">
                MRR, per-client status, plan distribution, and renewals use mock organisation data (no billing table exists yet) — SLA credit liability above is the one figure pulled live from the real Recovery Credit endpoint.
            </p>
        </div>
    );
}
