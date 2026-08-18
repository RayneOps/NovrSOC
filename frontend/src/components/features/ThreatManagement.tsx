'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiUrl } from '@/lib/api';
import {
    CheckCircle, RefreshCw, Eye, Shield,
    ExternalLink, Crosshair, MessageSquarePlus,
} from 'lucide-react';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type AlertStatus = 'open' | 'investigating' | 'acknowledged' | 'closed';

interface ThreatAlert {
    id: string;
    rule_id: string;
    rule_level: number;
    rule_description: string;
    severity: Severity;
    status: AlertStatus;
    mitre_tactic: string;
    mitre_technique: string;
    source_ip: string | null;
    source_country: string | null;
    source_isp: string | null;
    destination_ip: string;
    destination_host: string;
    destination_port: number | null;
    protocol: string;
    agent_id: string;
    agent_name: string;
    alert_count: number;
    raw_log: string;
    detected_at: string;
    tags: string[];
    abuseipdb_confidence: number | null;
    vt_malicious: number | null;
    otx_pulses: number | null;
}

interface Stats {
    total_alerts_24h: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    investigating: number;
    acknowledged: number;
    active_agents: number;
}

const SEV_STYLE: Record<Severity, string> = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    high: 'bg-grey-100 text-amber border-amber/30',
    medium: 'bg-grey-100 text-amber border-amber/30',
    low: 'bg-card-muted text-foreground-muted border-border',
};

const STATUS_LABELS: Record<AlertStatus, string> = {
    open: 'Open',
    investigating: 'Investigating',
    acknowledged: 'Acknowledged',
    closed: 'Closed',
};

const STATUS_STYLE: Record<AlertStatus, string> = {
    open: 'bg-red-500/10 text-red-500 border-red-500/30',
    investigating: 'bg-grey-100 text-amber border-amber/30',
    acknowledged: 'bg-blue/10 text-blue border-blue/30',
    closed: 'bg-card-muted text-foreground-muted border-border',
};

function scoreColor(v: number | null, highIsBad = true): string {
    if (v === null) return 'text-foreground-muted';
    const bad = highIsBad ? v >= 70 : v <= 30;
    const warn = highIsBad ? v >= 30 : v <= 70;
    if (bad) return 'text-red-500';
    if (warn) return 'text-amber';
    return 'text-green';
}

export function ThreatManagement() {
    const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);
        fetch(apiUrl('/api/threats/alerts'))
            .then((r) => r.json())
            .then((data) => {
                setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
                setStats(data?.stats ?? null);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => alerts.filter((a) => {
        const matchSev = severityFilter === 'all' || a.severity === severityFilter;
        const matchStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchSev && matchStatus;
    }), [alerts, severityFilter, statusFilter]);

    const selected = alerts.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

    async function updateStatus(id: string, status: AlertStatus) {
        setBusy(true);
        try {
            await fetch(apiUrl(`/api/threats/alerts/${id}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
        } finally {
            setBusy(false);
        }
    }

    async function createIncident(id: string) {
        setBusy(true);
        try {
            await fetch(apiUrl(`/api/threats/alerts/${id}/create-incident`), { method: 'POST' });
            await updateStatus(id, 'investigating');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-black text-foreground">Threat Management</h1>
                    <p className="text-xs text-foreground-muted">SecOps &amp; Response · Live alert triage across the sensor fleet</p>
                </div>
                <button onClick={load} className="flex items-center gap-1.5 text-[11px] font-bold text-foreground-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: 'Alerts (24h)', value: stats?.total_alerts_24h, color: 'text-foreground' },
                    { label: 'Critical', value: stats?.critical, color: 'text-red-500' },
                    { label: 'High', value: stats?.high, color: 'text-amber' },
                    { label: 'Medium', value: stats?.medium, color: 'text-amber' },
                    { label: 'Low', value: stats?.low, color: 'text-foreground-muted' },
                    { label: 'Open', value: stats?.open, color: 'text-red-500' },
                    { label: 'Investigating', value: stats?.investigating, color: 'text-blue' },
                ].map((k) => (
                    <div key={k.label} className="bg-card border border-border rounded-xl p-3">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                        <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value ?? '—'}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                    {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setSeverityFilter(s)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-md capitalize transition-colors ${severityFilter === s ? 'bg-blue text-white' : 'text-foreground-muted hover:text-foreground'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                    {(['all', 'open', 'investigating', 'acknowledged', 'closed'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-md capitalize transition-colors ${statusFilter === s ? 'bg-blue text-white' : 'text-foreground-muted hover:text-foreground'}`}
                        >
                            {s === 'all' ? 'All Status' : STATUS_LABELS[s]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Alert list */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-border">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Alert Queue ({filtered.length})</p>
                    </div>
                    {loading ? (
                        <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-card-muted rounded animate-pulse" />)}</div>
                    ) : filtered.length === 0 ? (
                        <p className="text-xs text-foreground-muted text-center py-10">No alerts match the current filters.</p>
                    ) : (
                        <div className="max-h-[640px] overflow-y-auto divide-y divide-border">
                            {filtered.map((a) => (
                                <button
                                    key={a.id}
                                    onClick={() => setSelectedId(a.id)}
                                    className={`w-full text-left p-3 hover:bg-card-muted transition-colors ${selected?.id === a.id ? 'bg-card-muted' : ''}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${SEV_STYLE[a.severity]}`}>{a.severity}</span>
                                        <span className="text-[10px] text-foreground-muted">{a.detected_at}</span>
                                    </div>
                                    <p className="text-xs font-bold text-foreground mt-1.5 leading-snug">{a.rule_description}</p>
                                    <div className="flex items-center justify-between mt-1.5">
                                        <span className="text-[10px] text-foreground-muted font-mono">{a.source_ip ?? a.agent_name}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[a.status]}`}>{STATUS_LABELS[a.status]}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
                    {!selected ? (
                        <div className="p-10 text-center">
                            <Shield className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
                            <p className="text-xs text-foreground-muted">Select an alert to view details.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${SEV_STYLE[selected.severity]}`}>{selected.severity}</span>
                                        <span className="text-[10px] font-mono text-foreground-muted">{selected.rule_id} · L{selected.rule_level}</span>
                                    </div>
                                    <h2 className="text-sm font-black text-foreground mt-1.5">{selected.rule_description}</h2>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${STATUS_STYLE[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
                            </div>

                            {/* MITRE mapping */}
                            <div className="bg-card-muted rounded-lg p-3 flex items-center gap-2">
                                <Crosshair className="w-4 h-4 text-blue shrink-0" />
                                <div className="text-xs">
                                    <span className="font-bold text-foreground">{selected.mitre_tactic}</span>
                                    <span className="text-foreground-muted"> · {selected.mitre_technique}</span>
                                </div>
                            </div>

                            {/* Network detail */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Source</p>
                                    <p className="font-mono text-foreground mt-0.5">{selected.source_ip ?? '—'}</p>
                                    <p className="text-foreground-muted">{selected.source_country ?? ''} {selected.source_isp ?? ''}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Destination</p>
                                    <p className="font-mono text-foreground mt-0.5">{selected.destination_ip}{selected.destination_port ? `:${selected.destination_port}` : ''}</p>
                                    <p className="text-foreground-muted">{selected.destination_host} · {selected.protocol}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Agent</p>
                                    <p className="text-foreground mt-0.5">{selected.agent_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Occurrences</p>
                                    <p className="text-foreground mt-0.5 font-bold">{selected.alert_count}</p>
                                </div>
                            </div>

                            {/* Threat intel scores */}
                            {(selected.abuseipdb_confidence !== null || selected.vt_malicious !== null || selected.otx_pulses !== null) && (
                                <div>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Threat Intelligence</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="border border-border rounded-lg p-2.5 text-center">
                                            <p className="text-[9px] text-foreground-muted uppercase tracking-wider">IP Reputation</p>
                                            <p className={`text-lg font-black mt-0.5 ${scoreColor(selected.abuseipdb_confidence)}`}>{selected.abuseipdb_confidence ?? '—'}{selected.abuseipdb_confidence !== null ? '%' : ''}</p>
                                        </div>
                                        <div className="border border-border rounded-lg p-2.5 text-center">
                                            <p className="text-[9px] text-foreground-muted uppercase tracking-wider">Multi-Engine Scan</p>
                                            <p className={`text-lg font-black mt-0.5 ${scoreColor(selected.vt_malicious !== null ? selected.vt_malicious * 1.5 : null)}`}>{selected.vt_malicious ?? '—'}{selected.vt_malicious !== null ? '/94' : ''}</p>
                                        </div>
                                        <div className="border border-border rounded-lg p-2.5 text-center">
                                            <p className="text-[9px] text-foreground-muted uppercase tracking-wider">Threat Feed Pulses</p>
                                            <p className={`text-lg font-black mt-0.5 ${scoreColor(selected.otx_pulses !== null ? selected.otx_pulses * 4 : null)}`}>{selected.otx_pulses ?? '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Raw log */}
                            <div>
                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1.5">Raw Log Excerpt</p>
                                <pre className="bg-card-muted border border-border rounded-lg p-3 text-[10px] font-mono text-foreground-muted whitespace-pre-wrap break-all">{selected.raw_log}</pre>
                            </div>

                            {/* Tags */}
                            {selected.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selected.tags.map((t) => (
                                        <span key={t} className="text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground-muted rounded">{t}</span>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                                <button
                                    disabled={busy}
                                    onClick={() => updateStatus(selected.id, 'investigating')}
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-blue rounded-lg px-3 py-1.5 disabled:opacity-50"
                                >
                                    <Eye className="w-3.5 h-3.5" /> Investigate
                                </button>
                                <button
                                    disabled={busy}
                                    onClick={() => updateStatus(selected.id, 'acknowledged')}
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-foreground border border-border rounded-lg px-3 py-1.5 disabled:opacity-50"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" /> Acknowledge
                                </button>
                                <button
                                    disabled={busy}
                                    onClick={() => createIncident(selected.id)}
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-1.5 disabled:opacity-50"
                                >
                                    <MessageSquarePlus className="w-3.5 h-3.5" /> Create Incident
                                </button>
                                {selected.source_ip && (
                                    <a
                                        href={`/admin/threat/cti?q=${encodeURIComponent(selected.source_ip)}`}
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-foreground-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5 ml-auto"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Lookup IP in CTI Platform
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
