'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';

const FIELDS = ['process.name', 'source.ip', 'destination.ip', 'file.hash', 'user.name', 'destination.port', 'command_line', 'dns.query'];
const OPS = ['=', 'CONTAINS', '!=', 'STARTS WITH', 'ENDS WITH', 'REGEX'];
const TEMPLATES = [
    { name: 'Suspicious PowerShell Executions', desc: 'Detect encoded or obfuscated PowerShell commands' },
    { name: 'Lateral Movement via SMB', desc: 'Hunt for unusual SMB connections between hosts' },
    { name: 'DNS Tunneling Activity', desc: 'Identify long/frequent DNS queries indicating tunneling' },
    { name: 'Credential Dumping Attempts', desc: 'Detect LSASS access and memory scraping patterns' },
    { name: 'Ransomware File Extensions', desc: 'Monitor for known ransomware file extension changes' },
];

const MOCK_RESULTS = [
    { ts: '14:22:01', source: 'EDR-Agent', asset: 'WORKSTATION-042', field: 'process.name', value: 'powershell.exe -enc JAB...', severity: 'Critical' },
    { ts: '14:18:30', source: 'Wazuh', asset: 'PROD-SERVER-03', field: 'command_line', value: 'cmd.exe /c whoami && net user', severity: 'High' },
    { ts: '14:15:10', source: 'SIEM', asset: 'DOMAIN-CTRL-01', field: 'user.name', value: 'SYSTEM -> svc_admin', severity: 'High' },
    { ts: '13:55:00', source: 'Network', asset: 'WORKSTATION-017', field: 'destination.ip', value: '185.220.101.47 (TOR)', severity: 'Critical' },
    { ts: '13:40:22', source: 'DNS-Monitor', asset: 'WORKSTATION-031', field: 'dns.query', value: 'xn--secure-ng-login-j8b.com', severity: 'High' },
];

const HUNT_HISTORY = [
    { name: 'Credential Dumping Attempts', analyst: 'Amaka Obi', time: '28 Jun 14:00', results: 5 },
    { name: 'Suspicious PowerShell', analyst: 'Tunde Adeyemi', time: '27 Jun 10:30', results: 12 },
    { name: 'DNS Tunneling', analyst: 'Chidi Nwosu', time: '26 Jun 09:15', results: 3 },
    { name: 'Lateral Movement SMB', analyst: 'Fatima Bello', time: '25 Jun 16:00', results: 0 },
    { name: 'Ransomware Extensions', analyst: 'Amaka Obi', time: '24 Jun 11:45', results: 2 },
];

const SEV: Record<string, string> = {
    Critical: 'text-red-500 bg-red-500/10 border-red-500/30',
    High: 'text-amber bg-amber/10 border-amber/30',
};

export default function HuntingPage() {
    const [conditions, setConditions] = useState([{ field: 'process.name', op: '=', value: 'powershell.exe' }]);
    const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
    const [results, setResults] = useState<typeof MOCK_RESULTS | null>(null);
    const [running, setRunning] = useState(false);
    const [template, setTemplate] = useState('');

    const addCondition = () => setConditions(c => [...c, { field: FIELDS[0], op: OPS[0], value: '' }]);
    const removeCondition = (i: number) => setConditions(c => c.filter((_, idx) => idx !== i));
    const updateCondition = (i: number, key: string, val: string) =>
        setConditions(c => c.map((cond, idx) => idx === i ? { ...cond, [key]: val } : cond));

    const runHunt = () => {
        setRunning(true);
        setTimeout(() => { setResults(MOCK_RESULTS); setRunning(false); }, 1200);
    };

    return (
        <PageLayout title="Threat Hunting">
            <div className="space-y-4">
                <div>
                    <h1 className="text-lg font-black text-foreground">Threat Hunting</h1>
                    <p className="text-xs text-foreground-muted">Security Operations · Proactive threat hunting across your environment</p>
                </div>

                <div className="grid grid-cols-3 gap-5">
                    {/* Query Builder */}
                    <div className="col-span-2 bg-card border border-border rounded-xl overflow-hidden">
                        <div className="h-[3px] bg-green from-green via-green to-red-500" />
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-black text-foreground">Hunt Query Builder</p>
                                <div className="flex items-center gap-3">
                                    <select value={template} onChange={e => setTemplate(e.target.value)}
                                        className="text-[10px] bg-card-muted border border-border rounded-lg px-3 py-1.5 text-foreground-muted focus:outline-none">
                                        <option value="">Load template…</option>
                                        {TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                    </select>
                                    <div className="flex bg-card-muted border border-border rounded-lg overflow-hidden">
                                        {(['AND', 'OR'] as const).map(l => (
                                            <button key={l} onClick={() => setLogic(l)}
                                                className={`px-3 py-1.5 text-[10px] font-bold transition-colors ${logic === l ? 'bg-amber text-white' : 'text-foreground-muted hover:text-foreground'}`}>{l}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {conditions.map((cond, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        {i > 0 && <span className="text-[10px] font-bold text-green w-8 flex-shrink-0">{logic}</span>}
                                        {i === 0 && <span className="text-[10px] font-bold text-foreground-muted w-8 flex-shrink-0">IF</span>}
                                        <select value={cond.field} onChange={e => updateCondition(i, 'field', e.target.value)}
                                            className="flex-1 text-[10px] bg-card-muted border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none font-mono">
                                            {FIELDS.map(f => <option key={f}>{f}</option>)}
                                        </select>
                                        <select value={cond.op} onChange={e => updateCondition(i, 'op', e.target.value)}
                                            className="w-32 text-[10px] bg-card-muted border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none">
                                            {OPS.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                        <input value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)} placeholder="Value…"
                                            className="flex-1 text-[10px] bg-card-muted border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none font-mono" />
                                        {conditions.length > 1 && (
                                            <button onClick={() => removeCondition(i)} className="text-border hover:text-red-500 transition-colors text-sm">✕</button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={addCondition} className="text-[10px] font-bold text-green border border-dashed border-green/30 px-3 py-1.5 rounded-lg hover:bg-green/10 transition-colors">+ Add Condition</button>
                                <button onClick={runHunt} disabled={running} className="px-6 py-1.5 bg-red hover:bg-red-hover disabled:opacity-60 text-white text-[10px] font-black rounded-lg transition-colors">
                                    {running ? '⏳ Running Hunt…' : '▶ Run Hunt'}
                                </button>
                            </div>

                            {/* Results */}
                            {results && (
                                <div className="mt-4 border-t border-border pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{results.length} Matches Found</p>
                                        <button onClick={() => setResults(null)} className="text-[10px] text-foreground-muted hover:text-foreground-muted">Clear</button>
                                    </div>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-border">
                                                {['Timestamp', 'Source', 'Asset', 'Field', 'Matched Value', 'Severity'].map(h => (
                                                    <th key={h} className="text-left px-2 py-1.5 text-[9px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((r, i) => (
                                                <tr key={i} className="border-b border-border hover:bg-card-muted">
                                                    <td className="px-2 py-2 font-mono text-foreground-muted text-[9px]">{r.ts}</td>
                                                    <td className="px-2 py-2 text-foreground-muted text-[9px]">{r.source}</td>
                                                    <td className="px-2 py-2 font-mono text-foreground text-[9px]">{r.asset}</td>
                                                    <td className="px-2 py-2 font-mono text-green text-[9px]">{r.field}</td>
                                                    <td className="px-2 py-2 font-mono text-foreground text-[9px] max-w-[160px] truncate">{r.value}</td>
                                                    <td className="px-2 py-2">
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${SEV[r.severity]}`}>{r.severity}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Templates + History */}
                    <div className="space-y-3">
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="h-[3px] bg-green from-green via-green to-red-500" />
                            <div className="p-4">
                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Hunt Templates</p>
                                <div className="space-y-2">
                                    {TEMPLATES.map(t => (
                                        <button key={t.name} onClick={() => setTemplate(t.name)}
                                            className="w-full text-left p-2.5 bg-card-muted rounded-lg border border-border hover:border-green/30 transition-colors group">
                                            <p className="text-[10px] font-bold text-foreground group-hover:text-green">{t.name}</p>
                                            <p className="text-[9px] text-foreground-muted mt-0.5">{t.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="h-[3px] bg-green from-green via-green to-red-500" />
                            <div className="p-4">
                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Hunt History</p>
                                <div className="space-y-2">
                                    {HUNT_HISTORY.map((h, i) => (
                                        <div key={i} className="flex items-start justify-between py-1.5 border-b border-border">
                                            <div>
                                                <p className="text-[10px] font-semibold text-foreground">{h.name}</p>
                                                <p className="text-[9px] text-foreground-muted">{h.analyst} · {h.time}</p>
                                            </div>
                                            <span className={`text-[10px] font-black ${h.results > 0 ? 'text-red-500' : 'text-green'}`}>{h.results > 0 ? `${h.results} hits` : 'Clean'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
