'use client';

import { useState } from 'react';
import { Download, Mail, Plus, X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { exportDataAsPDF } from '@/lib/exportPDF';
import { apiUrl } from '@/lib/api';

// Mock data only, except "Generate + Email" on Weekly Security Digest — that one calls the
// real backend/src/services/email.ts's sendWeeklyReportEmail via POST /api/email/weekly-report.
// Every other report type's "Generate + Email" is still PDF-only + a note, since there's no
// backend template for e.g. an Incident Report or Compliance Report email yet — sending those
// through the weekly-digest template would be a real security report with the wrong shape.

interface ReportType {
    id: string; name: string; description: string; audience: string; includes: string[]; format: string; est_pages: string; icon: string;
}
const REPORT_TYPES: ReportType[] = [
    { id: 'executive_summary', name: 'Executive Summary', description: 'High-level security posture for board and C-suite', audience: 'CISO, Board, CEO', includes: ['Threat overview', 'Compliance scores', 'Key incidents', 'Recommendations'], format: 'PDF', est_pages: '2-3 pages', icon: '📊' },
    { id: 'technical_report', name: 'Technical Security Report', description: 'Full technical detail for IT and security teams', audience: 'IT Director, Security Team', includes: ['All alerts with details', 'Vulnerability scan', 'Network activity', 'Wazuh agent status'], format: 'PDF', est_pages: '10-20 pages', icon: '🔧' },
    { id: 'compliance_report', name: 'Compliance Evidence Report', description: 'Evidence documentation for regulatory requirements', audience: 'Compliance Officer, Auditor', includes: ['NDPR controls', 'CBN framework', 'ISO 27001', 'Control evidence'], format: 'PDF', est_pages: '15-25 pages', icon: '📋' },
    { id: 'incident_report', name: 'Incident Report', description: 'Formal report for a specific security incident', audience: 'Management, Regulators', includes: ['Incident timeline', 'Root cause', 'Impact assessment', 'Remediation steps'], format: 'PDF', est_pages: '5-10 pages', icon: '🚨' },
    { id: 'vendor_report', name: 'Vendor Security Assessment', description: 'Security posture report for a specific vendor', audience: 'Procurement, Legal', includes: ['Vendor score', 'Risk findings', 'Recommendation', 'Due diligence evidence'], format: 'PDF', est_pages: '3-5 pages', icon: '🏢' },
    { id: 'weekly_digest', name: 'Weekly Security Digest', description: 'Summary of the past week\'s security activity', audience: 'All stakeholders', includes: ['Alert counts', 'Incidents handled', 'Top threats', 'Upcoming actions'], format: 'PDF + Email', est_pages: '1-2 pages', icon: '📅' },
];

interface Schedule { id: string; type: string; frequency: string; recipients: string[]; last_sent: string | null; next_send: string }
const SCHEDULES: Schedule[] = [
    { id: 'sch_001', type: 'Weekly Security Digest', frequency: 'Weekly (Sunday 08:00 WAT)', recipients: ['rayne@cybernovr.com', 'karl@cybernovr.com'], last_sent: '2026-08-17', next_send: '2026-08-31' },
    { id: 'sch_002', type: 'Compliance Evidence Report', frequency: 'Monthly (1st)', recipients: ['rayne@cybernovr.com'], last_sent: '2026-08-01', next_send: '2026-09-01' },
];

interface HistoryEntry { id: string; name: string; generated: string; size: string; status: 'ready' | 'failed' }
const HISTORY: HistoryEntry[] = [
    { id: 'rpt_001', name: 'Executive Summary — Aug W3', generated: '2026-08-17 08:02', size: '340 KB', status: 'ready' },
    { id: 'rpt_002', name: 'Technical Security Report — Aug', generated: '2026-08-15 14:20', size: '2.1 MB', status: 'ready' },
    { id: 'rpt_003', name: 'Vendor Security Assessment — Dangote Group', generated: '2026-08-10 11:05', size: '210 KB', status: 'ready' },
];

const TABS = [
    { id: 'generate', label: 'Generate Report' },
    { id: 'scheduled', label: 'Scheduled Reports' },
    { id: 'history', label: 'Report History' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function ReportsCenter() {
    const [tab, setTab] = useState<Tab>('generate');
    const [selectedType, setSelectedType] = useState<ReportType | null>(null);
    const [period, setPeriod] = useState('this_week');
    const [generating, setGenerating] = useState(false);
    const [generated, setGenerated] = useState<'pdf' | 'email' | 'email_failed' | null>(null);
    const [showAddSchedule, setShowAddSchedule] = useState(false);
    const [recipients, setRecipients] = useState('rayne@cybernovr.com, karl@cybernovr.com');

    const generate = async (withEmail: boolean) => {
        if (!selectedType) return;
        setGenerating(true);
        setGenerated(null);

        exportDataAsPDF(selectedType.name, selectedType.id, [
            { heading: 'Report Details', rows: [
                { label: 'Type', value: selectedType.name },
                { label: 'Audience', value: selectedType.audience },
                { label: 'Period', value: period.replace('_', ' ') },
            ] },
            { heading: 'Includes', rows: selectedType.includes.map((i) => ({ label: '•', value: i })) },
        ]);

        // Only Weekly Security Digest has a real backend email template — everything else is
        // PDF-only for now (see file header note).
        if (withEmail && selectedType.id === 'weekly_digest') {
            const to = recipients.split(',').map((r) => r.trim()).filter(Boolean);
            const today = new Date();
            const weekStart = new Date(today.getTime() - 6 * 86400000);
            try {
                const res = await fetch(apiUrl('/api/email/weekly-report'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to,
                        orgName: 'Cybernovr',
                        weekStart: weekStart.toLocaleDateString(),
                        weekEnd: today.toLocaleDateString(),
                        totalAlerts: 0, criticalCount: 0, highCount: 0, resolvedCount: 0,
                        complianceScore: 74, complianceChange: 2,
                        topThreats: [],
                        slaUptime: 99.9, backupStatus: 'All Successful', openIncidents: 0,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                setGenerated(res.ok && data?.success !== false ? 'email' : 'email_failed');
            } catch {
                setGenerated('email_failed');
            }
        } else {
            setGenerated('pdf');
        }
        setGenerating(false);
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Reports Center</h1>
                <p className="text-xs text-foreground-muted">SecOps & Response · Central hub for report generation and scheduled delivery.</p>
            </div>

            <div className="flex gap-1 border-b border-border">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${tab === t.id ? 'border-blue text-blue' : 'border-transparent text-foreground-muted hover:text-foreground'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'generate' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {REPORT_TYPES.map((rt) => (
                            <button key={rt.id} onClick={() => { setSelectedType(rt); setGenerated(null); }}
                                className={`text-left bg-card border rounded-xl p-4 transition-colors ${selectedType?.id === rt.id ? 'border-blue ring-1 ring-blue/30' : 'border-border hover:border-grey-300'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{rt.icon}</span>
                                    <p className="text-sm font-bold text-foreground">{rt.name}</p>
                                </div>
                                <p className="text-xs text-foreground-muted mb-2">{rt.description}</p>
                                <p className="text-[10px] text-foreground-muted">For: {rt.audience}</p>
                                <p className="text-[10px] text-foreground-muted">{rt.format} · {rt.est_pages}</p>
                            </button>
                        ))}
                    </div>

                    {selectedType && (
                        <div className="bg-card border border-border rounded-xl p-5 max-w-xl">
                            <h3 className="font-heading font-semibold text-sm text-foreground mb-4">Generate: {selectedType.name}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Time Period</label>
                                    <select value={period} onChange={(e) => setPeriod(e.target.value)}
                                        className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none text-foreground">
                                        <option value="this_week">This Week</option>
                                        <option value="this_month">This Month</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                </div>
                                <div className="bg-card-muted rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wide mb-2">Preview — this report will include</p>
                                    <ul className="text-xs text-foreground space-y-1">
                                        {selectedType.includes.map((i) => <li key={i}>• {i}</li>)}
                                    </ul>
                                </div>
                                {selectedType.id === 'weekly_digest' && (
                                    <div>
                                        <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Recipients (comma-separated)</label>
                                        <input value={recipients} onChange={(e) => setRecipients(e.target.value)}
                                            className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple text-foreground" />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={() => generate(false)} disabled={generating}
                                        className="flex-1 flex items-center justify-center gap-2 bg-orange hover:bg-orange-hover text-white text-sm font-bold py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                                        {generating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                                        {generating ? 'Generating…' : 'Generate PDF'}
                                    </button>
                                    <button onClick={() => generate(true)} disabled={generating}
                                        className="flex-1 flex items-center justify-center gap-2 border border-purple text-purple text-sm font-bold py-2.5 rounded-lg disabled:opacity-50 hover:bg-purple/5 transition-colors">
                                        <Mail size={14} /> Generate + Email
                                    </button>
                                </div>
                                {generated === 'pdf' && selectedType.id !== 'weekly_digest' && (
                                    <div className="flex items-center gap-2 text-xs text-green bg-green/10 border border-green/30 rounded-lg px-3 py-2">
                                        <CheckCircle2 size={14} /> PDF downloaded. Email delivery is only wired up for the Weekly Security Digest so far.
                                    </div>
                                )}
                                {generated === 'pdf' && selectedType.id === 'weekly_digest' && (
                                    <div className="flex items-center gap-2 text-xs text-green bg-green/10 border border-green/30 rounded-lg px-3 py-2">
                                        <CheckCircle2 size={14} /> PDF downloaded.
                                    </div>
                                )}
                                {generated === 'email' && (
                                    <div className="flex items-center gap-2 text-xs text-green bg-green/10 border border-green/30 rounded-lg px-3 py-2">
                                        <CheckCircle2 size={14} /> PDF downloaded and report emailed to {recipients.split(',').filter((r) => r.trim()).length} recipient(s). Alert/compliance figures above are placeholders — nothing here reads real dashboard stats yet.
                                    </div>
                                )}
                                {generated === 'email_failed' && (
                                    <div className="flex items-center gap-2 text-xs text-red bg-red/10 border border-red/30 rounded-lg px-3 py-2">
                                        <AlertTriangle size={14} /> PDF downloaded, but email delivery failed — check that SENDGRID_API_KEY/EMAIL_ENABLED are set (see the Email tab on Alert Communication).
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'scheduled' && (
                <div className="space-y-3">
                    <button onClick={() => setShowAddSchedule(true)} className="flex items-center gap-2 bg-orange hover:bg-orange-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors">
                        <Plus size={14} /> Add Schedule
                    </button>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="overflow-x-auto scrollbar-thin">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-grey-800">
                                        {['Report Type', 'Frequency', 'Recipients', 'Last Sent', 'Next Send'].map((c) => (
                                            <th key={c} className="px-4 py-3 text-[10px] font-semibold text-white uppercase tracking-widest whitespace-nowrap">{c}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {SCHEDULES.map((s) => (
                                        <tr key={s.id}>
                                            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{s.type}</td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{s.frequency}</td>
                                            <td className="px-4 py-3 text-foreground-muted">{s.recipients.join(', ')}</td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{s.last_sent ?? '—'}</td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{s.next_send}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'history' && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-grey-800">
                                    {['Report Name', 'Generated', 'Size', 'Status', ''].map((c) => (
                                        <th key={c} className="px-4 py-3 text-[10px] font-semibold text-white uppercase tracking-widest whitespace-nowrap">{c}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {HISTORY.map((h) => (
                                    <tr key={h.id}>
                                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{h.name}</td>
                                        <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{h.generated}</td>
                                        <td className="px-4 py-3 text-foreground-muted">{h.size}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold uppercase ${h.status === 'ready' ? 'text-green' : 'text-red'}`}>{h.status}</span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button className="text-[10px] font-bold text-blue hover:text-purple mr-3">Download</button>
                                            <button className="text-[10px] font-bold text-blue hover:text-purple">Resend</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showAddSchedule && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddSchedule(false)}>
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-semibold text-sm text-foreground">Add Schedule</h3>
                            <button onClick={() => setShowAddSchedule(false)} className="text-foreground-muted hover:text-foreground"><X size={16} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Report Type</label>
                                <select className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none text-foreground">
                                    {REPORT_TYPES.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Frequency</label>
                                <select className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none text-foreground">
                                    <option>Daily</option><option>Weekly</option><option>Monthly</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Recipient Emails</label>
                                <input placeholder="comma-separated emails" className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue text-foreground" />
                            </div>
                            <button onClick={() => setShowAddSchedule(false)} className="w-full bg-orange hover:bg-orange-hover text-white text-sm font-bold py-2.5 rounded-lg transition-colors">
                                Save Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
