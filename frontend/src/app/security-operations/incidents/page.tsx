'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/layout/PageLayout';
import { getPortalContext } from '@/lib/portal-context';
import { apiUrl } from '@/lib/api';

type CtipStats = {
    total_iocs: number;
    iocs_last_24h: number;
    active_campaigns: number;
    exploitable_cves_this_week: number;
    sources_active: number;
    last_collector_run: string | null;
};

interface RealIncident {
    id: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    name: string;
    source: string;
    asset: string;
    status: string;
    analyst: string;
    slaTime: string;
    mitre: string;
    timestamp: string | null;
    level: number;
}

interface IncidentKpis {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    investigating: number;
    escalated: number;
    avgSla: string;
}

const sevColor: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    High: 'bg-amber/10 text-amber border-amber/30',
    Medium: 'bg-amber/10 text-amber border-amber/30',
    Low: 'bg-green/10 text-green border-green/30',
};
const statusColor: Record<string, string> = {
    Open: 'bg-red-500/10 text-red-500',
    Investigating: 'bg-amber/10 text-amber',
    Escalated: 'bg-green/10 text-green',
    Resolved: 'bg-green/10 text-green',
};

function parseSlaMinutes(sla: string): number {
    const [h, m] = sla.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
}

function SkeletonRow() {
    return (
        <tr className="border-b border-border">
            {Array.from({ length: 8 }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3 bg-card-muted rounded animate-pulse" style={{ width: `${50 + (i % 3) * 15}%` }} />
                </td>
            ))}
        </tr>
    );
}

function EmptyState({ isPortal }: { isPortal: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                className="text-green mb-4">
                <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="text-sm font-bold text-foreground mb-1">No Active Incidents</h3>
            <p className="text-xs text-foreground-muted max-w-sm mb-4">
                No security incidents detected in the last 7 days. Deploy Wazuh agents to start monitoring your endpoints.
            </p>
            <Link href={isPortal ? '/dashboard' : '/admin/integrations'}
                className="text-xs font-bold px-4 py-2 bg-red hover:bg-red-hover text-white rounded-lg transition-colors">
                Deploy Agent
            </Link>
        </div>
    );
}

export default function IncidentsPage() {
    const [search, setSearch] = useState('');
    const [sevFilter, setSevFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [ctipStats, setCtipStats] = useState<CtipStats | null>(null);

    const [loading, setLoading] = useState(true);
    const [incidents, setIncidents] = useState<RealIncident[]>([]);
    const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
    const [kpis, setKpis] = useState<IncidentKpis | null>(null);
    const [isPortal, setIsPortal] = useState(false);

    useEffect(() => {
        setIsPortal(getPortalContext().isPortal);
    }, []);

    useEffect(() => {
        fetch(apiUrl('/api/threat-intel/stats'))
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((data: CtipStats) => setCtipStats(data))
            .catch(() => setCtipStats(null));
    }, []);

    useEffect(() => {
        const group = getPortalContext().wazuhGroup;
        fetch(apiUrl(`/api/wazuh/incidents${group ? `?group=${encodeURIComponent(group)}` : ''}`), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data?.incidents)) setIncidents(data.incidents);
                if (data?.kpis) setKpis(data.kpis);
            })
            .catch(() => setIncidents([]))
            .finally(() => setLoading(false));
    }, []);

    const displayIncidents = incidents.map(inc => ({ ...inc, status: statusOverrides[inc.id] ?? inc.status }));

    const filtered = displayIncidents.filter(i => {
        const q = search.toLowerCase();
        const matchQ = !q || i.name.toLowerCase().includes(q) || i.asset.toLowerCase().includes(q) || i.source.toLowerCase().includes(q);
        const matchSev = sevFilter === 'All' || i.severity === sevFilter;
        const matchStatus = statusFilter === 'All' || i.status === statusFilter;
        return matchQ && matchSev && matchStatus;
    });

    const kpiValues = [
        { label: 'Total Open', value: loading ? '...' : String(kpis?.total ?? 0), color: 'text-red-500' },
        { label: 'High+', value: loading ? '...' : String(kpis?.high ?? 0), color: 'text-amber' },
        { label: 'Medium', value: loading ? '...' : String(kpis?.medium ?? 0), color: 'text-green' },
        { label: 'Low', value: loading ? '...' : String(kpis?.low ?? 0), color: 'text-green' },
        { label: 'Avg SLA Remaining', value: loading ? '...' : (kpis?.avgSla ?? '00:00:00'), color: 'text-green' },
    ];

    const isEmpty = !loading && incidents.length === 0;
    const selected = displayIncidents.find(i => i.id === expanded) ?? null;

    return (
        <PageLayout title="Incident Queue">
            <div className="space-y-5">
                <div>
                    <h1 className="text-lg font-black text-foreground">Incident Queue</h1>
                    <p className="text-xs text-foreground-muted">Security Operations · Real-time incident tracking and response management</p>
                </div>

                {/* Live Threat Context widget — only rendered when CTIP responds with data */}
                {ctipStats && ctipStats.total_iocs > 0 && (
                    <div className="bg-card-muted rounded-xl border-l-4 border-green border border-border p-4 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="font-semibold text-foreground text-sm">Live Threat Context</span>
                            <span className="bg-green/10 text-green text-xs px-2 py-0.5 rounded-full font-medium">Powered by CTIP</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { value: ctipStats.total_iocs.toLocaleString(), label: 'IOCs in Database' },
                                { value: ctipStats.iocs_last_24h.toLocaleString(), label: 'New Last 24hrs' },
                                { value: ctipStats.active_campaigns.toLocaleString(), label: 'Active Campaigns' },
                                { value: ctipStats.exploitable_cves_this_week.toLocaleString(), label: 'Exploitable CVEs' },
                            ].map(chip => (
                                <div key={chip.label} className="bg-card rounded-lg border border-border shadow-sm px-4 py-3">
                                    <p className="text-xl font-bold text-foreground">{chip.value}</p>
                                    <p className="text-xs text-foreground-muted mt-0.5">{chip.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-5 gap-3">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bg-card border border-border rounded-xl p-4">
                                <div className="h-[3px] bg-card-muted -mt-4 -mx-4 mb-4 rounded-t-xl" />
                                <div className="h-2.5 w-16 bg-card-muted rounded animate-pulse mb-2" />
                                <div className="h-6 w-10 bg-card-muted rounded animate-pulse" />
                            </div>
                        ))
                    ) : (
                        kpiValues.map(k => (
                            <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                                <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-4 -mx-4 mb-4 rounded-t-xl" />
                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">{k.label}</p>
                                <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents, assets, sources…"
                        className="bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-green/20 w-64" />
                    {[['Severity', ['All', 'Critical', 'High', 'Medium', 'Low'], sevFilter, setSevFilter],
                      ['Status', ['All', 'Open', 'Investigating', 'Escalated', 'Resolved'], statusFilter, setStatusFilter]
                    ].map(([label, opts, val, setter]) => (
                        <select key={String(label)} value={String(val)} onChange={e => (setter as (v: string) => void)(e.target.value)}
                            className="bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20">
                            {(opts as string[]).map(o => <option key={o}>{o}</option>)}
                        </select>
                    ))}
                    <span className="ml-auto text-[10px] text-foreground-muted">
                        {loading ? 'Loading…' : `${filtered.length} incidents · live Wazuh data`}
                    </span>
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    {isEmpty ? (
                        <EmptyState isPortal={isPortal} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Severity', 'Incident Name', 'Source', 'Asset', 'Status', 'Analyst', 'SLA', 'MITRE Tag'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                                    ) : (
                                        filtered.map(inc => (
                                            <tr key={inc.id} onClick={() => setExpanded(expanded === inc.id ? null : inc.id)}
                                                className="border-b border-border hover:bg-card-muted cursor-pointer transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sevColor[inc.severity]}`}>{inc.severity}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-foreground">{inc.name}</p>
                                                    <p className="text-[10px] text-foreground-muted">{inc.id}</p>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-foreground-muted">{inc.source}</td>
                                                <td className="px-4 py-3 font-mono text-foreground">{inc.asset}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColor[inc.status] ?? statusColor.Open}`}>{inc.status}</span>
                                                </td>
                                                <td className="px-4 py-3 text-foreground-muted">{inc.analyst}</td>
                                                <td className={`px-4 py-3 font-mono font-bold ${parseSlaMinutes(inc.slaTime) < 30 ? 'text-red-500' : 'text-foreground'}`}>{inc.slaTime}</td>
                                                <td className="px-4 py-3 font-mono text-amber">{inc.mitre}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Drawer */}
                {selected && (
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-foreground">{selected.name}</h3>
                            <button onClick={() => setExpanded(null)} className="text-foreground-muted hover:text-foreground text-xs font-bold">Close ✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2 text-xs">
                                <div><span className="text-foreground-muted">Severity:</span> <span className={`ml-1 font-bold px-2 py-0.5 rounded border ${sevColor[selected.severity]}`}>{selected.severity}</span></div>
                                <div><span className="text-foreground-muted">Asset:</span> <span className="text-foreground font-mono">{selected.asset}</span></div>
                                <div><span className="text-foreground-muted">Time Detected:</span> <span className="text-foreground font-mono">{formatDateTime(selected.timestamp)}</span></div>
                                <div><span className="text-foreground-muted">MITRE Technique:</span> <span className="text-amber font-mono">{selected.mitre || 'Unknown'}</span></div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Status</label>
                                <select
                                    value={selected.status}
                                    onChange={e => setStatusOverrides(prev => ({ ...prev, [selected.id]: e.target.value }))}
                                    className="w-full py-2 bg-card-muted border border-border rounded-lg text-xs text-foreground px-2 focus:outline-none"
                                >
                                    {['Open', 'Investigating', 'Escalated', 'Resolved'].map(s => <option key={s}>{s}</option>)}
                                </select>
                                <button className="w-full py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Assign to Me</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
