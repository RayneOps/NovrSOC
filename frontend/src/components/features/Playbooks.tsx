'use client';

import { useState } from 'react';
import { ArrowLeft, Play, Plus, X, Clock, Repeat, Tag, AlertTriangle } from 'lucide-react';
import { apiUrl, apiFetch } from '@/lib/api';

// Playbook definitions themselves are still hand-authored mock data (there's no backend
// concept of a "playbook" to fetch from). "Start Playbook" is wired for real, though — it
// POSTs to routes/incidentResponse.ts's POST / and creates an actual incident with the
// playbook's steps pre-filled as its containment checklist.

export interface PlaybookStep {
    order: number;
    title: string;
    phase: string;
    est_mins: number;
    description: string;
}
export interface Playbook {
    id: string;
    name: string;
    severity: 'critical' | 'high' | 'medium';
    description: string;
    steps_count: number;
    avg_duration: string;
    last_used: string | null;
    use_count: number;
    tags: string[];
    steps?: PlaybookStep[];
}

// Exported so IncidentResponse.tsx's "Attach Playbook" picker (in the incident slide-over) can
// reuse the same library instead of maintaining a second copy.
export const PLAYBOOKS: Playbook[] = [
    {
        id: 'pb_001', name: 'Ransomware Response', severity: 'critical', description: 'Step-by-step containment and recovery for ransomware attacks',
        steps_count: 12, avg_duration: '4-8 hours', last_used: '2026-08-12', use_count: 3, tags: ['ransomware', 'malware', 'encryption'],
        steps: [
            { order: 1, title: 'Isolate affected systems', phase: 'Containment', est_mins: 15, description: 'Immediately disconnect affected machines from the network. Do not power off.' },
            { order: 2, title: 'Identify ransomware family', phase: 'Analysis', est_mins: 20, description: 'Submit ransom note and sample file to ID Ransomware (nomoreransom.org).' },
            { order: 3, title: 'Assess backup integrity', phase: 'Analysis', est_mins: 30, description: 'Check NovrSOC Data Loss Recovery for most recent clean backup.' },
            { order: 4, title: 'Notify stakeholders', phase: 'Communication', est_mins: 15, description: 'Notify CISO, IT Director, Legal. If data breach: notify NITDA within 72 hours per NDPR.' },
            { order: 5, title: 'Block C2 IPs at firewall', phase: 'Containment', est_mins: 10, description: 'Add C2 IP addresses to OPNsense blocklist via NovrSOC.' },
            { order: 6, title: 'Preserve forensic evidence', phase: 'Evidence', est_mins: 45, description: 'Capture memory dump, disk image of affected system before any remediation.' },
            { order: 7, title: 'Search for lateral movement', phase: 'Analysis', est_mins: 60, description: 'Review Wazuh alerts for other affected hosts. Check Threat Management for related alerts.' },
            { order: 8, title: 'Restore from clean backup', phase: 'Recovery', est_mins: 180, description: 'Use most recent pre-infection backup. Verify hash before restoring.' },
            { order: 9, title: 'Patch exploited vulnerability', phase: 'Hardening', est_mins: 60, description: 'Identify and patch the initial access vector before reconnecting to network.' },
            { order: 10, title: 'Reset all credentials', phase: 'Hardening', est_mins: 30, description: 'Reset passwords for all accounts on affected systems and any shared credentials.' },
            { order: 11, title: 'Reconnect systems', phase: 'Recovery', est_mins: 30, description: 'Reconnect systems to network. Monitor Wazuh for 24 hours for reinfection.' },
            { order: 12, title: 'Post-incident report', phase: 'Closure', est_mins: 90, description: 'Document timeline, root cause, impact, and lessons learned.' },
        ],
    },
    {
        id: 'pb_002', name: 'Phishing Email Response', severity: 'high', description: 'Response procedure for phishing emails targeting employees',
        steps_count: 8, avg_duration: '1-2 hours', last_used: null, use_count: 0, tags: ['phishing', 'email', 'social-engineering'],
        steps: [
            { order: 1, title: 'Quarantine the phishing email', phase: 'Containment', est_mins: 10, description: 'Remove email from all mailboxes. Use Exchange/Google Workspace admin tools.' },
            { order: 2, title: 'Identify recipients', phase: 'Analysis', est_mins: 15, description: 'Find all employees who received the phishing email.' },
            { order: 3, title: 'Check for clicks and credential entry', phase: 'Analysis', est_mins: 20, description: 'Query email gateway logs. Check PHISHID events in NovrSOC.' },
            { order: 4, title: 'Block phishing domain/URL', phase: 'Containment', est_mins: 10, description: 'Add domain to OPNsense blocklist and NovrSOC URL blacklist.' },
            { order: 5, title: 'Reset credentials if clicked', phase: 'Remediation', est_mins: 20, description: 'Force password reset for any employee who entered credentials.' },
            { order: 6, title: 'Enable MFA if not active', phase: 'Hardening', est_mins: 30, description: 'Enable multi-factor authentication on all affected accounts immediately.' },
            { order: 7, title: 'Notify all employees', phase: 'Communication', est_mins: 15, description: 'Send security awareness notification about the phishing campaign.' },
            { order: 8, title: 'Document and close', phase: 'Closure', est_mins: 30, description: 'Document IOCs, affected users, actions taken.' },
        ],
    },
    {
        id: 'pb_003', name: 'Business Email Compromise (BEC)', severity: 'critical', description: 'Response for CEO fraud, invoice fraud, and wire transfer scams',
        steps_count: 10, avg_duration: '2-4 hours', last_used: null, use_count: 0, tags: ['bec', 'fraud', 'email', 'financial'],
        steps: [
            { order: 1, title: 'Stop any pending transactions', phase: 'URGENT', est_mins: 5, description: 'Immediately contact finance to stop any wire transfers or payments initiated via email.' },
            { order: 2, title: 'Contact receiving bank', phase: 'URGENT', est_mins: 15, description: 'If transfer already sent: contact your bank and the receiving bank immediately to recall funds.' },
            { order: 3, title: 'Preserve email evidence', phase: 'Evidence', est_mins: 15, description: 'Export original email with full headers before any deletion.' },
            { order: 4, title: 'Analyse the spoofed domain', phase: 'Analysis', est_mins: 20, description: 'Run domain in CTI Platform. Check registration date, IP, WHOIS.' },
            { order: 5, title: 'Identify the compromised account', phase: 'Analysis', est_mins: 30, description: 'Determine if attacker used a spoofed domain or a genuinely compromised account.' },
            { order: 6, title: 'Secure the compromised account', phase: 'Containment', est_mins: 20, description: 'Reset password, revoke all active sessions, enable MFA.' },
            { order: 7, title: 'Review email rules and forwarding', phase: 'Containment', est_mins: 15, description: 'Attackers often add forwarding rules. Remove any unauthorized rules.' },
            { order: 8, title: 'Report to EFCC/Police', phase: 'Legal', est_mins: 60, description: 'File report with EFCC Economic and Financial Crimes Commission. Preserve all evidence.' },
            { order: 9, title: 'Notify clients and partners', phase: 'Communication', est_mins: 30, description: 'If attacker impersonated you to target others, notify them immediately.' },
            { order: 10, title: 'Implement email controls', phase: 'Hardening', est_mins: 60, description: 'Enforce DMARC at p=reject, implement email gateway rules to flag external emails.' },
        ],
    },
    { id: 'pb_004', name: 'Unauthorized Access / Account Compromise', severity: 'high', description: 'Response for unauthorized login, credential theft, insider threat', steps_count: 9, avg_duration: '2-3 hours', last_used: null, use_count: 0, tags: ['access', 'credentials', 'insider'] },
    { id: 'pb_005', name: 'DDoS Attack Response', severity: 'high', description: 'Response procedure for volumetric and application-layer DDoS attacks', steps_count: 7, avg_duration: '1-3 hours', last_used: null, use_count: 0, tags: ['ddos', 'network', 'availability'] },
    { id: 'pb_006', name: 'Data Breach / Exfiltration', severity: 'critical', description: 'Response for confirmed or suspected data exfiltration. NDPR notification required.', steps_count: 14, avg_duration: '4-12 hours', last_used: null, use_count: 0, tags: ['data-breach', 'exfiltration', 'ndpr', 'compliance'] },
];

const SEVERITY_BADGE: Record<Playbook['severity'], string> = {
    critical: 'bg-red/10 text-red border-red/30',
    high: 'bg-amber/10 text-amber border-amber/30',
    medium: 'bg-blue/10 text-blue border-blue/30',
};
const PHASE_COLOR: Record<string, string> = {
    URGENT: 'bg-red text-white', Containment: 'bg-red/10 text-red border border-red/30',
    Analysis: 'bg-blue/10 text-blue border border-blue/30', Evidence: 'bg-blue/10 text-blue border border-blue/30',
    Communication: 'bg-purple/10 text-purple border border-purple/30', Remediation: 'bg-amber/10 text-amber border border-amber/30',
    Hardening: 'bg-green/10 text-green border border-green/30', Recovery: 'bg-green/10 text-green border border-green/30',
    Legal: 'bg-purple/10 text-purple border border-purple/30', Closure: 'bg-card-muted text-foreground-muted border border-border',
};

export function Playbooks() {
    const [selected, setSelected] = useState<Playbook | null>(null);
    const [startModal, setStartModal] = useState<Playbook | null>(null);
    const [form, setForm] = useState({ title: '', host: '', severity: 'high' });

    if (selected) {
        return (
            <div className="space-y-4">
                <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs font-bold text-blue hover:text-purple transition-colors">
                    <ArrowLeft size={14} /> Back to Playbooks
                </button>
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${SEVERITY_BADGE[selected.severity]}`}>{selected.severity}</span>
                                <h1 className="text-lg font-black text-foreground">{selected.name}</h1>
                            </div>
                            <p className="text-xs text-foreground-muted">{selected.description}</p>
                            <p className="text-[10px] text-foreground-muted mt-2 flex items-center gap-3">
                                <span className="flex items-center gap-1"><Clock size={11} /> {selected.avg_duration}</span>
                                <span className="flex items-center gap-1"><Repeat size={11} /> Used {selected.use_count}×</span>
                            </p>
                        </div>
                        <button onClick={() => setStartModal(selected)} className="flex items-center gap-2 bg-orange hover:bg-orange-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0">
                            <Play size={14} /> Start Playbook
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {(selected.steps ?? []).map((s) => (
                        <div key={s.order} className="bg-card border border-border rounded-xl p-4 flex gap-3">
                            <span className="w-6 h-6 rounded-full bg-card-muted text-foreground text-[11px] font-black flex items-center justify-center flex-shrink-0">{s.order}</span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-sm font-bold text-foreground">{s.title}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PHASE_COLOR[s.phase] ?? 'bg-card-muted text-foreground-muted'}`}>{s.phase}</span>
                                    <span className="text-[10px] text-foreground-muted ml-auto flex items-center gap-1"><Clock size={10} /> ~{s.est_mins}m</span>
                                </div>
                                <p className="text-xs text-foreground-muted">{s.description}</p>
                            </div>
                        </div>
                    ))}
                    {!selected.steps && (
                        <div className="bg-card border border-dashed border-grey-300 rounded-xl p-6 text-center text-xs text-foreground-muted">
                            Full step detail for this playbook hasn&apos;t been authored yet — {selected.steps_count} steps planned.
                        </div>
                    )}
                </div>

                {startModal && (
                    <StartModal playbook={startModal} form={form} setForm={setForm} onClose={() => setStartModal(null)} />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-lg font-black text-foreground">Response Playbooks</h1>
                    <p className="text-xs text-foreground-muted">SecOps & Response · Pre-built incident response procedures per attack type.</p>
                </div>
                <button className="flex items-center gap-2 bg-orange hover:bg-orange-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0">
                    <Plus size={14} /> Create Playbook
                </button>
            </div>

            <div className="bg-blue/5 border border-blue/20 rounded-xl p-4 text-xs text-foreground-muted leading-relaxed">
                A playbook is a structured, step-by-step response procedure for a specific type of security incident.
                When an incident occurs, the analyst attaches the relevant playbook to ensure no critical response step
                is missed under pressure.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLAYBOOKS.map((pb) => (
                    <div key={pb.id} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${SEVERITY_BADGE[pb.severity]}`}>{pb.severity}</span>
                            <span className="text-[10px] text-foreground-muted flex-shrink-0">{pb.steps_count} steps</span>
                        </div>
                        <p className="text-sm font-bold text-foreground mb-1">{pb.name}</p>
                        <p className="text-xs text-foreground-muted mb-3">{pb.description}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                            {pb.tags.map((t) => (
                                <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 bg-card-muted text-foreground-muted rounded-full flex items-center gap-1"><Tag size={8} />{t}</span>
                            ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-foreground-muted mb-3">
                            <span className="flex items-center gap-1"><Clock size={11} /> {pb.avg_duration}</span>
                            <span>{pb.last_used ? `Last used ${pb.last_used}` : 'Never used'}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setSelected(pb)} className="flex-1 text-[10px] font-bold px-3 py-1.5 bg-blue hover:opacity-90 text-white rounded-lg transition-colors">View Playbook</button>
                            <button onClick={() => setStartModal(pb)} className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 border border-orange text-orange rounded-lg hover:bg-orange/5 transition-colors"><Play size={10} /> Start</button>
                        </div>
                    </div>
                ))}
            </div>

            {startModal && (
                <StartModal playbook={startModal} form={form} setForm={setForm} onClose={() => setStartModal(null)} />
            )}
        </div>
    );
}

function StartModal({ playbook, form, setForm, onClose }: {
    playbook: Playbook;
    form: { title: string; host: string; severity: string };
    setForm: (fn: (f: { title: string; host: string; severity: string }) => { title: string; host: string; severity: string }) => void;
    onClose: () => void;
}) {
    const [status, setStatus] = useState<'idle' | 'creating' | 'created' | 'failed'>('idle');
    const [createdId, setCreatedId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    // Placeholder text only (never submitted as-is) — a fixed suffix avoids calling
    // new Date() during render, which react-hooks/purity disallows.
    const title = form.title || `${playbook.name} — today`;

    const createIncident = async () => {
        setStatus('creating');
        setErrorMsg(null);
        try {
            const res = await apiFetch(apiUrl('/api/incidents'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title || title,
                    description: `Incident response initiated using the ${playbook.name} playbook.`,
                    severity: form.severity || playbook.severity,
                    affected_host: form.host,
                    source: 'playbook',
                    playbook_id: playbook.id,
                    containment: (playbook.steps ?? []).map((step) => ({
                        action: step.title,
                        phase: step.phase,
                        description: step.description,
                        est_mins: step.est_mins,
                        status: 'pending',
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);
            setCreatedId(data.incident_number ?? data.id ?? null);
            setStatus('created');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Failed to create incident');
            setStatus('failed');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-semibold text-sm text-foreground">Create incident from this playbook</h3>
                    <button onClick={onClose} className="text-foreground-muted hover:text-foreground"><X size={16} /></button>
                </div>
                {status === 'created' ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-green font-bold mb-1">Incident {createdId} created</p>
                        <p className="text-xs text-foreground-muted">All {(playbook.steps ?? []).length || playbook.steps_count} steps were added as a containment checklist in Incident Response.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Incident Title</label>
                            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={title}
                                className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue text-foreground" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Affected Host</label>
                            <input value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} placeholder="e.g. ec2-app-server"
                                className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue text-foreground" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Severity</label>
                            <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                                className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none text-foreground">
                                {['critical', 'high', 'medium', 'low'].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                        </div>
                        {status === 'failed' && errorMsg && (
                            <div className="flex items-center gap-2 text-xs text-red bg-red/10 border border-red/30 rounded-lg px-3 py-2">
                                <AlertTriangle size={14} /> {errorMsg}
                            </div>
                        )}
                        <button onClick={createIncident} disabled={status === 'creating'}
                            className="w-full bg-orange hover:bg-orange-hover text-white text-sm font-bold py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                            {status === 'creating' ? 'Creating…' : 'Create Incident'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
