'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { REPORT_TEMPLATES, SCHEDULED_REPORTS, REPORT_HISTORY } from '@/lib/mock/reports';

export default function ReportingPage() {
    const [generating, setGenerating] = useState<string | null>(null);

    const handleGenerate = (name: string) => {
        setGenerating(name);
        setTimeout(() => setGenerating(null), 2000);
    };

    return (
        <PageLayout title="Reporting Center">
            <div className="space-y-5">
                <div>
                    <h1 className="text-lg font-black text-foreground">Report Center</h1>
                    <p className="text-xs text-foreground-muted">Reporting · Generate, schedule, and download security reports</p>
                </div>

                {/* Templates */}
                <div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Report Templates</p>
                    <div className="grid grid-cols-3 gap-4">
                        {REPORT_TEMPLATES.map(t => (
                            <div key={t.name} className="bg-card border border-border rounded-xl overflow-hidden hover:border-green/30 transition-colors">
                                <div className="h-[3px] bg-green from-green to-green" />
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <p className="font-bold text-foreground text-xs leading-tight flex-1">{t.name}</p>
                                        <span className="text-[9px] font-bold px-2 py-0.5 bg-green/10 text-green border border-green/30 rounded ml-2 flex-shrink-0">{t.format}</span>
                                    </div>
                                    <p className="text-[10px] text-foreground-muted mb-3">{t.description}</p>
                                    <div className="text-[10px] text-foreground-muted mb-3">
                                        <p>Last generated: {t.lastGenerated}</p>
                                        <p>Est. time: {t.estimatedTime}</p>
                                    </div>
                                    <button onClick={() => handleGenerate(t.name)} disabled={generating === t.name}
                                        className="w-full py-2 bg-green hover:bg-green disabled:opacity-60 text-white text-[10px] font-bold rounded-lg transition-colors">
                                        {generating === t.name ? '⏳ Generating…' : '⬇ Generate Report'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scheduled */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green to-green" />
                    <div className="p-4 pb-0"><p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Scheduled Reports</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-border">
                                {['Report Name', 'Frequency', 'Recipients', 'Format', 'Next Run', 'Status'].map(h =>
                                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                )}
                                <th className="px-4 py-2" />
                            </tr></thead>
                            <tbody>
                                {SCHEDULED_REPORTS.map(r => (
                                    <tr key={r.name} className="border-b border-border hover:bg-card-muted transition-colors">
                                        <td className="px-4 py-3 font-semibold text-foreground">{r.name}</td>
                                        <td className="px-4 py-3 text-foreground-muted">{r.frequency}</td>
                                        <td className="px-4 py-3 font-mono text-foreground-muted text-[10px]">{r.recipients}</td>
                                        <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground-muted rounded">{r.format}</span></td>
                                        <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{r.nextRun}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold ${r.active ? 'text-green' : 'text-foreground-muted'}`}>
                                                {r.active ? '✅ Active' : '⏸ Paused'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3"><button className="text-[10px] font-bold text-foreground-muted hover:text-foreground">Edit</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* History */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green to-green" />
                    <div className="p-4 pb-0"><p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Report History</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-border">
                                {['Report Name', 'Generated', 'Generated By', 'Size', 'Format', 'Download'].map(h =>
                                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                )}
                            </tr></thead>
                            <tbody>
                                {REPORT_HISTORY.map(r => (
                                    <tr key={r.name} className="border-b border-border hover:bg-card-muted transition-colors">
                                        <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{r.name}</td>
                                        <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{r.generated}</td>
                                        <td className="px-4 py-3 text-foreground-muted">{r.by}</td>
                                        <td className="px-4 py-3 text-foreground-muted">{r.size}</td>
                                        <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground-muted rounded">{r.format}</span></td>
                                        <td className="px-4 py-3">
                                            <button className="text-green hover:text-green/30 transition-colors">⬇</button>
                                        </td>
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
