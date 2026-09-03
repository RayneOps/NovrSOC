'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { apiUrl, apiFetch } from '@/lib/api';

interface SoarLogEntry {
    time: string;
    action: string;
    reason: string;
}
interface AutomationStatus {
    active: boolean;
    cases_created_today: number;
    auto_resolved_today: number;
    avg_response_minutes: number | null;
    recent_log?: SoarLogEntry[];
}

export function SOARAutomation() {
    const [status, setStatus] = useState<AutomationStatus | null>(null);

    useEffect(() => {
        apiFetch(apiUrl('/api/incidents/automation-status'), { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => setStatus(data))
            .catch(() => setStatus({ active: false, cases_created_today: 0, auto_resolved_today: 0, avg_response_minutes: null }));
    }, []);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">SOAR Automation</h1>
                <p className="text-xs text-foreground-muted">Automated case creation, status sync, and auto-resolution pipeline status.</p>
            </div>

            <div className={`rounded-xl p-4 flex items-center gap-3 border ${status?.active ? 'bg-green/10 border-green/30' : 'bg-red/10 border-red/30'}`}>
                {status?.active ? <CheckCircle2 size={20} className="text-green flex-shrink-0" /> : <XCircle size={20} className="text-red flex-shrink-0" />}
                <div>
                    <div className={`font-bold text-sm ${status?.active ? 'text-green' : 'text-red'}`}>
                        Automation pipeline: {status === null ? 'Checking…' : status.active ? 'Active' : 'Inactive'}
                    </div>
                    <div className="text-xs text-foreground-muted">
                        Wazuh-triggered case creation, status sync, and the 30-minute auto-resolve job for low/medium severity cases.
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Cases Created Today', value: status?.cases_created_today ?? '—' },
                    { label: 'Auto-Resolved Today', value: status?.auto_resolved_today ?? '—' },
                    { label: 'Average Response Time', value: status?.avg_response_minutes != null ? `${status.avg_response_minutes}m` : '—' },
                ].map((s) => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-5">
                        <div className="text-3xl font-black text-foreground">{s.value}</div>
                        <div className="text-xs text-foreground-muted mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-bold text-sm text-foreground mb-4">Recent SOAR Activity</h2>
                {!status?.recent_log || status.recent_log.length === 0 ? (
                    <p className="text-xs text-foreground-muted">No SOAR activity yet today.</p>
                ) : (
                    <div className="space-y-1.5">
                        {status.recent_log.map((entry, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-border last:border-0">
                                <span className="font-mono text-foreground-muted w-12 shrink-0">{entry.time}</span>
                                <span className="font-bold text-foreground shrink-0">{entry.action}</span>
                                <span className="text-foreground-muted truncate">{entry.reason}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-bold text-sm text-foreground mb-4">Active Workflows</h2>
                {[{ name: 'Wazuh Critical Alert Response', trigger: 'Wazuh webhook (level 9+)', action: 'Create case', status: 'configured', executions: 0 }].map((wf) => (
                    <div key={wf.name} className="flex items-center justify-between p-4 bg-card-muted rounded-xl border border-border flex-wrap gap-2">
                        <div>
                            <div className="font-semibold text-sm text-foreground">{wf.name}</div>
                            <div className="text-xs text-foreground-muted mt-1">Trigger: {wf.trigger} → Action: {wf.action}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold px-2 py-1 rounded-full border text-blue bg-blue/10 border-blue/30">
                                Configured
                            </span>
                            <span className="text-xs text-foreground-muted">{wf.executions} executions</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
