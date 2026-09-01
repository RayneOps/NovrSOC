'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { apiUrl, apiFetch } from '@/lib/api';
import { MOCK_ORGS } from '@/lib/mockOrgs';

// 4-step org onboarding wizard. Step 1 pre-fills from the same MOCK_ORGS list the parent
// organisations page already uses (no real organisations table exists yet — see that page's
// own comment) rather than duplicating a second mock list here. Submits to
// POST /api/organisations/:id/setup (routes/organisations.ts), an in-memory store for now.

const FRAMEWORKS = ['NDPA', 'ISO 27001', 'CBN', 'PCI-DSS', 'NCC', 'NIST CSF'] as const;

interface FrameworkSelection { framework: string; enabled: boolean; initialScore: number }
interface Contacts { cisoName: string; cisoEmail: string; itDirectorEmail: string; onCallPhone: string }

const STEPS = ['Basic Info', 'Compliance Frameworks', 'Contacts', 'Wazuh Config'] as const;

export function OrgSetupWizard({ orgId }: { orgId: string }) {
    const org = MOCK_ORGS.find((o) => o.id === orgId);

    const [step, setStep] = useState(0);
    const [name, setName] = useState(org?.name ?? '');
    const [industry, setIndustry] = useState(org?.industry ?? '');
    const [plan, setPlan] = useState<string>(org?.plan ?? 'Professional');
    const [frameworks, setFrameworks] = useState<FrameworkSelection[]>(
        FRAMEWORKS.map((f) => ({ framework: f, enabled: false, initialScore: 0 }))
    );
    const [contacts, setContacts] = useState<Contacts>({ cisoName: '', cisoEmail: '', itDirectorEmail: '', onCallPhone: '' });
    const [wazuhGroup, setWazuhGroup] = useState('');
    const [saving, setSaving] = useState(false);
    const [complete, setComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Resume a previously-saved setup, if this wizard was already run for this org.
        apiFetch(apiUrl(`/api/organisations/${orgId}/setup`), { cache: 'no-store', signal: AbortSignal.timeout(10000) })
            .then((r) => r.json())
            .then((data) => {
                if (!data?.setup_complete) return;
                if (data.basicInfo) { setName(data.basicInfo.name); setIndustry(data.basicInfo.industry); setPlan(data.basicInfo.plan); }
                if (Array.isArray(data.frameworks) && data.frameworks.length > 0) setFrameworks(data.frameworks);
                if (data.contacts) setContacts(data.contacts);
                if (data.wazuhGroup) setWazuhGroup(data.wazuhGroup);
            })
            .catch(() => {});
    }, [orgId]);

    const toggleFramework = (framework: string) => {
        setFrameworks((prev) => prev.map((f) => (f.framework === framework ? { ...f, enabled: !f.enabled } : f)));
    };
    const setFrameworkScore = (framework: string, score: number) => {
        setFrameworks((prev) => prev.map((f) => (f.framework === framework ? { ...f, initialScore: score } : f)));
    };

    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch(apiUrl(`/api/organisations/${orgId}/setup`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    basicInfo: { name, industry, plan },
                    frameworks: frameworks.filter((f) => f.enabled),
                    contacts,
                    wazuhGroup,
                }),
            });
            const data = await res.json();
            if (!data?.success) throw new Error('Save failed');
            setComplete(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Setup could not be saved');
        } finally {
            setSaving(false);
        }
    };

    if (complete) {
        return (
            <div className="max-w-lg mx-auto text-center py-16">
                <div className="w-12 h-12 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-4">
                    <Check size={24} className="text-green" />
                </div>
                <h1 className="text-lg font-black text-foreground mb-2">Setup Complete</h1>
                <p className="text-xs text-foreground-muted mb-6">{name || orgId} is configured. Data was saved to an in-memory store — Supabase integration is next sprint, so this won&apos;t survive a backend restart yet.</p>
                <Link href="/admin/settings/organisations" className="inline-block bg-purple text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-purple-hover transition-colors">
                    Back to Organisations
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            <Link href="/admin/settings/organisations" className="flex items-center gap-1.5 text-xs font-bold text-blue hover:text-purple transition-colors">
                <ArrowLeft size={14} /> Back to Organisations
            </Link>

            <div>
                <h1 className="text-lg font-black text-foreground">Organisation Setup — {org?.name ?? orgId}</h1>
                <p className="text-xs text-foreground-muted">4-step onboarding wizard.</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2">
                {STEPS.map((label, i) => (
                    <div key={label} className="flex items-center gap-2 flex-1">
                        <button onClick={() => setStep(i)} className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 transition-colors ${i === step ? 'bg-purple text-white' : i < step ? 'bg-green/10 text-green' : 'bg-card-muted text-foreground-muted'}`}>
                            {i < step ? <Check size={12} /> : i + 1}
                        </button>
                        <span className={`text-[10px] font-bold hidden sm:inline ${i === step ? 'text-foreground' : 'text-foreground-muted'}`}>{label}</span>
                        {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
                    </div>
                ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                {step === 0 && (
                    <div className="space-y-4">
                        <h2 className="font-bold text-sm text-foreground">Basic Info</h2>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Organisation Name</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple text-foreground" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Industry</label>
                            <input value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple text-foreground" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Plan</label>
                            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none text-foreground">
                                {['Starter', 'Professional', 'Enterprise'].map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="font-bold text-sm text-foreground">Compliance Frameworks</h2>
                        <p className="text-xs text-foreground-muted -mt-2">Select which frameworks apply, and an optional starting score for each.</p>
                        {frameworks.map((f) => (
                            <div key={f.framework} className="flex items-center gap-3 border-b border-border last:border-0 pb-3 last:pb-0">
                                <input type="checkbox" checked={f.enabled} onChange={() => toggleFramework(f.framework)} className="accent-purple flex-shrink-0" />
                                <span className="text-sm text-foreground w-28 flex-shrink-0">{f.framework}</span>
                                <input type="range" min={0} max={100} value={f.initialScore} disabled={!f.enabled}
                                    onChange={(e) => setFrameworkScore(f.framework, Number(e.target.value))}
                                    className="flex-1 accent-purple disabled:opacity-40" />
                                <span className="text-xs font-bold text-foreground w-10 text-right flex-shrink-0">{f.enabled ? `${f.initialScore}%` : '—'}</span>
                            </div>
                        ))}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="font-bold text-sm text-foreground">Contacts</h2>
                        {([
                            ['cisoName', 'CISO Name'], ['cisoEmail', 'CISO Email'],
                            ['itDirectorEmail', 'IT Director Email'], ['onCallPhone', 'On-Call Phone'],
                        ] as const).map(([field, label]) => (
                            <div key={field}>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{label}</label>
                                <input value={contacts[field]} onChange={(e) => setContacts((c) => ({ ...c, [field]: e.target.value }))}
                                    className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple text-foreground" />
                            </div>
                        ))}
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="font-bold text-sm text-foreground">Wazuh Config</h2>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Agent Group Name</label>
                            <input value={wazuhGroup} onChange={(e) => setWazuhGroup(e.target.value)} placeholder="e.g. dangote-group"
                                className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-purple text-foreground" />
                            <p className="text-[10px] text-foreground-muted mt-1.5">This organisation&apos;s agents must be enrolled into this Wazuh group for endpoint data to scope correctly (see routes/wazuh.ts&apos;s group-filtering helpers).</p>
                        </div>
                    </div>
                )}

                {error && <p className="text-xs text-red mt-4">{error}</p>}
            </div>

            <div className="flex items-center justify-between">
                <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
                    className="flex items-center gap-1.5 text-xs font-bold text-foreground-muted border border-border rounded-lg px-4 py-2 disabled:opacity-40 hover:bg-card-muted transition-colors">
                    <ArrowLeft size={14} /> Back
                </button>
                {step < STEPS.length - 1 ? (
                    <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                        className="flex items-center gap-1.5 text-xs font-bold text-white bg-purple rounded-lg px-4 py-2 hover:bg-purple-hover transition-colors">
                        Next <ArrowRight size={14} />
                    </button>
                ) : (
                    <button onClick={submit} disabled={saving}
                        className="flex items-center gap-1.5 text-xs font-bold text-white bg-orange hover:bg-orange-hover rounded-lg px-4 py-2 disabled:opacity-50 transition-colors">
                        {saving ? 'Saving…' : 'Complete Setup'} <Check size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
