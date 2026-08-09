'use client';

import { PageLayout } from '@/components/layout/PageLayout';
import { GaugeChart } from '@/components/shared/GaugeChart';

const ASSET_SCORES = [
    { asset: 'PROD-SERVER-01', type: 'Server', score: 82, cves: 8, internet: true, patches: 5, lastScan: 'Today 08:00' },
    { asset: 'DOMAIN-CTRL-01', type: 'Server', score: 78, cves: 6, internet: false, patches: 4, lastScan: 'Today 08:05' },
    { asset: 'WORKSTATION-042', type: 'Workstation', score: 74, cves: 5, internet: false, patches: 3, lastScan: 'Today 07:30' },
    { asset: 'FIREWALL-01', type: 'Firewall', score: 61, cves: 3, internet: true, patches: 2, lastScan: 'Today 07:45' },
    { asset: 'WORKSTATION-017', type: 'Workstation', score: 55, cves: 4, internet: false, patches: 3, lastScan: 'Today 07:30' },
    { asset: 'APP-SERVER-01', type: 'Server', score: 49, cves: 3, internet: true, patches: 2, lastScan: 'Today 08:10' },
    { asset: 'WORKSTATION-019', type: 'Workstation', score: 42, cves: 2, internet: false, patches: 1, lastScan: 'Today 07:30' },
    { asset: 'MGMT-WS', type: 'Workstation', score: 38, cves: 1, internet: false, patches: 1, lastScan: 'Today 07:30' },
    { asset: 'BACKUP-SERVER-01', type: 'Server', score: 33, cves: 2, internet: false, patches: 2, lastScan: 'Yesterday' },
    { asset: 'PROD-SERVER-03', type: 'Server', score: 28, cves: 1, internet: true, patches: 0, lastScan: 'Today 08:00' },
];

const TREND = [58, 60, 63, 62, 64, 65, 63, 66, 67, 64, 65, 63];
const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const scoreColor = (s: number) =>
    s >= 70 ? '#EF4444' : s >= 50 ? '#D97706' : s >= 40 ? '#D97706' : '#16A34A';
const scoreLabel = (s: number) =>
    s >= 70 ? 'text-red-500' : s >= 50 ? 'text-amber' : s >= 40 ? 'text-amber' : 'text-green';

export default function ExposureScoresPage() {
    const overall = 63;

    return (
        <PageLayout title="Exposure Scores">
            <div className="space-y-4">
                <div>
                    <h1 className="text-lg font-black text-foreground">Exposure Scores</h1>
                    <p className="text-xs text-foreground-muted">Exposure Monitoring · Risk-based asset exposure scoring and trend analysis</p>
                </div>

                {/* Overall score + trend */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-card border border-border rounded-xl overflow-hidden flex items-center gap-5 p-5">
                        <div className="h-[3px] bg-green from-green via-green to-red-500 absolute top-0 left-0 right-0" />
                        <div className="relative flex-shrink-0">
                            <GaugeChart value={overall} size={90} strokeWidth={10} color={scoreColor(overall)} />
                            <span className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-black text-amber">{overall}</span>
                                <span className="text-[9px] text-foreground-muted">/100</span>
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Overall Exposure</p>
                            <p className="text-sm font-black text-amber mt-1">Elevated Risk</p>
                            <p className="text-[10px] text-foreground-muted mt-1">+2 from last week</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl overflow-hidden p-5 col-span-2">
                        <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-5 -mx-5 mb-4 rounded-t-xl" />
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">12-Month Exposure Trend</p>
                        <div className="flex items-end gap-1.5 h-20 mt-3">
                            {TREND.map((v, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                    <div className="w-full rounded-t-sm" style={{ height: `${v}%`, backgroundColor: scoreColor(v), opacity: 0.7 + (i / TREND.length) * 0.3 }} />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[9px] text-foreground-muted mt-1">
                            {MONTHS.map(m => <span key={m}>{m}</span>)}
                        </div>
                    </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Assets Scanned', v: '1,418', color: 'text-green' },
                        { label: 'High Exposure (≥70)', v: '24', color: 'text-red-500' },
                        { label: 'Avg Score', v: '51', color: 'text-amber' },
                        { label: 'Internet-Facing', v: '6', color: 'text-green' },
                    ].map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-3">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-3 -mx-3 mb-2 rounded-t-xl" />
                            <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                            <p className={`text-xl font-black ${k.color}`}>{k.v}</p>
                        </div>
                    ))}
                </div>

                {/* Per-asset scores table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4 border-b border-border">
                        <p className="text-xs font-black text-foreground">Asset Exposure Scores</p>
                        <p className="text-[10px] text-foreground-muted">Ranked by risk exposure — highest to lowest</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Asset', 'Type', 'Exposure Score', 'Open CVEs', 'Internet-Facing', 'Pending Patches', 'Last Scan', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ASSET_SCORES.map(a => (
                                    <tr key={a.asset} className="border-b border-border hover:bg-card-muted transition-colors">
                                        <td className="px-4 py-3 font-mono font-bold text-foreground">{a.asset}</td>
                                        <td className="px-4 py-3 text-foreground-muted">{a.type}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 bg-card-muted h-2 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${a.score}%`, backgroundColor: scoreColor(a.score) }} />
                                                </div>
                                                <span className={`font-black text-[11px] ${scoreLabel(a.score)}`}>{a.score}</span>
                                            </div>
                                        </td>
                                        <td className={`px-4 py-3 font-black ${a.cves >= 6 ? 'text-red-500' : a.cves >= 3 ? 'text-amber' : 'text-foreground-muted'}`}>{a.cves}</td>
                                        <td className="px-4 py-3">
                                            {a.internet ? <span className="text-[10px] font-bold text-amber">🌐 Yes</span> : <span className="text-[10px] text-foreground-muted">No</span>}
                                        </td>
                                        <td className={`px-4 py-3 font-bold ${a.patches >= 4 ? 'text-red-500' : a.patches > 0 ? 'text-amber' : 'text-green'}`}>{a.patches}</td>
                                        <td className="px-4 py-3 text-foreground-muted">{a.lastScan}</td>
                                        <td className="px-4 py-3">
                                            <button className="text-[10px] font-bold text-green hover:underline">Remediate</button>
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
