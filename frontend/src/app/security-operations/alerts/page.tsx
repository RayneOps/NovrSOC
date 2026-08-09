'use client';

import { useState, useMemo } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { ALERTS, ALERT_KPIS } from '@/lib/mock/alerts';

const SEV_BADGE: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    High: 'bg-amber/10 text-amber border-amber/30',
    Medium: 'bg-amber/10 text-amber border-amber/30',
    Low: 'bg-green/10 text-green border-green/30',
};
const STATUS_BADGE: Record<string, string> = {
    New: 'bg-red-500/10 text-red-500',
    Assigned: 'bg-green/10 text-green',
    Investigating: 'bg-amber/10 text-amber',
    Resolved: 'bg-green/10 text-green',
    Suppressed: 'bg-card-muted text-foreground-muted',
};

export default function AlertsPage() {
    const [search, setSearch] = useState('');
    const [sevFilter, setSevFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selected, setSelected] = useState<string[]>([]);

    const filtered = useMemo(() => ALERTS.filter(a => {
        if (sevFilter !== 'All' && a.severity !== sevFilter) return false;
        if (statusFilter !== 'All' && a.status !== statusFilter) return false;
        if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
            !a.asset.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    }), [search, sevFilter, statusFilter]);

    const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const allSelected = filtered.length > 0 && filtered.every(a => selected.includes(a.id));

    return (
        <PageLayout title="Alerts">
            <div className="space-y-4">
                <div>
                    <h1 className="text-lg font-black text-foreground">Alert Queue</h1>
                    <p className="text-xs text-foreground-muted">Security Operations · Real-time security alert management</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                    {[
                        { label: 'Total Alerts', v: ALERT_KPIS.total, color: 'text-foreground' },
                        { label: 'New Today', v: ALERT_KPIS.newToday, color: 'text-green' },
                        { label: 'Critical', v: ALERT_KPIS.critical, color: 'text-red-500' },
                        { label: 'High', v: ALERT_KPIS.high, color: 'text-amber' },
                        { label: 'Medium', v: ALERT_KPIS.medium, color: 'text-amber' },
                        { label: 'Low', v: ALERT_KPIS.low, color: 'text-green' },
                        { label: 'Suppressed', v: ALERT_KPIS.autoSuppressed, color: 'text-foreground-muted' },
                        { label: 'Avg TTD', v: ALERT_KPIS.avgTtd, color: 'text-green' },
                    ].map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-3">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-3 -mx-3 mb-2 rounded-t-xl" />
                            <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                            <p className={`text-lg font-black ${k.color}`}>{k.v}</p>
                        </div>
                    ))}
                </div>

                {/* Filters + Bulk actions */}
                <div className="flex items-center gap-3 flex-wrap">
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alerts, assets…"
                        className="w-56 bg-card border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-foreground placeholder:text-foreground-muted" />
                    {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => (
                        <button key={s} onClick={() => setSevFilter(s)} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${sevFilter === s ? 'bg-amber text-white border-green' : 'bg-card border-border text-foreground-muted hover:text-foreground'}`}>{s}</button>
                    ))}
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="text-[10px] font-bold bg-card border border-border rounded-lg px-3 py-1.5 text-foreground-muted focus:outline-none">
                        <option>All</option>
                        {['New', 'Assigned', 'Investigating', 'Resolved', 'Suppressed'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    {selected.length > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[10px] text-foreground-muted">{selected.length} selected</span>
                            <button className="text-[10px] font-bold px-3 py-1.5 bg-amber text-white rounded-lg hover:bg-red-hover transition-colors">Assign</button>
                            <button className="text-[10px] font-bold px-3 py-1.5 bg-green text-white rounded-lg hover:bg-green transition-colors">Mark Reviewed</button>
                            <button className="text-[10px] font-bold px-3 py-1.5 bg-green text-white rounded-lg hover:bg-green transition-colors">Create Case</button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3">
                                        <input type="checkbox" checked={allSelected}
                                            onChange={() => setSelected(allSelected ? [] : filtered.map(a => a.id))}
                                            className="rounded border-border" />
                                    </th>
                                    {['Severity', 'Alert Name', 'Source', 'Asset', 'MITRE', 'Tactic', 'Time', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(a => (
                                    <tr key={a.id} className={`border-b border-border hover:bg-card-muted transition-colors ${selected.includes(a.id) ? 'bg-green/10/50' : ''}`}>
                                        <td className="px-4 py-2.5">
                                            <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)}
                                                className="rounded border-border" />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${SEV_BADGE[a.severity]}`}>{a.severity}</span>
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-foreground max-w-[180px] truncate">{a.name}</td>
                                        <td className="px-4 py-2.5 font-mono text-foreground-muted text-[10px]">{a.source}</td>
                                        <td className="px-4 py-2.5 font-mono text-foreground text-[10px]">{a.asset}</td>
                                        <td className="px-4 py-2.5 font-mono text-amber text-[10px]">{a.mitre}</td>
                                        <td className="px-4 py-2.5 text-foreground-muted text-[10px]">{a.tactic}</td>
                                        <td className="px-4 py-2.5 font-mono text-foreground-muted text-[10px]">{a.time}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_BADGE[a.status]}`}>{a.status}</span>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                <button className="text-[10px] font-bold text-green hover:underline">Assign</button>
                                                <button className="text-[10px] font-bold text-foreground-muted hover:text-foreground">Suppress</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="text-center py-12 text-foreground-muted">
                                <p className="text-2xl mb-2">🔍</p>
                                <p className="text-sm font-semibold">No alerts match the current filters</p>
                            </div>
                        )}
                    </div>
                    <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                        <p className="text-[10px] text-foreground-muted">Showing {filtered.length} of {ALERTS.length} alerts</p>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(p => (
                                <button key={p} className={`w-6 h-6 text-[10px] font-bold rounded ${p === 1 ? 'bg-amber text-white' : 'text-foreground-muted hover:bg-card-muted'}`}>{p}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
