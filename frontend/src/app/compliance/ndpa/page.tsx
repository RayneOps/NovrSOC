'use client';

import { PageLayout } from '@/components/layout/PageLayout';

const DOMAINS = [
    {
        name: 'Data Processing Lawfulness', score: 95,
        controls: [
            { label: 'Consent management',           status: 'pass' },
            { label: 'Lawful basis documented',       status: 'pass' },
            { label: 'Processing records complete',   status: 'pass' },
        ],
    },
    {
        name: 'Data Subject Rights', score: 78,
        controls: [
            { label: 'Right to access',     status: 'pass' },
            { label: 'Right to erasure',    status: 'partial' },
            { label: 'Data portability',    status: 'partial' },
            { label: 'Complaint handling',  status: 'pass' },
        ],
    },
    {
        name: 'Data Protection Officer', score: 100,
        controls: [
            { label: 'DPO appointed',                  status: 'pass' },
            { label: 'DPO registered with NITDA',      status: 'pass' },
            { label: 'DPO contact published',          status: 'pass' },
        ],
    },
    {
        name: 'Breach Notification', score: 90,
        controls: [
            { label: '72hr notification procedure',         status: 'pass' },
            { label: 'Breach log maintained',               status: 'pass' },
            { label: 'NITDA notification template ready',   status: 'partial' },
        ],
    },
    {
        name: 'Third Party Processors', score: 72,
        controls: [
            { label: 'Processor agreements in place',   status: 'partial' },
            { label: 'Transfer safeguards',             status: 'partial' },
            { label: 'Sub-processor management',        status: 'fail' },
        ],
    },
    {
        name: 'Privacy Policy', score: 85,
        controls: [
            { label: 'Policy published',        status: 'pass' },
            { label: 'Last updated: 15 Mar 2026', status: 'partial' },
            { label: 'Cookie consent',          status: 'pass' },
        ],
    },
];

const DEADLINES = [
    { date: '01 Aug 2026', item: 'Annual NITDA compliance filing due' },
    { date: '15 Aug 2026', item: 'DPO reregistration renewal' },
    { date: '01 Oct 2026', item: 'Privacy impact assessment review' },
];

const STATUS_ICON: Record<string, string> = { pass: '✅', partial: '🟡', fail: '❌' };

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

export default function NDPAPage() {
    const overall = Math.round(DOMAINS.reduce((sum, d) => sum + d.score, 0) / DOMAINS.length);

    return (
        <PageLayout title="NDPA Compliance">
            <div className="space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">Nigeria Data Protection Act</h1>
                        <p className="text-xs text-foreground-muted">Compliance · NDPA Compliance Tracker, powered by NITDA framework</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center min-w-[100px]">
                        <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-4 -mx-4 mb-3 rounded-t-xl" />
                        <p className={`text-3xl font-black ${scoreColor(overall)}`}>{overall}%</p>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase mt-1">Overall Score</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {DOMAINS.map(d => (
                        <div key={d.name} className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="h-[3px] bg-green from-green via-green to-red-500" />
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-black text-foreground">{d.name}</p>
                                    <span className={`text-sm font-black ${scoreColor(d.score)}`}>{d.score}%</span>
                                </div>
                                <div className="h-1.5 bg-card-muted rounded-full mb-3">
                                    <div className={`h-1.5 rounded-full ${barColor(d.score)} transition-all`} style={{ width: `${d.score}%` }} />
                                </div>
                                <div className="space-y-1">
                                    {d.controls.map(c => (
                                        <div key={c.label} className="flex items-center gap-2 text-[11px] text-foreground-muted">
                                            <span>{STATUS_ICON[c.status]}</span>
                                            <span>{c.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Upcoming Deadlines</p>
                        <div className="space-y-2">
                            {DEADLINES.map(d => (
                                <div key={d.date} className="flex items-center gap-4">
                                    <span className="text-[10px] font-mono font-bold text-green flex-shrink-0">{d.date}</span>
                                    <span className="text-xs text-foreground">{d.item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
