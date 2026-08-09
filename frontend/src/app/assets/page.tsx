'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { getPortalContext } from '@/lib/portal-context';
import { apiUrl } from '@/lib/api';

interface Agent {
    id: string;
    name: string;
    ip: string | null;
    status: string;
    lastSeen: string | null;
    os: string | null;
    group: string;
}

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-green/10 text-green border-green/30',
    disconnected: 'bg-card-muted text-foreground-muted border-border',
    pending: 'bg-amber/10 text-amber border-amber/30',
    never_connected: 'bg-card-muted text-foreground-muted border-border',
};

function formatLastSeen(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AssetsPage() {
    const [search, setSearch] = useState('');
    const [agents, setAgents] = useState<Agent[] | null>(null);

    useEffect(() => {
        const group = getPortalContext().wazuhGroup;
        fetch(apiUrl(`/api/wazuh/agents${group ? `?group=${encodeURIComponent(group)}` : ''}`), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setAgents(Array.isArray(data?.agents) ? data.agents : []))
            .catch(() => setAgents([]));
    }, []);

    const filtered = (agents ?? []).filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q) || (a.ip ?? '').includes(q);
    });

    const loading = agents === null;
    const total = agents?.length ?? 0;
    const online = agents?.filter(a => a.status === 'active').length ?? 0;

    return (
        <PageLayout title="Asset Inventory">
            <div className="space-y-4">
                <div>
                    <h1 className="text-lg font-black text-foreground">Asset Inventory</h1>
                    <p className="text-xs text-foreground-muted">Assets & Risk · Endpoints registered via the Wazuh agent</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Total Assets', v: loading ? '...' : String(total), color: 'text-foreground' },
                        { label: 'Online', v: loading ? '...' : String(online), color: 'text-green' },
                        { label: 'Offline', v: loading ? '...' : String(total - online), color: 'text-foreground-muted' },
                    ].map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-3">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-3 -mx-3 mb-2 rounded-t-xl" />
                            <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                            <p className={`text-lg font-black ${k.color}`}>{k.v}</p>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets, IPs…"
                    className="w-56 bg-card border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-foreground placeholder:text-foreground-muted" />

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    {loading ? (
                        <div className="p-6 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 bg-card-muted rounded animate-pulse" />)}</div>
                    ) : filtered.length === 0 ? (
                        <p className="text-xs text-foreground-muted text-center py-16">No assets registered yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Asset Name', 'IP', 'OS', 'Group', 'Status', 'Last Seen'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(a => (
                                        <tr key={a.id} className="border-b border-border hover:bg-card-muted transition-colors">
                                            <td className="px-4 py-2.5 font-bold text-foreground whitespace-nowrap">{a.name}</td>
                                            <td className="px-4 py-2.5 font-mono text-foreground-muted text-[10px]">{a.ip ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-foreground-muted text-[10px]">{a.os ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-foreground-muted">{a.group}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[a.status] ?? STATUS_BADGE.disconnected}`}>{a.status}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground-muted whitespace-nowrap">{formatLastSeen(a.lastSeen)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loading && filtered.length > 0 && (
                        <div className="px-4 py-3 border-t border-border">
                            <p className="text-[10px] text-foreground-muted">Showing {filtered.length} of {total} assets</p>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
