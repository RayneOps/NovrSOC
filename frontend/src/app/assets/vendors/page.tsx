'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { GaugeChart } from '@/components/shared/GaugeChart';
import { getPortalContext } from '@/lib/portal-context';
import { apiUrl } from '@/lib/api';

interface Assessment {
    id: number;
    vendor_name: string;
    vendor_category: string | null;
    vendor_website: string | null;
    contact_email: string | null;
    assessed_by: string | null;
    q_data_encryption: number | null;
    q_access_controls: number | null;
    q_security_certifications: number | null;
    q_incident_response: number | null;
    q_vulnerability_management: number | null;
    q_data_residency: number | null;
    q_contractual_security: number | null;
    q_employee_training: number | null;
    q_business_continuity: number | null;
    q_third_party_audits: number | null;
    risk_score: number | null;
    risk_level: string | null;
    status: string;
    next_review_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

const QUESTIONS: { key: keyof Assessment; label: string; step: number }[] = [
    { key: 'q_data_encryption', label: 'Does this vendor encrypt data at rest and in transit?', step: 2 },
    { key: 'q_access_controls', label: 'Does this vendor enforce multi-factor authentication?', step: 2 },
    { key: 'q_security_certifications', label: 'Is this vendor certified (ISO 27001 / SOC 2 / PCI-DSS)?', step: 2 },
    { key: 'q_incident_response', label: 'Does this vendor have an Incident Response plan?', step: 3 },
    { key: 'q_vulnerability_management', label: 'Does this vendor conduct regular penetration testing?', step: 3 },
    { key: 'q_business_continuity', label: 'Does this vendor have a Business Continuity plan?', step: 3 },
    { key: 'q_data_residency', label: 'Does vendor data stay within Nigeria or approved regions?', step: 4 },
    { key: 'q_contractual_security', label: 'Does the vendor contract include security obligations?', step: 4 },
    { key: 'q_employee_training', label: 'Do vendor employees receive regular security training?', step: 4 },
    { key: 'q_third_party_audits', label: 'Does vendor allow third-party security audits?', step: 4 },
];
const ANSWER_LABELS = ['Not implemented', 'Partially implemented', 'Implemented', 'Implemented and tested', 'Implemented, tested, and certified'];
const CATEGORIES = ['Software', 'Cloud', 'Network', 'Hardware', 'Professional Services', 'ISP', 'Other'];

const RISK_BADGE: Record<string, string> = {
    Low: 'bg-green/10 text-green border-green/30',
    Medium: 'bg-amber/10 text-amber border-amber/30',
    High: 'bg-amber/10 text-amber border-amber/30',
    Critical: 'bg-red-500/10 text-red-500 border-red-500/30',
};
const RISK_COLOR: Record<string, string> = {
    Low: '#16A34A', Medium: '#D97706', High: '#D97706', Critical: '#EF4444',
};

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sixMonthsFromNow(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
}

function recommendationFor(key: string): string {
    const map: Record<string, string> = {
        q_data_encryption: 'Require vendor to implement encryption at rest and in transit before data sharing',
        q_access_controls: 'Require vendor to enforce multi-factor authentication on all privileged accounts',
        q_security_certifications: 'Request ISO 27001 or SOC 2 certification evidence within 90 days',
        q_incident_response: 'Request a copy of the vendor’s incident response plan and escalation contacts',
        q_vulnerability_management: 'Require evidence of recent penetration testing or vulnerability scanning',
        q_data_residency: 'Confirm data residency terms comply with Nigerian data protection requirements',
        q_contractual_security: 'Amend contract to include explicit security and breach-notification obligations',
        q_employee_training: 'Request evidence of regular vendor security awareness training',
        q_business_continuity: 'Request the vendor’s business continuity / disaster recovery plan',
        q_third_party_audits: 'Negotiate right-to-audit clause into the vendor contract',
    };
    return map[key] ?? 'Follow up with vendor on this control area';
}

function EmptyState({ onNew }: { onNew: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground-muted mb-4">
                <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round" />
                <path d="M7 9h10M7 13h6" strokeLinecap="round" />
            </svg>
            <h3 className="text-sm font-bold text-foreground mb-1">No Vendor Assessments Yet</h3>
            <p className="text-xs text-foreground-muted max-w-sm mb-4">Conduct your first vendor security assessment to start tracking third-party risk.</p>
            <button onClick={onNew} className="text-xs font-bold px-4 py-2 bg-red hover:bg-red-hover text-white rounded-lg transition-colors">+ New Assessment</button>
        </div>
    );
}

function Wizard({ existing, onClose, onSaved }: { existing?: Assessment; onClose: () => void; onSaved: (a: Assessment) => void }) {
    const [step, setStep] = useState(1);
    const [vendorName, setVendorName] = useState(existing?.vendor_name ?? '');
    const [category, setCategory] = useState(existing?.vendor_category ?? CATEGORIES[0]);
    const [website, setWebsite] = useState(existing?.vendor_website ?? '');
    const [email, setEmail] = useState(existing?.contact_email ?? '');
    const [assessedBy, setAssessedBy] = useState(existing?.assessed_by ?? 'Admin User');
    const [answers, setAnswers] = useState<Record<string, number>>(() => {
        const init: Record<string, number> = {};
        if (existing) for (const q of QUESTIONS) init[q.key as string] = (existing[q.key] as number | null) ?? 0;
        return init;
    });
    const [nextReview, setNextReview] = useState(existing?.next_review_date ?? sixMonthsFromNow());
    const [notes, setNotes] = useState(existing?.notes ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalPoints = QUESTIONS.reduce((sum, q) => sum + (answers[q.key as string] ?? 0), 0);
    const riskScore = Math.round(100 - (totalPoints / 40) * 100);
    const riskLevel = riskScore <= 25 ? 'Low' : riskScore <= 50 ? 'Medium' : riskScore <= 75 ? 'High' : 'Critical';

    const submit = async () => {
        if (!vendorName.trim()) { setError('Vendor name is required'); setStep(1); return; }
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(apiUrl(existing ? `/api/vendor-assessments/${existing.id}` : '/api/vendor-assessments'), {
                method: existing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendor_name: vendorName,
                    vendor_category: category,
                    vendor_website: website,
                    contact_email: email,
                    assessed_by: assessedBy,
                    ...answers,
                    next_review_date: nextReview,
                    notes,
                    ...(existing ? {} : { org_id: getPortalContext().orgId ?? undefined }),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Failed to save assessment');
            onSaved(data.assessment);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save assessment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="h-[3px] bg-green from-green via-green to-red-500 rounded-t-2xl" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-black text-foreground">New Vendor Assessment</h3>
                        <button onClick={onClose} className="text-foreground-muted hover:text-foreground-muted">✕</button>
                    </div>
                    <p className="text-[10px] text-foreground-muted mb-4">Step {step} of 5</p>

                    {step === 1 && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Vendor Name *</label>
                                <input value={vendorName} onChange={e => setVendorName(e.target.value)}
                                    className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)}
                                    className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none">
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Website URL</label>
                                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..."
                                    className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Contact Email</label>
                                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                                    className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Assessed By</label>
                                <input value={assessedBy} onChange={e => setAssessedBy(e.target.value)}
                                    className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" />
                            </div>
                        </div>
                    )}

                    {(step === 2 || step === 3 || step === 4) && (
                        <div className="space-y-4">
                            <p className="text-[11px] font-bold text-foreground">
                                {step === 2 ? 'Data Security' : step === 3 ? 'Operational Security' : 'Compliance & Contractual'}
                            </p>
                            {QUESTIONS.filter(q => q.step === step).map(q => (
                                <div key={q.key as string}>
                                    <p className="text-xs text-foreground mb-2">{q.label}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {ANSWER_LABELS.map((label, val) => (
                                            <button key={val} type="button"
                                                onClick={() => setAnswers(prev => ({ ...prev, [q.key as string]: val }))}
                                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded border transition-colors ${
                                                    answers[q.key as string] === val ? 'bg-amber text-white border-green' : 'bg-card border-border text-foreground-muted'
                                                }`}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-card-muted rounded-xl p-4">
                                <GaugeChart value={riskScore} size={72} strokeWidth={7} color={RISK_COLOR[riskLevel]} />
                                <div>
                                    <p className="text-2xl font-black" style={{ color: RISK_COLOR[riskLevel] }}>{riskScore}<span className="text-sm text-foreground-muted">/100</span></p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${RISK_BADGE[riskLevel]}`}>{riskLevel} Risk</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Next Review Date</label>
                                <input type="date" value={nextReview} onChange={e => setNextReview(e.target.value)}
                                    className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                                    className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" />
                            </div>
                        </div>
                    )}

                    {error && <p className="text-[11px] text-red-500 mt-3">{error}</p>}

                    <div className="flex gap-3 mt-5">
                        {step > 1 && (
                            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-2 border border-border text-foreground-muted text-xs font-bold rounded-lg hover:bg-card-muted transition-colors">Back</button>
                        )}
                        {step < 5 ? (
                            <button onClick={() => setStep(s => s + 1)} className="flex-1 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Next</button>
                        ) : (
                            <button onClick={submit} disabled={submitting} className="flex-1 py-2 bg-red hover:bg-red-hover disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                                {submitting ? 'Saving…' : 'Submit Assessment'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailView({ a, onClose }: { a: Assessment; onClose: () => void }) {
    const level = a.risk_level ?? 'Low';
    const lowScoring = QUESTIONS.filter(q => ((a[q.key] as number | null) ?? 0) < 2);

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card rounded-2xl border border-border w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="h-[3px] bg-green from-green via-green to-red-500 rounded-t-2xl" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-black text-foreground">{a.vendor_name}</h3>
                            <p className="text-[11px] text-foreground-muted">{a.vendor_category ?? '—'}</p>
                        </div>
                        <button onClick={onClose} className="text-foreground-muted hover:text-foreground-muted">✕</button>
                    </div>

                    <div className="flex items-center gap-4 bg-card-muted rounded-xl p-4 mb-4">
                        <GaugeChart value={a.risk_score ?? 0} size={72} strokeWidth={7} color={RISK_COLOR[level]} />
                        <div>
                            <p className="text-2xl font-black" style={{ color: RISK_COLOR[level] }}>{a.risk_score ?? 0}<span className="text-sm text-foreground-muted">/100</span></p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${RISK_BADGE[level]}`}>{level} Risk</span>
                        </div>
                        <div className="ml-auto text-right">
                            <p className="text-[9px] font-bold text-foreground-muted uppercase">Next Review</p>
                            <p className="text-xs font-bold text-foreground">{formatDate(a.next_review_date)}</p>
                        </div>
                    </div>

                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Assessment Answers</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {QUESTIONS.map(q => {
                            const val = (a[q.key] as number | null) ?? 0;
                            return (
                                <div key={q.key as string} className="flex items-center justify-between bg-card-muted rounded-lg px-3 py-2">
                                    <span className="text-[10px] text-foreground-muted pr-2">{q.label}</span>
                                    <span className={`text-[10px] font-black flex-shrink-0 ${val >= 3 ? 'text-green' : val >= 2 ? 'text-green' : val >= 1 ? 'text-amber' : 'text-red-500'}`}>
                                        {ANSWER_LABELS[val]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {lowScoring.length > 0 && (
                        <>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Recommendations</p>
                            <ol className="space-y-1.5 mb-2">
                                {lowScoring.map((q, i) => (
                                    <li key={q.key as string} className="flex items-start gap-2 text-[11px] text-foreground">
                                        <span className="text-green font-bold flex-shrink-0">{i + 1}.</span>{recommendationFor(q.key as string)}
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}

                    {a.notes && (
                        <>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mt-3 mb-1">Notes</p>
                            <p className="text-xs text-foreground-muted">{a.notes}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VendorsPage() {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [editing, setEditing] = useState<Assessment | null>(null);
    const [viewing, setViewing] = useState<Assessment | null>(null);

    const load = () => {
        setLoading(true);
        const orgId = getPortalContext().orgId;
        fetch(apiUrl(`/api/vendor-assessments${orgId ? `?org_id=${orgId}` : ''}`), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setAssessments(Array.isArray(data?.assessments) ? data.assessments : []))
            .catch(() => setAssessments([]))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const deleteAssessment = async (id: number) => {
        if (!confirm('Delete this assessment?')) return;
        await fetch(apiUrl(`/api/vendor-assessments/${id}`), { method: 'DELETE' });
        setAssessments(prev => prev.filter(a => a.id !== id));
    };

    const dueSoon = assessments.filter(a => {
        if (!a.next_review_date) return false;
        const days = (new Date(a.next_review_date).getTime() - Date.now()) / 86400000;
        return days <= 30;
    }).length;

    const kpis = [
        { label: 'Total Vendors Assessed', v: assessments.length, color: 'text-foreground' },
        { label: 'Critical Risk', v: assessments.filter(a => a.risk_level === 'Critical').length, color: 'text-red-500' },
        { label: 'High Risk', v: assessments.filter(a => a.risk_level === 'High').length, color: 'text-amber' },
        { label: 'Due for Review', v: dueSoon, color: 'text-amber' },
    ];

    return (
        <PageLayout title="Vendor Assessment">
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">Vendor Risk Assessment</h1>
                        <p className="text-xs text-foreground-muted">Assets & Risk · Third-party vendor security posture management</p>
                    </div>
                    <button onClick={() => setShowWizard(true)} className="px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">+ New Assessment</button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {kpis.map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-3">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-3 -mx-3 mb-2 rounded-t-xl" />
                            <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                            <p className={`text-lg font-black ${k.color}`}>{loading ? '...' : k.v}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    {loading ? (
                        <div className="p-6 space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-card-muted rounded animate-pulse" />)}
                        </div>
                    ) : assessments.length === 0 ? (
                        <EmptyState onNew={() => setShowWizard(true)} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Vendor', 'Category', 'Risk Score', 'Risk Level', 'Assessed By', 'Last Assessed', 'Next Review', 'Actions'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {assessments.map(a => (
                                        <tr key={a.id} className="border-b border-border hover:bg-card-muted transition-colors">
                                            <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{a.vendor_name}</td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{a.vendor_category ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-card-muted h-1.5 rounded-full">
                                                        <div className="h-full rounded-full" style={{ width: `${a.risk_score ?? 0}%`, backgroundColor: RISK_COLOR[a.risk_level ?? 'Low'] }} />
                                                    </div>
                                                    <span className="font-black text-[11px]" style={{ color: RISK_COLOR[a.risk_level ?? 'Low'] }}>{a.risk_score ?? 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${RISK_BADGE[a.risk_level ?? 'Low']}`}>{a.risk_level ?? 'Low'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{a.assessed_by ?? '—'}</td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{formatDate(a.created_at)}</td>
                                            <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{formatDate(a.next_review_date)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setViewing(a)} className="text-[10px] font-bold text-green hover:underline">View</button>
                                                    <button onClick={() => setEditing(a)} className="text-[10px] font-bold text-foreground-muted hover:underline">Edit</button>
                                                    <button onClick={() => deleteAssessment(a.id)} className="text-[10px] font-bold text-red-500 hover:underline">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showWizard && (
                <Wizard onClose={() => setShowWizard(false)} onSaved={(a) => { setAssessments(prev => [a, ...prev]); setShowWizard(false); }} />
            )}
            {editing && (
                <Wizard
                    existing={editing}
                    onClose={() => setEditing(null)}
                    onSaved={(a) => { setAssessments(prev => prev.map(x => x.id === a.id ? a : x)); setEditing(null); }}
                />
            )}
            {viewing && <DetailView a={viewing} onClose={() => setViewing(null)} />}
        </PageLayout>
    );
}
