'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';

const TACTICS = ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Command & Control', 'Exfiltration', 'Impact'];

const TECHNIQUES: Record<string, { id: string; name: string; alerts: number; lastSeen: string; incidents: string[] }[]> = {
    'Initial Access': [
        { id: 'T1566', name: 'Phishing', alerts: 14, lastSeen: 'Today 14:22', incidents: ['INC-2026-0040'] },
        { id: 'T1190', name: 'Exploit Public App', alerts: 3, lastSeen: 'Today 09:10', incidents: ['INC-2026-0039'] },
        { id: 'T1133', name: 'External Remote Services', alerts: 6, lastSeen: 'Today 07:20', incidents: ['INC-2026-0032'] },
        { id: 'T1078', name: 'Valid Accounts', alerts: 6, lastSeen: 'Today 13:50', incidents: ['INC-2026-0036'] },
    ],
    'Execution': [
        { id: 'T1059', name: 'Command Scripting', alerts: 8, lastSeen: 'Today 14:10', incidents: ['INC-2026-0041'] },
        { id: 'T1204', name: 'User Execution', alerts: 4, lastSeen: 'Today 10:15', incidents: ['INC-2026-0034'] },
        { id: 'T1106', name: 'Native API', alerts: 2, lastSeen: 'Yesterday', incidents: [] },
        { id: 'T1053', name: 'Scheduled Task', alerts: 1, lastSeen: '2 days ago', incidents: [] },
    ],
    'Persistence': [
        { id: 'T1547', name: 'Boot/Logon Autostart', alerts: 2, lastSeen: 'Yesterday', incidents: [] },
        { id: 'T1136', name: 'Create Account', alerts: 1, lastSeen: '3 days ago', incidents: [] },
        { id: 'T1543', name: 'Create/Modify System Process', alerts: 0, lastSeen: '—', incidents: [] },
        { id: 'T1574', name: 'Hijack Execution Flow', alerts: 0, lastSeen: '—', incidents: [] },
    ],
    'Privilege Escalation': [
        { id: 'T1055', name: 'Process Injection', alerts: 2, lastSeen: 'Today 14:11', incidents: ['INC-2026-0041'] },
        { id: 'T1068', name: 'Exploitation for Priv Esc', alerts: 0, lastSeen: '—', incidents: [] },
        { id: 'T1548', name: 'Abuse Elevation Control', alerts: 1, lastSeen: '2 days ago', incidents: [] },
        { id: 'T1134', name: 'Access Token Manipulation', alerts: 0, lastSeen: '—', incidents: [] },
    ],
    'Defense Evasion': [
        { id: 'T1562', name: 'Impair Defenses', alerts: 3, lastSeen: 'Today 14:10', incidents: [] },
        { id: 'T1070', name: 'Indicator Removal', alerts: 5, lastSeen: 'Today 09:30', incidents: ['INC-2026-0035'] },
        { id: 'T1027', name: 'Obfuscated Files', alerts: 4, lastSeen: 'Today 14:10', incidents: ['INC-2026-0041'] },
        { id: 'T1036', name: 'Masquerading', alerts: 2, lastSeen: 'Yesterday', incidents: [] },
    ],
    'Credential Access': [
        { id: 'T1003', name: 'OS Credential Dumping', alerts: 4, lastSeen: 'Today 14:11', incidents: ['INC-2026-0041'] },
        { id: 'T1110', name: 'Brute Force', alerts: 8, lastSeen: 'Today 12:30', incidents: ['INC-2026-0039'] },
        { id: 'T1555', name: 'Credentials from Password Stores', alerts: 1, lastSeen: '2 days ago', incidents: [] },
        { id: 'T1539', name: 'Steal Web Session Cookie', alerts: 0, lastSeen: '—', incidents: [] },
    ],
    'Discovery': [
        { id: 'T1046', name: 'Network Service Discovery', alerts: 2, lastSeen: 'Today 08:45', incidents: ['INC-2026-0033'] },
        { id: 'T1082', name: 'System Info Discovery', alerts: 3, lastSeen: 'Today 14:10', incidents: [] },
        { id: 'T1069', name: 'Permission Groups Discovery', alerts: 1, lastSeen: 'Yesterday', incidents: [] },
        { id: 'T1033', name: 'System Owner/User Discovery', alerts: 0, lastSeen: '—', incidents: [] },
    ],
    'Lateral Movement': [
        { id: 'T1021', name: 'Remote Services', alerts: 1, lastSeen: 'Today 14:11', incidents: ['INC-2026-0038'] },
        { id: 'T1550', name: 'Use Alternate Auth Material', alerts: 5, lastSeen: 'Today 13:10', incidents: ['INC-2026-0038'] },
        { id: 'T1534', name: 'Internal Spearphishing', alerts: 0, lastSeen: '—', incidents: [] },
        { id: 'T1563', name: 'Remote Service Session Hijacking', alerts: 0, lastSeen: '—', incidents: [] },
    ],
    'Collection': [
        { id: 'T1005', name: 'Data from Local System', alerts: 2, lastSeen: 'Today 14:11', incidents: [] },
        { id: 'T1074', name: 'Data Staged', alerts: 3, lastSeen: 'Yesterday', incidents: [] },
        { id: 'T1213', name: 'Data from Info Repositories', alerts: 1, lastSeen: '2 days ago', incidents: [] },
        { id: 'T1056', name: 'Input Capture', alerts: 0, lastSeen: '—', incidents: [] },
    ],
    'Command & Control': [
        { id: 'T1071', name: 'Application Layer Protocol', alerts: 3, lastSeen: 'Today 14:22', incidents: [] },
        { id: 'T1095', name: 'Non-Application Layer Protocol', alerts: 1, lastSeen: 'Yesterday', incidents: [] },
        { id: 'T1568', name: 'Dynamic Resolution', alerts: 2, lastSeen: 'Today 06:50', incidents: ['INC-2026-0031'] },
        { id: 'T1572', name: 'Protocol Tunneling', alerts: 0, lastSeen: '—', incidents: [] },
    ],
    'Exfiltration': [
        { id: 'T1041', name: 'Exfiltration Over C2', alerts: 3, lastSeen: 'Today 11:00', incidents: ['INC-2026-0037'] },
        { id: 'T1048', name: 'Exfiltration Over Alt Protocol', alerts: 1, lastSeen: 'Yesterday', incidents: [] },
        { id: 'T1567', name: 'Exfiltration to Cloud Storage', alerts: 0, lastSeen: '—', incidents: [] },
        { id: 'T1020', name: 'Automated Exfiltration', alerts: 0, lastSeen: '—', incidents: [] },
    ],
    'Impact': [
        { id: 'T1486', name: 'Data Encrypted for Impact', alerts: 11, lastSeen: 'Today 14:11', incidents: ['INC-2026-0041'] },
        { id: 'T1490', name: 'Inhibit System Recovery', alerts: 2, lastSeen: 'Today 14:11', incidents: [] },
        { id: 'T1485', name: 'Data Destruction', alerts: 0, lastSeen: '—', incidents: [] },
        { id: 'T1499', name: 'Endpoint Denial of Service', alerts: 4, lastSeen: 'Today 03:00', incidents: [] },
    ],
};

const cellColor = (alerts: number) => {
    if (alerts === 0) return 'bg-card-muted text-foreground-muted hover:bg-card-muted';
    if (alerts >= 10) return 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/10';
    if (alerts >= 3) return 'bg-amber/10 text-amber border border-amber/30 hover:bg-amber/10';
    return 'bg-amber/10 text-amber border border-amber/30 hover:bg-amber/10';
};

interface Tech { id: string; name: string; alerts: number; lastSeen: string; incidents: string[] }

export default function MitrePage() {
    const [selected, setSelected] = useState<Tech | null>(null);

    return (
        <PageLayout title="MITRE ATT&CK">
            <div className="space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">MITRE ATT&CK Matrix</h1>
                        <p className="text-xs text-foreground-muted">Security Operations · 23 techniques detected this week across 8 tactics</p>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-xs font-bold text-foreground-muted hover:text-foreground hover:border-border transition-colors">
                        📄 Export PDF
                    </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4">
                    {[['#f3f4f6', 'Not Detected', 'text-foreground-muted'], ['#78350f', 'Low (1-2)', 'text-amber'], ['#c2410c', 'Medium (3-9)', 'text-amber'], ['#991b1b', 'High (10+)', 'text-red-500']].map(([c, l, tc]) => (
                        <div key={l} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
                            <span className={`text-[10px] text-foreground-muted ${tc}`}>{l}</span>
                        </div>
                    ))}
                </div>

                {/* Matrix */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="overflow-x-auto p-3">
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${TACTICS.length}, minmax(100px, 1fr))` }}>
                            {/* Headers */}
                            {TACTICS.map(t => (
                                <div key={t} className="px-2 py-1.5 bg-green/10 border border-green/30 rounded text-center">
                                    <p className="text-[9px] font-black text-green leading-tight">{t}</p>
                                </div>
                            ))}
                            {/* Cells */}
                            {[0, 1, 2, 3].map(row => (
                                TACTICS.map(tactic => {
                                    const tech = TECHNIQUES[tactic]?.[row];
                                    if (!tech) return <div key={`${tactic}-${row}`} className="h-12 rounded bg-card-muted" />;
                                    return (
                                        <button key={tech.id} onClick={() => setSelected(selected?.id === tech.id ? null : tech)}
                                            className={`p-1.5 rounded text-left transition-all ${cellColor(tech.alerts)} ${selected?.id === tech.id ? 'ring-2 ring-green' : ''}`}>
                                            <p className="text-[8px] font-mono text-foreground-muted">{tech.id}</p>
                                            <p className="text-[9px] font-bold leading-tight mt-0.5">{tech.name}</p>
                                            {tech.alerts > 0 && <p className="text-[8px] mt-0.5 opacity-80">{tech.alerts} alerts</p>}
                                        </button>
                                    );
                                })
                            ))}
                        </div>
                    </div>
                </div>

                {/* Side panel */}
                {selected && (
                    <div className="bg-card border border-green/30 rounded-xl overflow-hidden">
                        <div className="h-[3px] bg-green from-green via-green to-red-500" />
                        <div className="p-4 grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Technique</p>
                                <p className="font-mono text-green font-bold text-sm">{selected.id}</p>
                                <p className="text-sm font-bold text-foreground mt-1">{selected.name}</p>
                                <div className="mt-3 space-y-1">
                                    <div className="flex gap-2 text-xs"><span className="text-foreground-muted">Alerts this week:</span><span className="font-bold text-foreground">{selected.alerts}</span></div>
                                    <div className="flex gap-2 text-xs"><span className="text-foreground-muted">Last triggered:</span><span className="font-bold text-foreground">{selected.lastSeen}</span></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Linked Incidents</p>
                                {selected.incidents.length ? selected.incidents.map(inc => (
                                    <div key={inc} className="text-xs text-green hover:underline cursor-pointer">{inc}</div>
                                )) : <p className="text-xs text-foreground-muted">None this week</p>}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Suggested Response</p>
                                <ul className="space-y-1 text-xs text-foreground">
                                    <li>• Review detection rules for {selected.id}</li>
                                    <li>• Cross-reference with Cybernovr Intelligence threat feeds</li>
                                    <li>• Check affected assets for lateral movement</li>
                                    <li>• Update SOAR playbook if applicable</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
