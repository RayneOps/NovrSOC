'use client';

import { ExternalLink } from 'lucide-react';

// SOAR (Shuffle) isn't wired up yet — no Shuffle API integration exists in this backend, and
// VPS 6 infrastructure is explicitly out of scope to touch here. 169.58.242.194 is VPS 6's
// address per the user's own VPS6_TheHive_Shuffle_Guide.md (confirmed the same IP across
// multiple mentions this session) — used as the default here, overridable via
// NEXT_PUBLIC_SHUFFLE_URL / NEXT_PUBLIC_THEHIVE_URL once actually verified reachable.

const SHUFFLE_URL = process.env.NEXT_PUBLIC_SHUFFLE_URL || 'http://169.58.242.194:3001';
const THEHIVE_URL = process.env.NEXT_PUBLIC_THEHIVE_URL || 'http://169.58.242.194:9000';

export function SOARAutomation() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">SOAR Automation</h1>
                <p className="text-xs text-foreground-muted">Shuffle workflow status and execution history.</p>
            </div>

            {/* "Configured" — a URL is known — not "connected"/verified reachable. VPS 6 isn't
                reachable from wherever this was last verified, so this can't honestly claim
                more than that. */}
            <div className="rounded-xl p-4 flex items-center gap-3 border bg-blue/10 border-blue/30">
                <div className="w-3 h-3 rounded-full flex-shrink-0 bg-blue" />
                <div>
                    <div className="font-bold text-sm text-blue">Shuffle SOAR configured</div>
                    <div className="text-xs text-foreground-muted">Wazuh Critical Alert Response workflow — reachability not verified from here</div>
                </div>
                <a href={SHUFFLE_URL} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1.5 text-xs bg-blue text-white px-3 py-1.5 rounded-lg font-bold hover:opacity-90 transition-opacity flex-shrink-0">
                    Open Shuffle <ExternalLink size={12} />
                </a>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-bold text-sm text-foreground mb-4">Active Workflows</h2>
                {[{ name: 'Wazuh Critical Alert Response', trigger: 'Wazuh webhook (level 9+)', action: 'Create TheHive case', status: 'configured', executions: 0 }].map((wf) => (
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
                <a href={THEHIVE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-purple text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-purple-hover transition-colors">
                    Open TheHive Case Manager <ExternalLink size={12} />
                </a>
            </div>
        </div>
    );
}
