'use client';

import { PageLayout } from '@/components/layout/PageLayout';

type TrafficStatus = 'Compliant' | 'Partial' | 'Non-Compliant';

const CONTROLS: { name: string; status: TrafficStatus; score: number; gap?: string }[] = [
    { name: 'Network Security',             status: 'Compliant', score: 89 },
    { name: 'Data Localisation',            status: 'Partial',   score: 72, gap: 'Some data stored outside Nigeria' },
    { name: 'Lawful Interception',          status: 'Compliant', score: 95 },
    { name: 'Subscriber Data Protection',   status: 'Partial',   score: 76 },
    { name: 'Incident Reporting to NCC',    status: 'Compliant', score: 91 },
    { name: 'Infrastructure Protection',    status: 'Partial',   score: 68, gap: 'Physical security audit pending' },
];

const DOT: Record<TrafficStatus, string>   = { 'Compliant': 'bg-green', 'Partial': 'bg-amber', 'Non-Compliant': 'bg-red-500' };
const BADGE: Record<TrafficStatus, string> = { 'Compliant': 'bg-green/10 text-green', 'Partial': 'bg-amber/10 text-amber', 'Non-Compliant': 'bg-red-500/10 text-red-500' };

function scoreColor(s: number) { return s >= 85 ? 'text-green' : s >= 70 ? 'text-amber' : 'text-red-500'; }
function barColor(s: number)   { return s >= 85 ? 'bg-green'   : s >= 70 ? 'bg-amber'   : 'bg-red-500'; }

export default function NCCPage() {
    const overall = Math.round(CONTROLS.reduce((sum, c) => sum + c.score, 0) / CONTROLS.length);

    return (
        <PageLayout title="NCC Compliance">
            <div className="space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">NCC Cybersecurity Framework</h1>
                        <p className="text-xs text-foreground-muted">Compliance · Nigerian Communications Commission Cybersecurity Requirements</p>
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
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-card-muted rounded-full">
                                        <div className={`h-1.5 rounded-full ${barColor(ctrl.score)}`} style={{ width: `${ctrl.score}%` }} />
                                    </div>
                                    <span className={`text-sm font-black flex-shrink-0 ${scoreColor(ctrl.score)}`}>{ctrl.score}%</span>
                                </div>
                                {ctrl.gap && (
                                    <p className="text-[10px] text-amber bg-amber/10 rounded px-2 py-1 mt-2">⚠ Gap: {ctrl.gap}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Regulatory Timeline</p>
                        <p className="text-xs text-foreground">Next NCC quarterly report due: <span className="font-bold text-green">30 Jul 2026</span></p>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
