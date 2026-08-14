'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import {
    AlertTriangle, Clock, CheckCircle, ArrowLeft, RefreshCw,
    Play, TrendingUp, FileText, ChevronRight,
} from 'lucide-react';

type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
type IncidentStatus = 'new' | 'investigating' | 'contained' | 'resolved' | 'escalated';
type ActionStatus = 'completed' | 'pending' | 'failed';

interface TimelineEntry {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    detail: string;
}

interface ContainmentAction {
    id: string;
    label: string;
    status: ActionStatus;
    completed_at: string | null;
}

interface Incident {
    id: string;
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    mitre_tactic: string;
    mitre_technique: string;
    affected_assets: string[];
    assigned_analyst: string;
    opened_at: string;
    updated_at: string;
    summary: string;
    source_alert_id: string | null;
    timeline: TimelineEntry[];
    containment_actions: ContainmentAction[];
}

interface Summary {
    total: number;
    critical: number;
    investigating: number;
    resolved: number;
}

const SEV_STYLE: Record<IncidentSeverity, string> = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    high: 'bg-grey-100 text-amber border-amber/30',
    medium: 'bg-grey-100 text-amber border-amber/30',
    low: 'bg-card-muted text-foreground-muted border-border',
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
    new: 'New',
    investigating: 'Investigating',
    contained: 'Contained',
    resolved: 'Resolved',
    escalated: 'Escalated',
};

const STATUS_STYLE: Record<IncidentStatus, string> = {
    new: 'bg-red-500/10 text-red-500 border-red-500/30',
    investigating: 'bg-blue/10 text-blue border-blue/30',
    contained: 'bg-grey-100 text-amber border-amber/30',
    resolved: 'bg-green/10 text-green border-green/30',
    escalated: 'bg-purple/10 text-purple border-purple/30',
};

const ACTION_STYLE: Record<ActionStatus, string> = {
    completed: 'text-green',
    pending: 'text-amber',
    failed: 'text-red-500',
};

export function IncidentResponse() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);
        fetch(apiUrl('/api/incidents'))
            .then((r) => r.json())
            .then((data) => {
                setIncidents(Array.isArray(data?.incidents) ? data.incidents : []);
                setSummary(data?.summary ?? null);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtered = incidents.filter((i) => statusFilter === 'all' || i.status === statusFilter);
    const selected = incidents.find((i) => i.id === selectedId) ?? null;

    async function updateStatus(id: string, status: IncidentStatus) {
        setBusy(true);
        try {
            await fetch(apiUrl(`/api/incidents/${id}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
        } finally {
            setBusy(false);
        }
    }

    // Detail view
    if (selected) {
        return (
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-[11px] font-bold text-foreground-muted hover:text-foreground mb-2">
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Incidents
                        </button>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${SEV_STYLE[selected.severity]}`}>{selected.severity}</span>
                            <span className="text-[10px] font-mono text-foreground-muted">{selected.id}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_STYLE[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
                        </div>
                        <h1 className="text-lg font-black text-foreground mt-1.5">{selected.title}</h1>
                        <p className="text-xs text-foreground-muted">Incident Response · Opened {selected.opened_at} · Analyst: {selected.assigned_analyst}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button disabled={busy} onClick={() => updateStatus(selected.id, 'investigating')} className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-blue rounded-lg px-3 py-1.5 disabled:opacity-50">
                            <Play className="w-3.5 h-3.5" /> Investigate
                        </button>
                        <button disabled={busy} onClick={() => updateStatus(selected.id, 'resolved')} className="flex items-center gap-1.5 text-[11px] font-bold text-foreground border border-border rounded-lg px-3 py-1.5 disabled:opacity-50">
                            <CheckCircle className="w-3.5 h-3.5" /> Resolve
                        </button>
                        <button disabled={busy} onClick={() => updateStatus(selected.id, 'escalated')} className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-1.5 disabled:opacity-50">
                            <TrendingUp className="w-3.5 h-3.5" /> Escalate
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Summary */}
                        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Summary</p>
                            <p className="text-xs text-foreground leading-relaxed">{selected.summary}</p>
                            <div className="flex flex-wrap gap-3 pt-2 border-t border-border text-xs">
                                <div>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">MITRE</p>
                                    <p className="text-foreground mt-0.5">{selected.mitre_tactic} · {selected.mitre_technique}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Affected Assets</p>
                                    <p className="text-foreground mt-0.5">{selected.affected_assets.join(', ')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Timeline</p>
                            <div className="space-y-0">
                                {selected.timeline.map((t, idx) => (
                                    <div key={t.id} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-blue mt-1.5 shrink-0" />
                                            {idx < selected.timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
                                        </div>
                                        <div className="pb-4">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-foreground">{t.action}</p>
                                                <span className="text-[10px] text-foreground-muted">{t.timestamp}</span>
                                            </div>
                                            <p className="text-[10px] text-foreground-muted">by {t.actor}</p>
                                            {t.detail && <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{t.detail}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Containment checklist */}
                    <div className="bg-card border border-border rounded-xl p-4 h-fit">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Containment Actions</p>
                        <div className="space-y-2.5">
                            {selected.containment_actions.map((a) => (
                                <div key={a.id} className="flex items-start gap-2">
                                    <CheckCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${ACTION_STYLE[a.status]}`} />
                                    <div>
                                        <p className={`text-xs ${a.status === 'completed' ? 'text-foreground-muted line-through' : 'text-foreground'}`}>{a.label}</p>
                                        {a.completed_at && <p className="text-[10px] text-foreground-muted">{a.completed_at}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
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
                    <h1 className="text-lg font-black text-foreground">Incident Response</h1>
                    <p className="text-xs text-foreground-muted">SecOps &amp; Response · Active and historical security incidents</p>
                </div>
                <button onClick={load} className="flex items-center gap-1.5 text-[11px] font-bold text-foreground-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Incidents', value: summary?.total, color: 'text-foreground', icon: FileText },
                    { label: 'Critical', value: summary?.critical, color: 'text-red-500', icon: AlertTriangle },
                    { label: 'Investigating', value: summary?.investigating, color: 'text-blue', icon: Clock },
                    { label: 'Resolved', value: summary?.resolved, color: 'text-green', icon: CheckCircle },
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

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
                {(['all', 'new', 'investigating', 'contained', 'resolved', 'escalated'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-md capitalize transition-colors ${statusFilter === s ? 'bg-blue text-white' : 'text-foreground-muted hover:text-foreground'}`}
                    >
                        {s === 'all' ? 'All' : STATUS_LABELS[s]}
                    </button>
                ))}
            </div>

            {/* Incident cards */}
            {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-card-muted rounded-xl animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="bg-card border border-border rounded-xl py-12 text-center">
                    <p className="text-xs text-foreground-muted">No incidents match the current filter.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((inc) => (
                        <button
                            key={inc.id}
                            onClick={() => setSelectedId(inc.id)}
                            className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-card-muted transition-colors flex items-center justify-between gap-4"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${SEV_STYLE[inc.severity]}`}>{inc.severity}</span>
                                    <span className="text-[10px] font-mono text-foreground-muted">{inc.id}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[inc.status]}`}>{STATUS_LABELS[inc.status]}</span>
                                </div>
                                <p className="text-sm font-bold text-foreground mt-1.5 truncate">{inc.title}</p>
                                <p className="text-[10px] text-foreground-muted mt-1">
                                    {inc.affected_assets.join(', ')} · {inc.assigned_analyst} · Updated {inc.updated_at}
                                </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-foreground-muted shrink-0" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
