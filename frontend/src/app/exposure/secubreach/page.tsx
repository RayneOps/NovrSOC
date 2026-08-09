'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { GaugeChart } from '@/components/shared/GaugeChart';
import { CVES, VULN_ASSET_EXPOSURE, REMEDIATION_BOARD } from '@/lib/mock/cves';

const priorityColor: Record<string, string> = {
    P1: 'bg-red-500/10 text-red-500 border-red-500/30',
    P2: 'bg-amber/10 text-amber border-amber/30',
    P3: 'bg-amber/10 text-amber border-amber/30',
    P4: 'bg-green/10 text-green border-green/30',
};

const KANBAN_COLS = [
    { key: 'todo', label: 'To Do', color: 'border-red-500/30' },
    { key: 'inProgress', label: 'In Progress', color: 'border-amber/30' },
    { key: 'patched', label: 'Patched', color: 'border-green/30' },
    { key: 'acceptedRisk', label: 'Accepted Risk', color: 'border-border' },
] as const;

const sevCardColor = (s: string) =>
    s === 'Critical' ? 'border-red-500/30 bg-red-500/10' : 'border-amber/30 bg-amber/10';

export default function SecuBreachPage() {
    const [showAll, setShowAll] = useState(false);

    return (
        <PageLayout title="SecuBreach">
            <div className="space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black text-foreground">SecuBreach: Vulnerability & Exposure Management</h1>
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-amber/10 text-amber border border-amber/30 rounded-full">Powered by SecuBreach</span>
                        </div>
                        <p className="text-xs text-foreground-muted">Vulnerability Management · Risk-prioritized CVE tracking and remediation</p>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                        <div className="relative">
                            <GaugeChart value={63} size={72} strokeWidth={8} color="#f97316" />
                            <span className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-base font-black text-amber">63</span>
                                <span className="text-[8px] text-foreground-muted">/100</span>
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Exposure Score</p>
                            <p className="text-xs font-bold text-amber mt-1">Elevated Risk</p>
                        </div>
                    </div>
                    {[
                        { label: 'Critical CVEs', value: 3, color: 'text-red-500' },
                        { label: 'Exploitable This Week', value: 12, color: 'text-red-500', hero: true },
                        { label: 'Remediation Rate', value: '74%', color: 'text-green' },
                    ].map(k => (
                        <div key={k.label} className={`bg-card border rounded-xl p-4 ${k.hero ? 'border-red-500/30' : 'border-border'}`}>
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-4 -mx-4 mb-4 rounded-t-xl" />
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">{k.label}</p>
                            <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
                            {k.hero && <p className="text-[9px] text-red-500/80 mt-1">Immediate action required</p>}
                        </div>
                    ))}
                </div>

                {/* Priority banner */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 flex items-center gap-4">
                    <span className="text-2xl">⚠️</span>
                    <p className="text-sm font-bold text-red-500">
                        12 vulnerabilities assessed as likely to be exploited this week — prioritized for immediate action
                    </p>
                </div>

                {/* CVE Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4 pb-0 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Risk-Prioritized CVE List</p>
                        <span className="text-[10px] text-foreground-muted">{CVES.length} vulnerabilities shown</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-border">
                                {['CVE ID', 'CVSS', 'Asset', 'Description', 'Exploit', 'Patch', 'Days', 'Priority', ''].map(h =>
                                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                )}
                            </tr></thead>
                            <tbody>
                                {CVES.slice(0, showAll ? undefined : 6).map(cve => (
                                    <tr key={cve.id} className="border-b border-border hover:bg-card-muted transition-colors">
                                        <td className="px-4 py-3 font-mono text-green font-bold">{cve.id}</td>
                                        <td className={`px-4 py-3 font-black ${cve.cvss >= 9 ? 'text-red-500' : 'text-amber'}`}>{cve.cvss}</td>
                                        <td className="px-4 py-3 font-mono text-foreground">{cve.asset}</td>
                                        <td className="px-4 py-3 text-foreground-muted max-w-[200px] truncate">{cve.description}</td>
                                        <td className="px-4 py-3">{cve.exploitAvail ? '✅' : '❌'}</td>
                                        <td className="px-4 py-3">{cve.patchAvail ? '✅' : '❌'}</td>
                                        <td className={`px-4 py-3 font-bold ${cve.daysExposed > 14 ? 'text-red-500' : 'text-foreground'}`}>{cve.daysExposed}</td>
                                        <td className="px-4 py-3"><span className={`text-[10px] font-black px-2 py-0.5 rounded border ${priorityColor[cve.priority]}`}>{cve.priority}</span></td>
                                        <td className="px-4 py-3"><button className="text-[10px] font-bold text-green hover:underline">Remediate →</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 border-t border-border">
                        <button onClick={() => setShowAll(!showAll)} className="text-[10px] font-bold text-green hover:underline">
                            {showAll ? '▲ Show fewer' : `▼ Show all ${CVES.length} vulnerabilities (+112 lower priority)`}
                        </button>
                    </div>
                </div>

                {/* Asset exposure */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-4">Asset Exposure Map</p>
                        <div className="space-y-2">
                            {VULN_ASSET_EXPOSURE.map(a => {
                                const max = VULN_ASSET_EXPOSURE[0].count;
                                return (
                                    <div key={a.asset} className="flex items-center gap-3">
                                        <span className="font-mono text-[10px] text-foreground-muted w-40 flex-shrink-0">{a.asset}</span>
                                        <div className="flex-1 bg-card-muted h-2 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-green from-green to-red-500" style={{ width: `${(a.count / max) * 100}%` }} />
                                        </div>
                                        <span className="text-[11px] font-black text-foreground w-8 text-right">{a.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Remediation Kanban */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-4">Remediation Tracker</p>
                        <div className="grid grid-cols-4 gap-3">
                            {KANBAN_COLS.map(col => (
                                <div key={col.key} className={`border ${col.color} rounded-lg p-2 space-y-2 min-h-[120px]`}>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">{col.label}</p>
                                    {REMEDIATION_BOARD[col.key].map(card => (
                                        <div key={card.id} className={`border rounded-lg p-2 text-[10px] ${sevCardColor(card.severity)}`}>
                                            <p className="font-mono font-bold text-foreground">{card.id}</p>
                                            <p className="text-foreground-muted mt-0.5">{card.asset}</p>
                                            <div className="flex justify-between mt-1 text-foreground-muted">
                                                <span>{card.analyst}</span>
                                                <span>{card.due}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
