'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';

const ALERTS = [
    { id: 'ALT-001', sev: 'Critical', name: 'Mimikatz execution detected', source: 'EDR-Agent', asset: 'WORKSTATION-042', mitre: 'T1003', time: '14:22:01', status: 'New' },
    { id: 'ALT-002', sev: 'Critical', name: 'Ransomware file encryption started', source: 'EDR-Agent', asset: 'WORKSTATION-017', mitre: 'T1486', time: '14:18:44', status: 'New' },
    { id: 'ALT-003', sev: 'High', name: 'PowerShell encoded command', source: 'Wazuh', asset: 'PROD-SERVER-03', mitre: 'T1059.001', time: '14:15:22', status: 'Assigned' },
    { id: 'ALT-004', sev: 'High', name: 'Abnormal admin login — off-hours', source: 'SIEM', asset: 'DOMAIN-CTRL-01', mitre: 'T1078', time: '13:50:10', status: 'Investigating' },
    { id: 'ALT-005', sev: 'High', name: 'Credential dump via LSASS', source: 'EDR-Agent', asset: 'WORKSTATION-042', mitre: 'T1003.001', time: '14:11:03', status: 'Investigating' },
    { id: 'ALT-006', sev: 'Medium', name: 'DNS DGA query detected', source: 'DNS-Monitor', asset: 'WORKSTATION-019', mitre: 'T1568', time: '06:50:22', status: 'New' },
    { id: 'ALT-007', sev: 'Medium', name: 'Suspicious outbound connection', source: 'Network-Monitor', asset: 'PROD-SERVER-03', mitre: 'T1041', time: '11:02:44', status: 'New' },
    { id: 'ALT-008', sev: 'High', name: 'Pass-the-hash lateral movement', source: 'SIEM', asset: 'WORKSTATION-023', mitre: 'T1550.002', time: '13:10:15', status: 'Investigating' },
    { id: 'ALT-009', sev: 'Critical', name: 'BEC email — suspicious wire request', source: 'Email-Gateway', asset: 'MAIL-SERVER-01', mitre: 'T1566.002', time: '13:45:00', status: 'Escalated' },
    { id: 'ALT-010', sev: 'Medium', name: 'Internal port scan detected', source: 'Wazuh', asset: 'WORKSTATION-008', mitre: 'T1046', time: '08:45:11', status: 'New' },
    { id: 'ALT-011', sev: 'High', name: 'Brute force on VPN', source: 'VPN-Gateway', asset: 'VPN-GATEWAY', mitre: 'T1078', time: '07:21:00', status: 'Open' },
    { id: 'ALT-012', sev: 'Low', name: 'Backup job failure', source: 'Backup-Agent', asset: 'BACKUP-SERVER-01', mitre: 'N/A', time: '03:00:00', status: 'Resolved' },
];

const CASES = [
    { id: 'CAS-2026-0041', title: 'Ransomware Investigation — WS042', priority: 'P1', analyst: 'Amaka Obi', alerts: 3, status: 'Investigating', created: 'Today 14:12' },
    { id: 'CAS-2026-0040', title: 'BEC Attack — Finance', priority: 'P1', analyst: 'Chidi Nwosu', alerts: 5, status: 'Escalated', created: 'Today 13:47' },
    { id: 'CAS-2026-0039', title: 'Brute Force Campaign', priority: 'P2', analyst: 'Tunde Adeyemi', alerts: 8, status: 'Investigating', created: 'Today 07:22' },
];

const TIMELINE = [
    { time: '14:10:22', type: '⚡', event: 'Suspicious process spawned', detail: 'cmd.exe → powershell.exe', asset: 'WORKSTATION-042' },
    { time: '14:10:45', type: '💻', event: 'Encoded PowerShell command executed', detail: 'Base64 encoded payload detected', asset: 'WORKSTATION-042' },
    { time: '14:11:03', type: '🔑', event: 'Credential dump attempt (LSASS)', detail: 'Mimikatz tool signature detected', asset: 'WORKSTATION-042' },
    { time: '14:11:18', type: '🔀', event: 'Lateral movement attempt', detail: 'SMB connection to DOMAIN-CTRL-01', asset: 'Network' },
    { time: '14:11:35', type: '☣️', event: 'Ransomware binary dropped', detail: 'invoice_Q2.exe created in %TEMP%', asset: 'WORKSTATION-042' },
    { time: '14:11:41', type: '🔒', event: 'File encryption started', detail: '847 files affected in C:\\Users\\', asset: 'WORKSTATION-042' },
    { time: '14:11:49', type: '🛡️', event: 'EDR isolation triggered', detail: 'Endpoint isolated from network', asset: 'WORKSTATION-042' },
    { time: '14:12:02', type: '📋', event: 'Alert fired → Case created', detail: 'CAS-2026-0041 opened', asset: 'NovrSOC Platform' },
];

const HUNTING_FIELDS = ['process.name', 'command_line', 'ip.src', 'ip.dst', 'file.name', 'user.name'];
const HUNTING_OPS = ['=', 'CONTAINS', '!=', 'STARTS WITH', 'ENDS WITH'];

const sevBadge: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    High: 'bg-amber/10 text-amber border-amber/30',
    Medium: 'bg-amber/10 text-amber border-amber/30',
    Low: 'bg-green/10 text-green border-green/30',
};

export default function WorkbenchPage() {
    const [tab, setTab] = useState<'alerts' | 'cases' | 'timeline' | 'hunting' | 'ioc'>('alerts');
    const [iocQuery, setIocQuery] = useState('');
    const [iocResult, setIocResult] = useState(false);
    const [huntConditions, setHuntConditions] = useState([{ field: 'process.name', op: '=', value: 'powershell.exe' }]);

    return (
        <PageLayout title="Analyst Workbench">
            <div className="space-y-4">
                <div>
                    <h1 className="text-lg font-black text-foreground">SOC Analyst Workbench</h1>
                    <p className="text-xs text-foreground-muted">Security Operations · Full analyst toolkit: alerts, cases, threat hunting, IOC lookup</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-card-muted border border-border rounded-xl p-1 w-fit">
                    {([['alerts', '⚠️ Alert Queue'], ['cases', '📂 Cases'], ['timeline', '⏱️ Timeline'], ['hunting', '🔍 Threat Hunting'], ['ioc', '🔎 IOC Lookup']] as const).map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === k ? 'bg-amber text-white' : 'text-foreground-muted hover:text-foreground'}`}>{l}</button>
                    ))}
                </div>

                {/* Alert Queue */}
                {tab === 'alerts' && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="h-[3px] bg-green from-green via-green to-red-500" />
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead><tr className="border-b border-border">
                                    {['Severity', 'Alert Name', 'Source', 'Asset', 'MITRE', 'Time', 'Status', 'Actions'].map(h =>
                                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    )}
                                </tr></thead>
                                <tbody>
                                    {ALERTS.map(a => (
                                        <tr key={a.id} className="border-b border-border hover:bg-card-muted transition-colors">
                                            <td className="px-4 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sevBadge[a.sev]}`}>{a.sev}</span></td>
                                            <td className="px-4 py-2 font-semibold text-foreground whitespace-nowrap">{a.name}</td>
                                            <td className="px-4 py-2 font-mono text-foreground-muted">{a.source}</td>
                                            <td className="px-4 py-2 font-mono text-foreground">{a.asset}</td>
                                            <td className="px-4 py-2 font-mono text-amber text-[10px]">{a.mitre}</td>
                                            <td className="px-4 py-2 font-mono text-foreground-muted">{a.time}</td>
                                            <td className="px-4 py-2"><span className="text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground-muted rounded">{a.status}</span></td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <button className="text-[10px] font-bold text-green hover:underline mr-2">Investigate</button>
                                                <button className="text-[10px] font-bold text-foreground-muted hover:text-foreground">Assign</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Cases */}
                {tab === 'cases' && (
                    <div className="space-y-3">
                        <div className="flex justify-end">
                            <button className="px-3 py-1.5 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">+ New Case</button>
                        </div>
                        {CASES.map(c => (
                            <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:border-green/30 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[10px] text-foreground-muted">{c.id}</span>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${c.priority === 'P1' ? 'bg-red-500/10 text-red-500' : 'bg-amber/10 text-amber'}`}>{c.priority}</span>
                                        </div>
                                        <p className="font-bold text-foreground mt-1">{c.title}</p>
                                        <p className="text-[10px] text-foreground-muted mt-0.5">Analyst: {c.analyst} · {c.alerts} linked alerts · Created: {c.created}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber/10 text-amber rounded">{c.status}</span>
                                        <button className="text-[10px] font-bold text-green border border-green/30 px-2 py-1 rounded-lg hover:bg-green/10 transition-colors">View →</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Timeline */}
                {tab === 'timeline' && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="h-[3px] bg-green from-green via-green to-red-500" />
                        <div className="p-4">
                            <p className="text-xs font-black text-foreground mb-1">Incident Timeline: CAS-2026-0041</p>
                            <p className="text-[10px] text-foreground-muted mb-4">Ransomware Investigation · WORKSTATION-042</p>
                            <div className="space-y-1 border-l-2 border-green/30 pl-4 ml-2">
                                {TIMELINE.map((t, i) => (
                                    <div key={i} className="relative pb-3">
                                        <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-card border-2 border-green/30 flex items-center justify-center text-[8px]">{t.type}</div>
                                        <div className="bg-card-muted rounded-lg p-3 border border-border">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-[10px] text-green">{t.time}</span>
                                                <span className="text-xs font-bold text-foreground">{t.event}</span>
                                            </div>
                                            <p className="text-[10px] text-foreground-muted">{t.detail}</p>
                                            <p className="text-[9px] text-foreground-muted mt-0.5 font-mono">{t.asset}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Threat Hunting */}
                {tab === 'hunting' && (
                    <div className="space-y-4">
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="h-[3px] bg-green from-green via-green to-red-500" />
                            <div className="p-4">
                                <p className="text-xs font-black text-foreground mb-3">Threat Hunting Query Builder</p>
                                <div className="space-y-2">
                                    {huntConditions.map((c, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            {i > 0 && <span className="text-[10px] font-bold text-green w-8">AND</span>}
                                            <select value={c.field} onChange={e => { const n = [...huntConditions]; n[i] = { ...n[i], field: e.target.value }; setHuntConditions(n); }}
                                                className="bg-card-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none">
                                                {HUNTING_FIELDS.map(f => <option key={f}>{f}</option>)}
                                            </select>
                                            <select value={c.op} onChange={e => { const n = [...huntConditions]; n[i] = { ...n[i], op: e.target.value }; setHuntConditions(n); }}
                                                className="bg-card-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none">
                                                {HUNTING_OPS.map(o => <option key={o}>{o}</option>)}
                                            </select>
                                            <input value={c.value} onChange={e => { const n = [...huntConditions]; n[i] = { ...n[i], value: e.target.value }; setHuntConditions(n); }}
                                                className="flex-1 bg-card-muted border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                                            {huntConditions.length > 1 && (
                                                <button onClick={() => setHuntConditions(huntConditions.filter((_, j) => j !== i))} className="text-foreground-muted hover:text-red-500 text-sm">✕</button>
                                            )}
                                        </div>
                                    ))}
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => setHuntConditions([...huntConditions, { field: 'process.name', op: '=', value: '' }])} className="text-[10px] font-bold text-green border border-green/30 px-2 py-1 rounded-lg hover:bg-green/10 transition-colors">+ Add Condition</button>
                                        <button className="px-4 py-1.5 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">▶ Run Query</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="h-[3px] bg-green from-green via-green to-red-500" />
                            <div className="p-4">
                                <p className="text-xs font-bold text-foreground-muted mb-2">Query Results — 3 matches</p>
                                <table className="w-full text-xs">
                                    <thead><tr className="border-b border-border">
                                        {['Timestamp', 'Host', 'Process', 'Command Line', 'User'].map(h => <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                        {[['14:10:45', 'WORKSTATION-042', 'powershell.exe', 'powershell.exe -encodedCommand JAB...', 'CORP\\j.okafor'],
                                          ['13:55:12', 'WORKSTATION-017', 'powershell.exe', 'powershell.exe -NoProfile -NonInteractive -enc JAB...', 'CORP\\b.eze'],
                                          ['09:28:33', 'PROD-SERVER-03', 'powershell.exe', 'powershell.exe -WindowStyle Hidden -enc SUV...', 'NT AUTHORITY\\SYSTEM'],
                                        ].map(([ts, h, p, cmd, u]) => (
                                            <tr key={ts} className="border-b border-border hover:bg-card-muted transition-colors">
                                                <td className="px-3 py-2 font-mono text-foreground-muted">{ts}</td>
                                                <td className="px-3 py-2 font-mono text-foreground">{h}</td>
                                                <td className="px-3 py-2 font-mono text-amber">{p}</td>
                                                <td className="px-3 py-2 font-mono text-foreground-muted max-w-[200px] truncate">{cmd}</td>
                                                <td className="px-3 py-2 font-mono text-foreground-muted">{u}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* IOC Lookup */}
                {tab === 'ioc' && (
                    <div className="space-y-4">
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="h-[3px] bg-green from-green via-green to-red-500" />
                            <div className="p-4">
                                <p className="text-xs font-black text-foreground mb-3">IOC Enrichment Lookup</p>
                                <div className="flex gap-2">
                                    <input value={iocQuery} onChange={e => setIocQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && setIocResult(true)}
                                        placeholder="Enter IP, domain, hash, or email address…"
                                        className="flex-1 bg-card-muted border border-border rounded-lg px-4 py-2.5 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-green/20" />
                                    <button onClick={() => setIocResult(true)} className="px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Search</button>
                                </div>
                                {iocResult && iocQuery && (
                                    <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="font-mono text-sm font-bold text-foreground">{iocQuery}</p>
                                            <span className="text-xs font-black bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1 rounded-full">🔴 MALICIOUS</span>
                                        </div>
                                        {[['VirusTotal', '48/72 engines flagged', 'Malware distribution', 'text-green'],
                                          ['Feed Source B', 'Confidence 94% malicious', '312 abuse reports', 'text-green'],
                                          ['Feed Source A', '3 threat pulses', 'Linked to Lazarus Group', 'text-amber'],
                                        ].map(([src, det, ctx, cls]) => (
                                            <div key={src} className="flex items-start gap-3 border-b border-border pb-2">
                                                <span className={`text-xs font-black ${cls} w-32 flex-shrink-0`}>{src}</span>
                                                <span className="text-xs text-foreground">{det}</span>
                                                <span className="text-xs text-foreground-muted ml-auto">{ctx}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
