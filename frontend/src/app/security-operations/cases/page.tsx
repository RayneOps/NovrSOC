'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { CASES, CASE_KPIS } from '@/lib/mock/cases';

const PRIORITY_BADGE: Record<string, string> = {
    P1: 'bg-red-500/10 text-red-500 border-red-500/30',
    P2: 'bg-amber/10 text-amber border-amber/30',
    P3: 'bg-amber/10 text-amber border-amber/30',
    P4: 'bg-green/10 text-green border-green/30',
};
const STATUS_BADGE: Record<string, string> = {
    Open: 'bg-card-muted text-foreground-muted',
    Investigating: 'bg-amber/10 text-amber',
    Escalated: 'bg-red-500/10 text-red-500',
    Contained: 'bg-green/10 text-green',
    Resolved: 'bg-green/10 text-green',
};

export default function CasesPage() {
    const [showModal, setShowModal] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const detail = CASES.find(c => c.id === selected);

    return (
        <PageLayout title="Cases">
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">Case Management</h1>
                        <p className="text-xs text-foreground-muted">Security Operations · Incident case tracking and investigation</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">+ New Case</button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                    {[
                        { label: 'Total Cases', v: CASE_KPIS.total, color: 'text-foreground' },
                        { label: 'Open', v: CASE_KPIS.open, color: 'text-foreground-muted' },
                        { label: 'Investigating', v: CASE_KPIS.investigating, color: 'text-amber' },
                        { label: 'Escalated', v: CASE_KPIS.escalated, color: 'text-red-500' },
                        { label: 'Contained', v: CASE_KPIS.contained, color: 'text-green' },
                        { label: 'Resolved', v: CASE_KPIS.resolved, color: 'text-green' },
                        { label: 'Avg Resolution', v: CASE_KPIS.avgResolutionTime, color: 'text-green' },
                        { label: 'SLA Compliance', v: CASE_KPIS.slaCompliance, color: 'text-green' },
                    ].map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-3">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-3 -mx-3 mb-2 rounded-t-xl" />
                            <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                            <p className={`text-base font-black ${k.color}`}>{k.v}</p>
                        </div>
                    ))}
                </div>

                <div className={`grid gap-5 ${detail ? 'grid-cols-3' : 'grid-cols-1'}`}>
                    {/* Cases table */}
                    <div className={detail ? 'col-span-2' : 'col-span-1'}>
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="h-[3px] bg-green from-green via-green to-red-500" />
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-border">
                                            {['Case ID', 'Title', 'Priority', 'Status', 'Assigned', 'Alerts', 'Created', 'Updated'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {CASES.map(c => (
                                            <tr key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
                                                className={`border-b border-border cursor-pointer transition-colors ${selected === c.id ? 'bg-green/10' : 'hover:bg-card-muted'}`}>
                                                <td className="px-4 py-3 font-mono text-green font-bold text-[10px]">{c.id}</td>
                                                <td className="px-4 py-3 font-semibold text-foreground max-w-[200px] truncate">{c.title}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${PRIORITY_BADGE[c.priority]}`}>{c.priority}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                                                </td>
                                                <td className="px-4 py-3 text-foreground-muted">{c.analyst}</td>
                                                <td className="px-4 py-3 text-center font-black text-foreground">{c.linkedAlerts}</td>
                                                <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{c.created}</td>
                                                <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{c.updated}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Detail panel */}
                    {detail && (
                        <div className="col-span-1 space-y-3">
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="h-[3px] bg-green from-green via-green to-red-500" />
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <p className="text-[10px] font-mono text-green">{detail.id}</p>
                                        <button onClick={() => setSelected(null)} className="text-foreground-muted hover:text-foreground-muted text-xs">✕</button>
                                    </div>
                                    <h3 className="text-sm font-black text-foreground mb-2">{detail.title}</h3>
                                    <p className="text-[10px] text-foreground-muted mb-3">{detail.description}</p>

                                    <div className="space-y-2 mb-4">
                                        {[
                                            ['Priority', detail.priority],
                                            ['Status', detail.status],
                                            ['Analyst', detail.analyst],
                                            ['Linked Alerts', String(detail.linkedAlerts)],
                                            ['MITRE Technique', detail.mitreTag],
                                            ['Created', detail.created],
                                            ['Updated', detail.updated],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between text-[10px]">
                                                <span className="text-foreground-muted">{k}</span>
                                                <span className="font-semibold text-foreground">{v}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <select className="w-full text-[10px] bg-card-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none">
                                            <option>Update status…</option>
                                            {['Open', 'Investigating', 'Escalated', 'Contained', 'Resolved'].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                        <button className="w-full py-2 bg-red hover:bg-red-hover text-white text-[10px] font-bold rounded-lg transition-colors">Assign to Me</button>
                                        <button className="w-full py-2 border border-border text-foreground-muted text-[10px] font-bold rounded-lg hover:bg-card-muted transition-colors">Add Note</button>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="h-[3px] bg-green from-green via-green to-red-500" />
                                <div className="p-4">
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Case Timeline</p>
                                    <div className="space-y-3">
                                        {[
                                            { time: '14:12', event: 'Case created', actor: 'Amaka Obi' },
                                            { time: '14:18', event: 'Alert ALT-001 linked', actor: 'System' },
                                            { time: '14:22', event: 'Endpoint isolated', actor: 'Amaka Obi' },
                                            { time: '14:35', event: 'Escalated to P1', actor: 'Chidi Nwosu' },
                                            { time: '14:55', event: 'Evidence collection started', actor: 'Amaka Obi' },
                                        ].map((e, i) => (
                                            <div key={i} className="flex gap-3 text-[10px]">
                                                <span className="font-mono text-foreground-muted flex-shrink-0 w-10">{e.time}</span>
                                                <div>
                                                    <p className="font-semibold text-foreground">{e.event}</p>
                                                    <p className="text-foreground-muted">{e.actor}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Case Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl">
                        <div className="h-[3px] bg-green from-green via-green to-red-500 rounded-t-2xl" />
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-foreground">New Case</h3>
                                <button onClick={() => setShowModal(false)} className="text-foreground-muted hover:text-foreground-muted">✕</button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Title', type: 'text', ph: 'Case title…' },
                                    { label: 'Description', type: 'textarea', ph: 'Describe the incident…' },
                                ].map(f => (
                                    <div key={f.label}>
                                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">{f.label}</label>
                                        {f.type === 'textarea'
                                            ? <textarea placeholder={f.ph} rows={3} className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                                            : <input type="text" placeholder={f.ph} className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                                        }
                                    </div>
                                ))}
                                <div>
                                    <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Priority</label>
                                    <select className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none">
                                        {['P1 — Critical', 'P2 — High', 'P3 — Medium', 'P4 — Low'].map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Assign To</label>
                                    <select className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none">
                                        <option>Unassigned</option>
                                        {['Amaka Obi', 'Chidi Nwosu', 'Tunde Adeyemi', 'Fatima Bello'].map(a => <option key={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-border text-foreground-muted text-xs font-bold rounded-lg hover:bg-card-muted transition-colors">Cancel</button>
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Create Case</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
