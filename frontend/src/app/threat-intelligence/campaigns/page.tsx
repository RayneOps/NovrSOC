'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { apiUrl } from '@/lib/api';

interface Campaign {
    name: string;
    ioc_count: number;
    threat_type: string;
    first_seen: string | null;
    last_seen: string | null;
    severity: 'Critical' | 'High' | 'Medium';
}

const SEV: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    High:     'bg-amber/10 text-amber border-amber/30',
    Medium:   'bg-amber/10 text-amber border-amber/30',
};

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(apiUrl('/api/ctip/campaigns'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setCampaigns(Array.isArray(data) ? data : []))
            .catch(() => setCampaigns([]))
            .finally(() => setLoading(false));
    }, []);

    const kpis = [
        { label: 'Total Campaigns', value: campaigns.length, color: 'text-red-500' },
        { label: 'Critical', value: campaigns.filter(c => c.severity === 'Critical').length, color: 'text-red-500' },
        { label: 'High', value: campaigns.filter(c => c.severity === 'High').length, color: 'text-amber' },
        { label: 'Medium', value: campaigns.filter(c => c.severity === 'Medium').length, color: 'text-amber' },
    ];

    return (
        <PageLayout title="Campaigns">
            <div className="space-y-5">
                <div>
                    <h1 className="text-lg font-black text-foreground">Active Campaigns</h1>
                    <p className="text-xs text-foreground-muted">Threat Intelligence · Campaigns derived from clustered CTIP indicator activity</p>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {kpis.map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-4 -mx-4 mb-4 rounded-t-xl" />
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">{k.label}</p>
                            <p className={`text-2xl font-black ${k.color}`}>{loading ? '...' : k.value}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    {loading ? (
                        <div className="p-6 space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-8 bg-card-muted rounded animate-pulse" />
                            ))}
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground-muted mb-4">
                                <circle cx="12" cy="12" r="9" strokeLinecap="round" />
                                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <h3 className="text-sm font-bold text-foreground mb-1">No Active Campaigns Detected</h3>
                            <p className="text-xs text-foreground-muted max-w-sm">
                                Campaigns are derived from clusters of related indicators in the CTIP database. None currently meet the clustering threshold.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Campaign', 'Threat Type', 'First Seen', 'Last Seen', 'Severity', 'IOC Count'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map(c => (
                                        <tr key={c.name} className="border-b border-border hover:bg-card-muted transition-colors">
                                            <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{c.name}</td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{c.threat_type}</td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{formatDate(c.first_seen)}</td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{formatDate(c.last_seen)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${SEV[c.severity]}`}>{c.severity}</span>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-foreground">{c.ioc_count.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
