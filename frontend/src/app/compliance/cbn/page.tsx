'use client';

import { PageLayout } from '@/components/layout/PageLayout';

type TrafficStatus = 'Compliant' | 'Partial' | 'Non-Compliant';

const CONTROLS: { name: string; status: TrafficStatus; score: number; gap?: string; note?: string }[] = [
    { name: 'Governance & Strategy',             status: 'Compliant',      score: 94 },
    { name: 'Asset Management',                  status: 'Compliant',      score: 92 },
    { name: 'Access Control & Identity',         status: 'Partial',        score: 78, gap: 'Privileged access review overdue' },
    { name: 'Incident Response & Reporting',     status: 'Compliant',      score: 96, note: 'Last CBN incident report filed 15 Jun 2026' },
    { name: 'Third Party Risk',                  status: 'Non-Compliant',  score: 61, gap: '3 critical vendor assessments overdue' },
    { name: 'Business Continuity',               status: 'Compliant',      score: 88 },
    { name: 'Security Awareness Training',       status: 'Compliant',      score: 91 },
    { name: 'Patch & Vulnerability Management',  status: 'Partial',        score: 74, gap: '12 critical patches pending' },
];

const DOT: Record<TrafficStatus, string> = {
    'Compliant':     'bg-green',
    'Partial':       'bg-amber',
    'Non-Compliant': 'bg-red-500',
};
const BADGE: Record<TrafficStatus, string> = {
    'Compliant':     'bg-green/10 text-green',
    'Partial':       'bg-amber/10 text-amber',
    'Non-Compliant': 'bg-red-500/10 text-red-500',
};

function scoreColor(s: number) {
    if (s >= 85) return 'text-green';
    if (s >= 70) return 'text-amber';
    return 'text-red-500';
}
function barColor(s: number) {
    if (s >= 85) return 'bg-green';
    if (s >= 70) return 'bg-amber';
    return 'bg-red-500';
}

export default function CBNPage() {
    const overall = Math.round(CONTROLS.reduce((sum, c) => sum + c.score, 0) / CONTROLS.length);

    return (
        <PageLayout title="CBN Compliance">
            <div className="space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">CBN Cybersecurity Framework</h1>
                        <p className="text-xs text-foreground-muted">Compliance · Central Bank of Nigeria Cybersecurity Framework for Financial Institutions</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center min-w-[100px]">
                        <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-4 -mx-4 mb-3 rounded-t-xl" />
                        <p className={`text-3xl font-black ${scoreColor(overall)}`}>{overall}%</p>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase mt-1">Overall Score</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {CONTROLS.map(ctrl => (
                        <div key={ctrl.name} className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="h-[3px] bg-green from-green via-green to-red-500" />
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <p className="text-xs font-black text-foreground">{ctrl.name}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1.5 ${BADGE[ctrl.status]}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[ctrl.status]}`} />
                                        {ctrl.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex-1 h-1.5 bg-card-muted rounded-full">
                                        <div className={`h-1.5 rounded-full ${barColor(ctrl.score)}`} style={{ width: `${ctrl.score}%` }} />
                                    </div>
                                    <span className={`text-sm font-black flex-shrink-0 ${scoreColor(ctrl.score)}`}>{ctrl.score}%</span>
                                </div>
                                {ctrl.gap && (
                                    <p className="text-[10px] text-amber bg-amber/10 rounded px-2 py-1 mt-1">⚠ Gap: {ctrl.gap}</p>
                                )}
                                {ctrl.note && (
                                    <p className="text-[10px] text-foreground-muted mt-1">ℹ {ctrl.note}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Regulatory Timeline</p>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                            <div><p className="text-[10px] text-foreground-muted uppercase font-bold mb-0.5">Next CBN Assessment</p><p className="font-bold text-foreground">01 Sep 2026</p></div>
                            <div><p className="text-[10px] text-foreground-muted uppercase font-bold mb-0.5">Last Examination</p><p className="font-bold text-foreground">01 Mar 2026</p></div>
                            <div><p className="text-[10px] text-foreground-muted uppercase font-bold mb-0.5">Examination Result</p><p className="font-bold text-green">Satisfactory ✅</p></div>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
