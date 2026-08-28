'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';

// Real data from GET /api/wazuh/mitre-stats — aggregates rule.mitre.tactic over the last 24h.
// The technique lists under each tactic below are reference/navigational only (MITRE's public
// taxonomy, not derived from data) — Wazuh's aggregation only gives tactic-level counts, not a
// per-technique breakdown, so technique cells can't honestly show a real count without a
// second, technique-level aggregation this endpoint doesn't do yet.

const MITRE_MATRIX: Record<string, string[]> = {
    'Initial Access': ['Phishing', 'Valid Accounts', 'External Remote Services', 'Drive-by Compromise'],
    'Execution': ['Command and Scripting Interpreter', 'User Execution', 'Scheduled Task/Job', 'Native API'],
    'Persistence': ['Boot or Logon Autostart', 'Create Account', 'Scheduled Task/Job', 'Server Software Component'],
    'Privilege Escalation': ['Valid Accounts', 'Abuse Elevation Control', 'Exploitation for Privilege Escalation', 'Access Token Manipulation'],
    'Defense Evasion': ['Obfuscated Files or Information', 'Indicator Removal', 'Masquerading', 'Impair Defenses'],
    'Credential Access': ['Brute Force', 'OS Credential Dumping', 'Input Capture', 'Credentials from Password Stores'],
    'Discovery': ['Network Service Discovery', 'System Information Discovery', 'Account Discovery', 'File and Directory Discovery'],
    'Lateral Movement': ['Remote Services', 'Lateral Tool Transfer', 'Internal Spearphishing'],
    'Collection': ['Data Staged', 'Email Collection', 'Screen Capture'],
    'Exfiltration': ['Exfiltration Over C2 Channel', 'Automated Exfiltration', 'Scheduled Transfer'],
    'Command and Control': ['Application Layer Protocol', 'DNS', 'Encrypted Channel', 'Proxy'],
    'Impact': ['Data Encrypted for Impact', 'Data Destruction', 'Service Stop'],
};

function levelColor(count: number): string {
    if (count === 0) return 'bg-card-muted';
    if (count <= 5) return 'bg-orange/30';
    if (count <= 20) return 'bg-orange';
    return 'bg-red';
}

export function MitreDashboard() {
    const [tactics, setTactics] = useState<Record<string, number> | null>(null);
    const [source, setSource] = useState<string | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/wazuh/mitre-stats'), { cache: 'no-store', signal: AbortSignal.timeout(10000) })
            .then((r) => r.json())
            .then((data) => { setTactics(data?.tactics ?? {}); setSource(data?.source ?? 'unavailable'); })
            .catch(() => { setTactics({}); setSource('unavailable'); });
    }, []);

    const loading = tactics === null;
    const totalHits = tactics ? Object.values(tactics).reduce((s, n) => s + n, 0) : 0;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">MITRE ATT&amp;CK Dashboard</h1>
                <p className="text-xs text-foreground-muted">Tactics observed across live Wazuh alerts, last 24 hours.</p>
            </div>

            {!loading && (
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 text-xs">
                    <span className="font-bold text-foreground">{totalHits} MITRE-mapped alerts (24h)</span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${source === 'wazuh' ? 'bg-green/10 text-green' : source === 'demo' ? 'bg-purple/10 text-purple' : 'bg-card-muted text-foreground-muted'}`}>
                        {source === 'wazuh' ? 'Live' : source === 'demo' ? 'Demo' : 'No data'}
                    </span>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-32 bg-card-muted rounded-xl animate-pulse" />)}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(MITRE_MATRIX).map(([tactic, techniques]) => {
                        const count = tactics![tactic] ?? 0;
                        return (
                            <div key={tactic} className={`bg-card border border-border rounded-xl overflow-hidden`}>
                                <div className={`px-4 py-2.5 flex items-center justify-between ${levelColor(count)} ${count > 5 ? 'text-white' : 'text-foreground'}`}>
                                    <span className="text-xs font-bold">{tactic}</span>
                                    <span className="text-sm font-black">{count}</span>
                                </div>
                                <div className="p-3 space-y-1">
                                    {techniques.map((t) => (
                                        <div key={t} className="text-[11px] text-foreground-muted truncate">{t}</div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
