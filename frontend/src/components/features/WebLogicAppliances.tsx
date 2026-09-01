'use client';

import { useState, useEffect } from 'react';
import { apiUrl, apiFetch } from '@/lib/api';
import {
    AlertTriangle, RefreshCw, Cpu, Server, Zap, Layers, ChevronRight, ArrowLeft,
} from 'lucide-react';

type ServerStatus = 'running' | 'warning' | 'critical' | 'stopped';

interface JdbcPool {
    name: string;
    active: number;
    max: number;
}

interface ManagedServer {
    id: string;
    name: string;
    type: 'Admin Server' | 'Managed Server';
    status: ServerStatus;
    heap_used_mb: number;
    heap_max_mb: number;
    heap_percent: number;
    thread_pool_active: number;
    thread_pool_max: number;
    thread_pool_queued: number;
    jdbc_pools: JdbcPool[];
    uptime: string;
    last_checked: string;
    recommendation: string | null;
}

interface WebLogicDomain {
    id: string;
    name: string;
    organization: string;
    version: string;
    status: ServerStatus;
    servers: ManagedServer[];
}

interface Stats {
    domain_count: number;
    server_count: number;
    warning_count: number;
    avg_heap_percent: number;
}

const STATUS_STYLE: Record<ServerStatus, string> = {
    running: 'bg-green/10 text-green border-green/30',
    warning: 'bg-grey-100 text-amber border-amber/30',
    critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    stopped: 'bg-card-muted text-foreground-muted border-border',
};

function heapBarColor(pct: number): string {
    if (pct >= 90) return 'bg-red-500 animate-pulse';
    if (pct >= 80) return 'bg-amber';
    if (pct >= 60) return 'bg-purple';
    return 'bg-blue';
}

function heapTextColor(pct: number): string {
    if (pct >= 90) return 'text-red-500';
    if (pct >= 80) return 'text-amber';
    if (pct >= 60) return 'text-purple';
    return 'text-blue';
}

export function WebLogicAppliances() {
    const [domains, setDomains] = useState<WebLogicDomain[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        apiFetch(apiUrl('/api/weblogic/domains'))
            .then((r) => r.json())
            .then((data) => {
                setDomains(Array.isArray(data?.domains) ? data.domains : []);
                setStats(data?.stats ?? null);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const allServers = domains.flatMap((d) => d.servers);
    const selectedServer = allServers.find((s) => s.id === selectedServerId) ?? null;
    const selectedDomain = domains.find((d) => d.servers.some((s) => s.id === selectedServerId)) ?? null;

    async function forceGC(id: string) {
        setBusyId(id);
        try {
            const res = await apiFetch(apiUrl(`/api/weblogic/${id}/gc`), { method: 'POST' });
            const data = await res.json();
            if (data?.server) {
                setDomains((prev) => prev.map((d) => ({
                    ...d,
                    servers: d.servers.map((s) => (s.id === id ? { ...s, ...data.server } : s)),
                })));
            }
        } finally {
            setBusyId(null);
        }
    }

    // Server detail view
    if (selectedServer && selectedDomain) {
        const s = selectedServer;
        return (
            <div className="space-y-5">
                <div>
                    <button onClick={() => setSelectedServerId(null)} className="flex items-center gap-1 text-[11px] font-bold text-foreground-muted hover:text-foreground mb-2">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to WebLogic Appliances
                    </button>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-black text-foreground">{s.name}</h1>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                    </div>
                    <p className="text-xs text-foreground-muted">{selectedDomain.name} · {s.type} · {selectedDomain.organization}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-card border border-border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Heap Usage</p>
                                <p className={`text-sm font-black ${heapTextColor(s.heap_percent)}`}>{s.heap_percent}%</p>
                            </div>
                            <div className="h-2.5 bg-card-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${heapBarColor(s.heap_percent)}`} style={{ width: `${Math.min(100, s.heap_percent)}%` }} />
                            </div>
                            <p className="text-[11px] text-foreground-muted mt-2">{s.heap_used_mb.toLocaleString()} MB / {s.heap_max_mb.toLocaleString()} MB</p>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Thread Pool</p>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                    <p className="text-[10px] text-foreground-muted">Active</p>
                                    <p className="text-lg font-black text-foreground">{s.thread_pool_active}/{s.thread_pool_max}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-foreground-muted">Queued</p>
                                    <p className={`text-lg font-black ${s.thread_pool_queued > 0 ? 'text-amber' : 'text-foreground'}`}>{s.thread_pool_queued}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-foreground-muted">Uptime</p>
                                    <p className="text-lg font-black text-foreground">{s.uptime}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">JDBC Connection Pools</p>
                            <div className="space-y-2">
                                {s.jdbc_pools.map((p) => (
                                    <div key={p.name} className="flex items-center justify-between text-xs border-b border-border last:border-b-0 pb-2 last:pb-0">
                                        <span className="text-foreground font-semibold">{p.name}</span>
                                        <span className="text-foreground-muted font-mono">{p.active}/{p.max} active</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {s.recommendation && (
                            <div className="bg-grey-100 border border-amber/30 rounded-xl p-4 flex gap-3">
                                <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber">Recommendation</p>
                                    <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{s.recommendation}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-card border border-border rounded-xl p-4 h-fit space-y-3">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Actions</p>
                        <button
                            disabled={busyId === s.id}
                            onClick={() => forceGC(s.id)}
                            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-blue rounded-lg px-3 py-2 disabled:opacity-50"
                        >
                            <Zap className="w-3.5 h-3.5" /> {busyId === s.id ? 'Running GC…' : 'Force Garbage Collection'}
                        </button>
                        <p className="text-[10px] text-foreground-muted">Last checked {s.last_checked}</p>
                    </div>
                </div>
            </div>
        );
    }

    // List view
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-black text-foreground">WebLogic Appliances</h1>
                    <p className="text-xs text-foreground-muted">Infrastructure · Java middleware cluster health and performance</p>
                </div>
                <button onClick={load} className="flex items-center gap-1.5 text-[11px] font-bold text-foreground-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Domains Monitored', value: stats?.domain_count, color: 'text-foreground', icon: Layers },
                    { label: 'Servers', value: stats?.server_count, color: 'text-foreground', icon: Server },
                    { label: 'Warnings', value: stats?.warning_count, color: (stats?.warning_count ?? 0) > 0 ? 'text-amber' : 'text-foreground', icon: AlertTriangle },
                    { label: 'Avg Heap Usage', value: stats ? `${stats.avg_heap_percent}%` : undefined, color: 'text-foreground', icon: Cpu },
                ].map((k) => (
                    <div key={k.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                        <k.icon className={`w-5 h-5 shrink-0 ${k.color}`} />
                        <div>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                            <p className={`text-xl font-black ${k.color}`}>{k.value ?? '—'}</p>
                        </div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-32 bg-card-muted rounded-xl animate-pulse" />)}</div>
            ) : domains.length === 0 ? (
                <div className="bg-card border border-border rounded-xl py-12 text-center">
                    <p className="text-xs text-foreground-muted">No WebLogic domains configured.</p>
                </div>
            ) : (
                domains.map((d) => (
                    <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-black text-foreground">{d.name}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${STATUS_STYLE[d.status]}`}>{d.status}</span>
                                </div>
                                <p className="text-[10px] text-foreground-muted mt-0.5">{d.organization} · {d.version}</p>
                            </div>
                        </div>

                        {d.status === 'warning' && (
                            <div className="mx-4 mt-3 bg-grey-100 border border-amber/30 rounded-lg p-2.5 flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber shrink-0" />
                                <p className="text-[11px] text-amber font-semibold">
                                    {d.servers.find((s) => s.status === 'warning' || s.status === 'critical')?.name} requires attention — heap usage elevated.
                                </p>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Server Name', 'Type', 'Status', 'Heap Usage', 'Thread Pool', 'JDBC', 'Uptime', 'Actions'].map((h) => (
                                            <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {d.servers.map((s) => (
                                        <tr key={s.id} className="border-b border-border last:border-b-0 hover:bg-card-muted transition-colors">
                                            <td className="px-4 py-2.5">
                                                <button onClick={() => setSelectedServerId(s.id)} className="font-bold text-foreground hover:text-blue flex items-center gap-1">
                                                    {s.name} <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground-muted">{s.type}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                                            </td>
                                            <td className="px-4 py-2.5 min-w-35">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-20 bg-card-muted rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${heapBarColor(s.heap_percent)}`} style={{ width: `${Math.min(100, s.heap_percent)}%` }} />
                                                    </div>
                                                    <span className={`font-bold ${heapTextColor(s.heap_percent)}`}>{s.heap_percent}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground-muted font-mono">{s.thread_pool_active}/{s.thread_pool_max}</td>
                                            <td className="px-4 py-2.5 text-foreground-muted font-mono">
                                                {s.jdbc_pools.reduce((sum, p) => sum + p.active, 0)}/{s.jdbc_pools.reduce((sum, p) => sum + p.max, 0)}
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground-muted">{s.uptime}</td>
                                            <td className="px-4 py-2.5">
                                                <button
                                                    disabled={busyId === s.id}
                                                    onClick={() => forceGC(s.id)}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-blue hover:underline disabled:opacity-50"
                                                >
                                                    <Zap className="w-3 h-3" /> {busyId === s.id ? 'Running…' : 'Force GC'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
