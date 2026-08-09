'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { getPortalContext } from '@/lib/portal-context';
import { getAuthToken, type AccountData } from '@/lib/account';
import { apiUrl } from '@/lib/api';

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function usageColor(pct: number): string {
    if (pct > 80) return 'bg-red-500';
    if (pct >= 60) return 'bg-amber';
    return 'bg-green';
}

const SERVICES = [
    'Endpoint Monitoring (Wazuh Agent)',
    'Threat Intelligence Feed (CTIP)',
    'Threat Advisory (Sector-filtered)',
    'URL Scanner (AbuseIPDB + CTIP)',
    'Vendor Assessment',
    'Incident Response',
    'CTI Feed Access',
    'MITRE ATT&CK Reference',
];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-semibold text-foreground">{value}</p>
        </div>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="h-[3px] bg-green from-green via-green to-red-500" />
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function AccountPage() {
    const [isPortal, setIsPortal] = useState(false);
    const [account, setAccount] = useState<AccountData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        setIsPortal(getPortalContext().isPortal);
        const token = getAuthToken();
        if (!token) {
            setLoading(false);
            setError(true);
            return;
        }
        fetch(apiUrl('/api/account'), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
            .then(r => (r.ok ? r.json() : Promise.reject()))
            .then((data: AccountData) => setAccount(data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    const title = isPortal
        ? `${account?.org.name ?? 'Your Organisation'} Security Portal Account`
        : 'Cybernovr Platform Account';

    return (
        <PageLayout title="Account Overview">
            <div className="space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">{loading ? 'Account Overview' : title}</h1>
                        <p className="text-xs text-foreground-muted">Your organisation&apos;s security service details</p>
                    </div>
                    <button
                        disabled
                        title="Coming soon"
                        className="text-xs font-bold px-3 py-2 border border-border text-foreground-muted rounded-lg cursor-not-allowed"
                    >
                        Edit
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-card-muted rounded-xl animate-pulse" />)}
                    </div>
                ) : error || !account ? (
                    <div className="bg-card border border-border rounded-xl p-16 text-center">
                        <p className="text-xs text-foreground-muted">Unable to load account details right now.</p>
                    </div>
                ) : (
                    <>
                        {/* Section 1: Organisation Details */}
                        <Card>
                            <p className="text-xs font-black text-foreground uppercase tracking-widest mb-4">Organisation Details</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <Field label="Organisation Name" value={account.org.name} />
                                <Field label="Industry" value={account.org.industry} />

                                <Field
                                    label="Plan"
                                    value={<span className="text-[10px] font-bold px-2 py-0.5 bg-green/10 text-green border border-green/30 rounded">{account.org.plan}</span>}
                                />
                                <Field
                                    label="Status"
                                    value={<span className="text-[10px] font-bold px-2 py-0.5 bg-green/10 text-green border border-green/30 rounded">🟢 {account.org.status}</span>}
                                />

                                <Field label="Contact Name" value={account.org.contact_name} />
                                <Field label="Contact Email" value={account.org.contact_email} />

                                <Field label="Member Since" value={formatDate(account.org.created_at)} />
                                <Field label="Wazuh Group" value={isPortal ? 'Managed by Cybernovr' : account.org.wazuh_group} />
                            </div>
                        </Card>

                        {/* Section 2: Usage & Limits */}
                        <Card>
                            <p className="text-xs font-black text-foreground uppercase tracking-widest mb-4">Service Usage</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Endpoints</p>
                                    <p className="text-lg font-black text-foreground">{account.subscription.endpoints_used} / {account.subscription.endpoints_limit}</p>
                                    <div className="w-full h-1.5 bg-card-muted rounded-full overflow-hidden mt-2">
                                        <div className={`h-full rounded-full ${usageColor(account.subscription.usage_percent)}`} style={{ width: `${Math.min(100, account.subscription.usage_percent)}%` }} />
                                    </div>
                                </div>
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Incidents This Month</p>
                                    <p className="text-lg font-black text-foreground">{account.stats.total_incidents_alltime}</p>
                                </div>
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">URL Scans Performed</p>
                                    <p className="text-lg font-black text-foreground">{account.stats.scans_performed}</p>
                                </div>
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Vendor Assessments</p>
                                    <p className="text-lg font-black text-foreground">{account.stats.vendor_assessments}</p>
                                </div>
                            </div>
                        </Card>

                        {/* Section 3: Team Members */}
                        <Card>
                            <p className="text-xs font-black text-foreground uppercase tracking-widest mb-4">Team Members</p>
                            {account.stats.member_count <= 1 ? (
                                <p className="text-xs text-foreground-muted text-center py-6">You are the only member. Invite team members to collaborate.</p>
                            ) : (
                                <p className="text-xs text-foreground-muted">{account.stats.member_count} members in this organisation.</p>
                            )}
                            <button
                                disabled
                                title="Coming soon"
                                className="mt-4 text-xs font-bold px-3 py-2 bg-amber text-white rounded-lg opacity-50 cursor-not-allowed"
                            >
                                + Invite Member
                            </button>
                        </Card>

                        {/* Section 4: Active Services */}
                        <Card>
                            <p className="text-xs font-black text-foreground uppercase tracking-widest mb-4">Active Services</p>
                            <div className="grid grid-cols-2 gap-2">
                                {SERVICES.map(s => (
                                    <div key={s} className="flex items-center gap-2 text-xs text-foreground">
                                        <span className="text-green">✅</span>
                                        <span>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Section 5: Support */}
                        <Card>
                            <p className="text-xs font-black text-foreground uppercase tracking-widest mb-3">Support & Contact</p>
                            <p className="text-xs text-foreground-muted leading-relaxed mb-3">
                                Your dedicated security team at Cybernovr is available 24/7 to assist with incidents and queries.
                            </p>
                            <div className="flex items-center gap-6 text-xs">
                                <span className="text-foreground-muted">Email: <span className="font-semibold text-foreground">soc@cybernovr.com</span></span>
                                <span className="text-foreground-muted">Response time: <span className="font-semibold text-foreground">&lt; 4 hours for critical incidents</span></span>
                            </div>
                        </Card>
                    </>
                )}
            </div>
        </PageLayout>
    );
}
