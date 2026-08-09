'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { SOAR_KPIS, PLAYBOOKS, EXECUTION_LOG, ACTIVE_RESPONSES } from '@/lib/mock/soar';

export default function SoarPage() {
    const [playbookStates, setPlaybookStates] = useState<boolean[]>(PLAYBOOKS.map(p => p.active));

    return (
        <PageLayout title="SOAR & Automation">
            <div className="space-y-5">
                <div>
                    <h1 className="text-lg font-black text-foreground">SOAR & Automation Dashboard</h1>
                    <p className="text-xs text-foreground-muted">Protection & Automation · Playbook management and execution monitoring</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-5 gap-3">
                    {[
                        { label: 'Playbooks Today', value: SOAR_KPIS.playbooksToday, color: 'text-green' },
                        { label: 'Tickets Auto-Closed', value: SOAR_KPIS.ticketsAutoClosed, color: 'text-green' },
                        { label: 'Auto-Contained', value: SOAR_KPIS.autoContained, color: 'text-green' },
                        { label: 'Mean Auto-Respond', value: SOAR_KPIS.mttaRespond, color: 'text-amber' },
                        { label: 'Success Rate', value: SOAR_KPIS.successRate, color: 'text-green' },
                    ].map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-4 -mx-4 mb-4 rounded-t-xl" />
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">{k.label}</p>
                            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                        </div>
                    ))}
                </div>

                {/* Active responses */}
                <div className="bg-card border border-amber/30 rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-amber to-amber" />
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
                            <p className="text-xs font-black text-foreground">Active Response Queue</p>
                        </div>
                        <div className="space-y-3">
                            {ACTIVE_RESPONSES.map(r => (
                                <div key={r.name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-foreground">{r.name}</span>
                                        <span className="text-foreground-muted">{r.description} — {r.pct}%</span>
                                    </div>
                                    <div className="w-full bg-card-muted h-2 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-green from-amber to-amber transition-all duration-1000" style={{ width: `${r.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Playbooks */}
                <div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Playbook Library</p>
                    <div className="grid grid-cols-2 gap-3">
                        {PLAYBOOKS.map((p, i) => (
                            <div key={p.name} className="bg-card border border-border rounded-xl overflow-hidden hover:border-green/30 transition-colors">
                                <div className="h-[3px] bg-green from-green via-green to-red-500" />
                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-foreground text-xs">{p.name}</p>
                                            <p className="text-[10px] text-foreground-muted mt-0.5">Trigger: {p.trigger}</p>
                                        </div>
                                        <button onClick={() => { const n = [...playbookStates]; n[i] = !n[i]; setPlaybookStates(n); }}
                                            className={`ml-3 flex-shrink-0 w-10 h-5 rounded-full transition-colors relative ${playbookStates[i] ? 'bg-green' : 'bg-card-muted'}`}>
                                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${playbookStates[i] ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex gap-3 text-[10px] text-foreground-muted">
                                            <span>Last: {p.lastRun}</span>
                                            <span>{p.runsThisWeek} runs</span>
                                            <span className="text-green">{p.successRate}% success</span>
                                        </div>
                                        <button className="text-[10px] font-bold text-green border border-green/30 px-2 py-0.5 rounded-lg hover:bg-green/10 transition-colors">▶ Run</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Execution log */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4 pb-0"><p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Execution Log</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-border">
                                {['Playbook', 'Trigger Event', 'Asset', 'Outcome', 'Duration', 'Timestamp', 'Override'].map(h =>
                                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                )}
                            </tr></thead>
                            <tbody>
                                {EXECUTION_LOG.map((e, i) => (
                                    <tr key={i} className="border-b border-border hover:bg-card-muted transition-colors">
                                        <td className="px-4 py-2 font-bold text-foreground whitespace-nowrap">{e.playbook}</td>
                                        <td className="px-4 py-2 text-foreground-muted max-w-[160px] truncate">{e.trigger}</td>
                                        <td className="px-4 py-2 font-mono text-foreground">{e.asset}</td>
                                        <td className="px-4 py-2 font-bold">{e.outcome === 'Success' ? <span className="text-green">✅ Success</span> : <span className="text-red-500">❌ Failed</span>}</td>
                                        <td className="px-4 py-2 font-mono text-foreground-muted">{e.duration}</td>
                                        <td className="px-4 py-2 font-mono text-foreground-muted">{e.timestamp}</td>
                                        <td className="px-4 py-2">{e.override ? <span className="text-amber text-[10px]">👤 Manual</span> : <span className="text-foreground-muted text-[10px]">Auto</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
