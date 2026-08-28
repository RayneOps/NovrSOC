'use client';

import { ExternalLink } from 'lucide-react';

// SOAR (Shuffle) isn't wired up yet — no Shuffle API integration exists in this backend, and
// VPS 6 infrastructure is explicitly out of scope to touch here. The two prompts that
// mentioned a TheHive/Shuffle address this session gave two different IPs for the same
// service, so rather than hardcode either unverified address, both links below read from env
// vars and show an honest "not configured" state if unset — set NEXT_PUBLIC_SHUFFLE_URL /
// NEXT_PUBLIC_THEHIVE_URL once VPS 6 is confirmed reachable.

const SHUFFLE_URL = process.env.NEXT_PUBLIC_SHUFFLE_URL;
const THEHIVE_URL = process.env.NEXT_PUBLIC_THEHIVE_URL;

export function SOARAutomation() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">SOAR Automation</h1>
                <p className="text-xs text-foreground-muted">Shuffle workflow status and execution history.</p>
            </div>

            <div className={`rounded-xl p-4 flex items-center gap-3 border ${SHUFFLE_URL ? 'bg-green/10 border-green/30' : 'bg-card-muted border-border'}`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${SHUFFLE_URL ? 'bg-green animate-pulse' : 'bg-grey-300'}`} />
                <div>
                    <div className={`font-bold text-sm ${SHUFFLE_URL ? 'text-green' : 'text-foreground-muted'}`}>{SHUFFLE_URL ? 'Shuffle SOAR configured' : 'Shuffle SOAR not configured'}</div>
                    <div className="text-xs text-foreground-muted">{SHUFFLE_URL ? 'Wazuh Critical Alert Response workflow' : 'Set NEXT_PUBLIC_SHUFFLE_URL to connect'}</div>
                </div>
                {SHUFFLE_URL && (
                    <a href={SHUFFLE_URL} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1.5 text-xs bg-green text-white px-3 py-1.5 rounded-lg font-bold hover:opacity-90 transition-opacity flex-shrink-0">
                        Open Shuffle <ExternalLink size={12} />
                    </a>
                )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-bold text-sm text-foreground mb-4">Active Workflows</h2>
                {[{ name: 'Wazuh Critical Alert Response', trigger: 'Wazuh webhook (level 9+)', action: 'Create TheHive case', status: SHUFFLE_URL ? 'active' : 'not configured', executions: 0 }].map((wf) => (
                    <div key={wf.name} className="flex items-center justify-between p-4 bg-card-muted rounded-xl border border-border flex-wrap gap-2">
                        <div>
                            <div className="font-semibold text-sm text-foreground">{wf.name}</div>
                            <div className="text-xs text-foreground-muted mt-1">Trigger: {wf.trigger} → Action: {wf.action}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${wf.status === 'active' ? 'text-green bg-green/10 border-green/30' : 'text-foreground-muted bg-card-muted border-border'}`}>
                                {wf.status === 'active' ? 'Active' : 'Not Configured'}
                            </span>
                            <span className="text-xs text-foreground-muted">{wf.executions} executions</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Playbooks Available', value: 6, color: 'text-purple' },
                    { label: 'Cases Auto-Created', value: 0, color: 'text-blue' },
                    { label: 'Automation Rate', value: '0%', color: 'text-green' },
                    { label: 'Avg Response Time', value: '—', color: 'text-orange' },
                ].map((s) => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-5">
                        <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-foreground-muted mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="bg-purple/5 border border-purple/20 rounded-xl p-5">
                <h2 className="font-bold text-sm text-purple mb-2">Case Management — TheHive</h2>
                <p className="text-xs text-foreground-muted mb-4">
                    Security incidents are managed in TheHive once VPS 6&apos;s SOAR stack is deployed. See{' '}
                    <span className="font-mono">backend/src/services/thehive.ts</span> — Basic Auth client is built, not yet wired into the incident store.
                </p>
                {THEHIVE_URL ? (
                    <a href={THEHIVE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-purple text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-purple-hover transition-colors">
                        Open TheHive Case Manager <ExternalLink size={12} />
                    </a>
                ) : (
                    <p className="text-[10px] text-foreground-muted">Set NEXT_PUBLIC_THEHIVE_URL once VPS 6 is confirmed reachable.</p>
                )}
            </div>
        </div>
    );
}
