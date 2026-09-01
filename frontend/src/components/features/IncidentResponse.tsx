'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';
import { getAdminUser } from '@/lib/admin-auth';
import { exportDataAsPDF } from '@/lib/exportPDF';
import {
    AlertTriangle,
    Clock,
    CheckCircle,
    ArrowLeft,
    RefreshCw,
    Play,
    TrendingUp,
    FileText,
    ChevronRight,
    MessageSquarePlus,
    FileDown,
    Shield,
    Server,
    Laptop,
    Radio,
    Terminal,
    UserCheck,
    Lock
} from 'lucide-react';

type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
type IncidentStatus = 'new' | 'investigating' | 'contained' | 'resolved' | 'escalated';
type ActionStatus = 'completed' | 'pending' | 'failed';
type NoteType = 'Update' | 'Evidence' | 'Decision' | 'Escalation';

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

interface AnalystNote {
    id: string;
    author: string;
    type: NoteType;
    text: string;
    timestamp: string;
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
    notes: AnalystNote[];
    source?: 'wazuh' | 'thehive' | 'internal';
    rule_id?: string;
    sla_remaining?: string;
}

interface Summary {
    total: number;
    critical: number;
    investigating: number;
    resolved: number;
}

const SEV_CONFIG: Record<IncidentSeverity, { bg: string; text: string; border: string }> = {
    critical: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
    high: { bg: 'bg-orange/10', text: 'text-orange', border: 'border-orange/30' },
    medium: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
    low: { bg: 'bg-blue/10', text: 'text-blue', border: 'border-blue/30' },
};

const STATUS_CONFIG: Record<IncidentStatus, { bg: string; text: string; border: string }> = {
    new: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
    investigating: { bg: 'bg-blue/10', text: 'text-blue', border: 'border-blue/30' },
    contained: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
    resolved: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
    escalated: { bg: 'bg-purple/10', text: 'text-purple', border: 'border-purple/30' },
};

const NOTE_TYPE_STYLE: Record<NoteType, string> = {
    Update: 'bg-blue/15 text-blue border-blue/30',
    Evidence: 'bg-card-muted text-foreground-muted border-border',
    Decision: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    Escalation: 'bg-red-500/15 text-red-500 border-red-500/30',
};

const NOTE_TYPES: NoteType[] = ['Update', 'Evidence', 'Decision', 'Escalation'];

export function IncidentResponse() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [showAddNote, setShowAddNote] = useState(false);
    const [noteType, setNoteType] = useState<NoteType>('Update');
    const [noteText, setNoteText] = useState('');

    const load = () => {
        setLoading(true);
        fetch(apiUrl('/api/incidents'))
            .then((r) => r.json())
            .then((data) => {
                setIncidents(Array.isArray(data?.incidents) ? data.incidents : []);
                setSummary(data?.summary ?? null);
            })
            .catch(() => setIncidents([]))
            .finally(() => setLoading(false));
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

    async function addNote(id: string) {
        if (!noteText.trim()) return;
        setBusy(true);
        try {
            const author = getAdminUser()?.name || 'RayneOps';
            const res = await fetch(apiUrl(`/api/incidents/${id}/notes`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author, type: noteType, text: noteText.trim() }),
            });
            const data = await res.json();
            if (data?.note) {
                setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, notes: [...i.notes, data.note] } : i)));
            }
            setNoteText('');
            setShowAddNote(false);
        } finally {
            setBusy(false);
        }
    }

    function exportIncidentPDF(incident: Incident) {
        exportDataAsPDF(incident.title, `incident-${incident.id}`, [
            {
                heading: 'Incident Overview',
                rows: [
                    { label: 'Incident ID', value: incident.id },
                    { label: 'Severity', value: incident.severity.toUpperCase() },
                    { label: 'Status', value: incident.status.toUpperCase() },
                    { label: 'MITRE ATT&CK', value: `${incident.mitre_tactic} · ${incident.mitre_technique}` },
                    { label: 'Lead Analyst', value: incident.assigned_analyst },
                    { label: 'Affected Asset(s)', value: incident.affected_assets.join(', ') },
                    { label: 'Rule ID', value: incident.rule_id || 'N/A' },
                ],
            },
            { heading: 'Telemetry & Evidence', rows: [{ label: 'Raw Alert Log', value: incident.summary }] },
            {
                heading: 'Audit Timeline',
                rows: incident.timeline.map((t) => ({ label: `${t.timestamp} · ${t.actor}`, value: `${t.action}${t.detail ? ` — ${t.detail}` : ''}` })),
            },
            {
                heading: 'Analyst Case Notes',
                rows: incident.notes.length > 0
                    ? incident.notes.map((n) => ({ label: `${n.timestamp} · ${n.author} [${n.type}]`, value: n.text }))
                    : [{ label: 'Notes', value: 'No analyst notes recorded.' }],
            },
        ]);
    }

    // Detail View
    if (selected) {
        const sev = SEV_CONFIG[selected.severity];
        const stat = STATUS_CONFIG[selected.status];

        return (
            <div className="space-y-5 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div>
                        <button
                            onClick={() => setSelectedId(null)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Incident Queue
                        </button>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${sev.bg} ${sev.text} ${sev.border}`}>
                                {selected.severity}
                            </span>
                            <span className="font-mono text-xs text-foreground-muted font-bold">{selected.id}</span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${stat.bg} ${stat.text} ${stat.border}`}>
                                {selected.status}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary border border-border px-2 py-0.5 rounded-full">
                                <Radio className="w-2.5 h-2.5 animate-pulse text-blue" /> Wazuh SIEM
                            </span>
                        </div>
                        <h1 className="text-xl font-black text-foreground mt-2 tracking-tight">{selected.title}</h1>
                        <p className="text-xs text-foreground-muted mt-0.5">
                            Opened: <span className="text-foreground">{selected.opened_at}</span> · Assigned Analyst: <span className="text-foreground font-semibold">{selected.assigned_analyst}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button onClick={() => exportIncidentPDF(selected)} className="flex items-center gap-1.5 text-xs font-bold text-foreground-muted hover:text-foreground border border-border bg-card px-3 py-2 rounded-lg transition-colors">
                            <FileDown size={14} /> PDF
                        </button>
                        <button disabled={busy} onClick={() => updateStatus(selected.id, 'investigating')} className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue hover:bg-blue/90 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50">
                            <Play size={14} /> Investigate
                        </button>
                        <button disabled={busy} onClick={() => updateStatus(selected.id, 'resolved')} className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50">
                            <CheckCircle size={14} /> Resolve
                        </button>
                        <button disabled={busy} onClick={() => updateStatus(selected.id, 'escalated')} className="flex items-center gap-1.5 text-xs font-bold text-red-500 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50">
                            <TrendingUp size={14} /> Escalate
                        </button>
                    </div>
                </div>

                {/* Detail Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Telemetry Summary */}
                        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-border pb-2.5">
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Terminal size={14} className="text-orange" /> SIEM Log & Evidence
                                </h3>
                                {selected.rule_id && (
                                    <span className="text-[10px] font-mono text-foreground-muted bg-card-muted px-2 py-0.5 rounded border border-border">
                                        Rule: {selected.rule_id}
                                    </span>
                                )}
                            </div>
                            <p className="font-mono text-xs bg-card-muted/60 p-3 rounded-lg border border-border text-foreground leading-relaxed overflow-x-auto">
                                {selected.summary}
                            </p>
                            <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                                <div>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">MITRE ATT&CK</p>
                                    <p className="font-bold text-foreground mt-0.5">{selected.mitre_tactic} · <span className="text-amber-500 font-mono">{selected.mitre_technique}</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Affected Host</p>
                                    <p className="font-bold text-foreground mt-0.5">{selected.affected_assets.join(', ')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock size={14} className="text-blue" /> Audit Timeline
                            </h3>
                            <div className="space-y-0">
                                {selected.timeline.map((t, idx) => (
                                    <div key={t.id} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue ring-4 ring-blue/10 shrink-0 mt-1" />
                                            {idx < selected.timeline.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                                        </div>
                                        <div className="pb-4">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-foreground">{t.action}</p>
                                                <span className="text-[10px] text-foreground-muted">{t.timestamp}</span>
                                            </div>
                                            <p className="text-[11px] text-foreground-muted">Triggered by {t.actor}</p>
                                            {t.detail && <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{t.detail}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Analyst Case Notes */}
                        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-border pb-2.5">
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <UserCheck size={14} className="text-purple" /> Analyst Case Notes
                                </h3>
                                <button
                                    onClick={() => setShowAddNote((v) => !v)}
                                    className="flex items-center gap-1 text-xs font-bold text-orange hover:text-orange-hover"
                                >
                                    <MessageSquarePlus size={14} /> Add Note
                                </button>
                            </div>

                            {showAddNote && (
                                <div className="p-3 bg-card-muted/40 rounded-xl border border-border space-y-2.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {NOTE_TYPES.map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setNoteType(t)}
                                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                                                    noteType === t ? NOTE_TYPE_STYLE[t] : 'bg-card text-foreground-muted border-border'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        rows={2}
                                        placeholder="Add timestamped investigative notes..."
                                        className="w-full bg-card border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-orange resize-none"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setShowAddNote(false)} className="text-xs font-semibold text-foreground-muted px-3 py-1.5">
                                            Cancel
                                        </button>
                                        <button
                                            disabled={busy || !noteText.trim()}
                                            onClick={() => addNote(selected.id)}
                                            className="text-xs font-bold text-white bg-orange hover:bg-orange-hover px-3.5 py-1.5 rounded-lg disabled:opacity-50"
                                        >
                                            Save Note
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selected.notes.length === 0 ? (
                                <p className="text-xs text-foreground-muted py-2">No analyst notes added to this investigation yet.</p>
                            ) : (
                                <div className="space-y-2.5 divide-y divide-border/40">
                                    {selected.notes.map((n) => (
                                        <div key={n.id} className="pt-2 flex gap-2.5 items-start">
                                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                                {n.author.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-foreground">{n.author}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${NOTE_TYPE_STYLE[n.type]}`}>
                                                        {n.type}
                                                    </span>
                                                    <span className="text-[10px] text-foreground-muted ml-auto">{n.timestamp}</span>
                                                </div>
                                                <p className="text-xs text-foreground mt-0.5 leading-relaxed">{n.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Containment Checklist Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Lock size={14} className="text-red-500" /> Containment Checklist
                            </h3>
                            <div className="space-y-2.5">
                                {selected.containment_actions.map((a) => (
                                    <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-lg bg-card-muted/30 border border-border">
                                        <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${a.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                        <div className="min-w-0">
                                            <p className={`text-xs font-medium ${a.status === 'completed' ? 'line-through text-foreground-muted' : 'text-foreground'}`}>{a.label}</p>
                                            {a.completed_at && <p className="text-[10px] text-foreground-muted mt-0.5">{a.completed_at}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="space-y-5 max-w-7xl mx-auto">
            {/* Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Shield className="w-4 h-4 text-orange" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Incident Response</h1>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                        SecOps Triage · Real-time Wazuh SIEM security events, forensic timelines, and containment
                    </p>
                </div>
                <button
                    onClick={load}
                    className="flex items-center gap-1.5 text-xs font-bold text-foreground-muted hover:text-foreground border border-border bg-card px-3.5 py-2 rounded-lg transition-colors self-start sm:self-auto"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Feeds
                </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {[
                    { label: 'Total Ingested', value: summary?.total ?? 0, color: 'text-foreground', icon: FileText },
                    { label: 'Critical Severity', value: summary?.critical ?? 0, color: 'text-red-500', icon: AlertTriangle },
                    { label: 'In Triage', value: summary?.investigating ?? 0, color: 'text-blue', icon: Clock },
                    { label: 'Contained / Resolved', value: summary?.resolved ?? 0, color: 'text-emerald-500', icon: CheckCircle },
                ].map((k) => (
                    <div key={k.label} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs">
                        <div>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                            <p className={`text-2xl font-black ${k.color} mt-0.5`}>{k.value}</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-card-muted flex items-center justify-center">
                            <k.icon className={`w-4 h-4 ${k.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1 w-fit overflow-x-auto">
                {(['all', 'new', 'investigating', 'contained', 'resolved', 'escalated'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-md capitalize transition-all whitespace-nowrap ${
                            statusFilter === s ? 'bg-blue text-white shadow-xs' : 'text-foreground-muted hover:text-foreground'
                        }`}
                    >
                        {s === 'all' ? 'All Incidents' : s}
                    </button>
                ))}
            </div>

            {/* Main Incident List */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 bg-card-muted/60 border border-border rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-card border border-border rounded-xl py-12 text-center shadow-xs">
                    <p className="text-xs text-foreground-muted">No incidents match the active filter criteria.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filtered.map((inc) => {
                        const sev = SEV_CONFIG[inc.severity];
                        const stat = STATUS_CONFIG[inc.status];
                        const isDesktop = inc.affected_assets[0]?.includes('DESKTOP');

                        return (
                            <div
                                key={inc.id}
                                onClick={() => setSelectedId(inc.id)}
                                className="w-full bg-card border border-border rounded-xl p-4 hover:border-orange/40 hover:bg-card-muted/30 transition-all flex items-center justify-between gap-4 cursor-pointer shadow-xs group"
                            >
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${sev.bg} ${sev.text} ${sev.border}`}>
                                            {inc.severity}
                                        </span>
                                        <span className="font-mono text-[10px] text-foreground-muted font-bold">{inc.id}</span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${stat.bg} ${stat.text} ${stat.border}`}>
                                            {inc.status}
                                        </span>
                                        <span className="text-[10px] text-amber-500 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                            {inc.mitre_tactic} · {inc.mitre_technique}
                                        </span>
                                    </div>

                                    <p className="text-sm font-bold text-foreground group-hover:text-orange transition-colors truncate">
                                        {inc.title}
                                    </p>

                                    <div className="flex items-center gap-3 text-[11px] text-foreground-muted flex-wrap">
                                        <span className="flex items-center gap-1 font-mono text-[10px]">
                                            {isDesktop ? <Laptop size={11} /> : <Server size={11} />}
                                            {inc.affected_assets.join(', ')}
                                        </span>
                                        <span>•</span>
                                        <span>Analyst: <strong className="text-foreground">{inc.assigned_analyst}</strong></span>
                                        <span>•</span>
                                        <span>Updated: {inc.updated_at}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {inc.sla_remaining && (
                                        <div className="hidden md:flex flex-col items-end text-right">
                                            <span className="text-[9px] uppercase font-bold text-foreground-muted">SLA Target</span>
                                            <span className="text-xs font-mono text-foreground font-semibold flex items-center gap-1">
                                                <Clock size={11} className="text-orange" /> {inc.sla_remaining}
                                            </span>
                                        </div>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}