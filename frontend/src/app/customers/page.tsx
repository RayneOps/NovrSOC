'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { apiUrl } from '@/lib/api';

interface Customer {
    id: number;
    name: string;
    industry: string | null;
    plan: string;
    wazuhGroup: string | null;
    contactEmail: string | null;
    contactName: string | null;
    status: string;
    createdAt: string;
    agentsOnline: number;
    agentsTotal: number;
    activeIncidents: number;
}

const INDUSTRIES = ['Banking', 'Telecom', 'Government', 'Oil & Gas', 'Healthcare', 'Fintech', 'Other'];
const PLANS = [
    { name: 'Essential', price: '₦150,000/mo', endpoints: 'Up to 200 endpoints' },
    { name: 'Professional', price: '₦450,000/mo', endpoints: 'Up to 1,000 endpoints' },
    { name: 'Enterprise', price: 'Custom', endpoints: 'Unlimited endpoints' },
];

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="py-16 text-center">
            <p className="text-sm text-foreground-muted mb-4">No clients onboarded yet. Click &apos;Add Client&apos; to onboard your first client.</p>
            <button onClick={onAdd} className="px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">+ Add Client</button>
        </div>
    );
}

function AddClientWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Customer) => void }) {
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [industry, setIndustry] = useState(INDUSTRIES[0]);
    const [contactEmail, setContactEmail] = useState('');
    const [contactName, setContactName] = useState('');
    const [plan, setPlan] = useState('Essential');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<{ wazuhGroup: string; windows: string; linux: string; portalPassword: string } | null>(null);

    const steps = ['Company Details', 'Plan', 'Agent Install', 'Confirm'];

    const create = async () => {
        setCreating(true);
        setError(null);
        try {
            const res = await fetch(apiUrl('/api/customers'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, industry, plan, contactEmail, contactName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Failed to create client');
            setCreated({
                wazuhGroup: data.customer.wazuhGroup,
                windows: data.agentInstall.windows,
                linux: data.agentInstall.linux,
                portalPassword: data.portalCredentials.temporaryPassword,
            });
            onCreated({
                id: data.customer.id, name: data.customer.name, industry: data.customer.industry, plan: data.customer.plan,
                wazuhGroup: data.customer.wazuhGroup, contactEmail: data.customer.contactEmail, contactName: data.customer.contactName,
                status: 'active', createdAt: new Date().toISOString(), agentsOnline: 0, agentsTotal: 0, activeIncidents: 0,
            });
            setStep(3);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create client');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="h-[3px] bg-green from-green via-green to-red-500" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-black text-foreground">Client Onboarding: Step {step + 1} of {steps.length}</h2>
                        <button onClick={onClose} className="text-foreground-muted hover:text-foreground text-lg">✕</button>
                    </div>
                    <div className="flex items-center gap-1 mb-6">
                        {steps.map((s, i) => (
                            <div key={s} className={`flex items-center gap-1 ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                                <div className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${i < step ? 'bg-green text-white' : i === step ? 'bg-amber text-white' : 'bg-card-muted text-foreground-muted'}`}>{i < step ? '✓' : i + 1}</div>
                                <span className={`text-[9px] font-bold ${i === step ? 'text-foreground' : 'text-foreground-muted'} whitespace-nowrap`}>{s}</span>
                                {i < steps.length - 1 && <div className="flex-1 h-px bg-card-muted mx-1" />}
                            </div>
                        ))}
                    </div>

                    <div className="min-h-[220px]">
                        {step === 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Company Name *</label>
                                    <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Industry</label>
                                    <select value={industry} onChange={e => setIndustry(e.target.value)} className="mt-1 w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none">
                                        {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Contact Name *</label>
                                    <input value={contactName} onChange={e => setContactName(e.target.value)} className="mt-1 w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Contact Email *</label>
                                    <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="mt-1 w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                                </div>
                            </div>
                        )}
                        {step === 1 && (
                            <div className="grid grid-cols-3 gap-3">
                                {PLANS.map(p => (
                                    <button key={p.name} type="button" onClick={() => setPlan(p.name)}
                                        className={`text-left border rounded-xl p-3 transition-colors ${plan === p.name ? 'border-green bg-green/10' : 'border-border hover:border-green/30'}`}>
                                        <p className="font-black text-foreground text-sm">{p.name}</p>
                                        <p className="text-green font-bold text-xs mt-0.5">{p.price}</p>
                                        <p className="text-[10px] text-foreground-muted mt-1">{p.endpoints}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                        {step === 2 && (
                            <div className="space-y-3">
                                <p className="text-xs text-foreground-muted">Agent install commands for <span className="font-mono font-bold">{name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'client-group'}</span> — generated on confirm:</p>
                                <div className="bg-grey-900 rounded-lg p-3 font-mono text-[10px] text-green break-all">
                                    <p className="text-foreground-muted mb-1"># Windows</p>
                                    {`msiexec /i wazuh-agent.msi WAZUH_MANAGER="164.92.203.205" WAZUH_AGENT_GROUP="${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'client-group'}"`}
                                </div>
                                <div className="bg-grey-900 rounded-lg p-3 font-mono text-[10px] text-green break-all">
                                    <p className="text-foreground-muted mb-1"># Linux</p>
                                    {`WAZUH_MANAGER='164.92.203.205' WAZUH_AGENT_GROUP='${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'client-group'}' dpkg -i wazuh-agent.deb`}
                                </div>
                                <p className="text-[10px] text-amber">Note: the Wazuh Manager API isn&apos;t reachable from this deployment, so the agent group must be created manually on the Wazuh server before agents can register.</p>
                            </div>
                        )}
                        {step === 3 && (
                            <div className="text-center py-4">
                                {!created ? (
                                    <>
                                        <p className="text-xs text-foreground-muted mb-4">Review the details above, then create this client.</p>
                                        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
                                        <button onClick={create} disabled={creating || !name.trim() || !contactEmail.trim() || !contactName.trim()}
                                            className="px-4 py-2 bg-red hover:bg-red-hover disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                                            {creating ? 'Creating…' : '🚀 Create Client'}
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-left space-y-2">
                                        <div className="w-10 h-10 bg-green/10 border border-green/30 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">✓</div>
                                        <p className="text-sm font-black text-green text-center">Client created</p>
                                        <p className="text-[11px] text-foreground-muted"><span className="font-bold">Portal login:</span> {contactEmail}</p>
                                        <p className="text-[11px] text-foreground-muted"><span className="font-bold">Temporary password:</span> <span className="font-mono">{created.portalPassword}</span></p>
                                        <p className="text-[10px] text-foreground-muted">Share these credentials securely — this password is shown only once.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-6">
                        {step > 0 && step < 3 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 border border-border text-foreground-muted text-xs font-bold rounded-lg hover:text-foreground transition-colors">← Back</button>}
                        {step < 2 && <button onClick={() => setStep(s => s + 1)} className="ml-auto px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Next →</button>}
                        {step === 2 && <button onClick={() => setStep(3)} className="ml-auto px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Next →</button>}
                        {step === 3 && created && <button onClick={onClose} className="ml-auto px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Done</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [wizard, setWizard] = useState(false);

    const load = () => {
        setLoading(true);
        fetch(apiUrl('/api/customers'), { cache: 'no-store' })
            .then(r => r.json())
            .then(d => setCustomers(Array.isArray(d?.customers) ? d.customers : []))
            .catch(() => setCustomers([]))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const otherClients = customers.filter(c => c.name !== 'Cybernovr');
    const cybernovr = customers.find(c => c.name === 'Cybernovr');

    return (
        <PageLayout title="MSSP Customers">
            <div className="space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">MSSP Client Portfolio</h1>
                        <p className="text-xs text-foreground-muted">Customers · Onboarding and multi-tenant security management</p>
                    </div>
                    <button onClick={() => setWizard(true)} className="px-3 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">+ Add Client</button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Total Clients', value: customers.length, color: 'text-green' },
                        { label: 'Endpoints Monitored', value: customers.reduce((s, c) => s + c.agentsTotal, 0), color: 'text-green' },
                        { label: 'Active Incidents', value: customers.reduce((s, c) => s + c.activeIncidents, 0), color: 'text-amber' },
                        { label: 'Agents Online', value: customers.reduce((s, c) => s + c.agentsOnline, 0), color: 'text-green' },
                    ].map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-3">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-3 -mx-3 mb-3 rounded-t-xl" />
                            <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-wider mb-1">{k.label}</p>
                            <p className={`text-xl font-black ${k.color}`}>{loading ? '...' : k.value}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    {loading ? (
                        <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-6 bg-card-muted rounded animate-pulse" />)}</div>
                    ) : customers.length === 0 ? (
                        <EmptyState onAdd={() => setWizard(true)} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead><tr className="border-b border-border">
                                    {['Client', 'Industry', 'Plan', 'Active Incidents', 'Agents Online', 'Status'].map(h =>
                                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    )}
                                </tr></thead>
                                <tbody>
                                    {[...(cybernovr ? [cybernovr] : []), ...otherClients].map(c => (
                                        <tr key={c.id} className="border-b border-border hover:bg-card-muted transition-colors">
                                            <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{c.name === 'Cybernovr' ? '🛡️' : '🏢'} {c.name}</td>
                                            <td className="px-4 py-3 text-foreground-muted">{c.industry ?? '—'}</td>
                                            <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 bg-green/10 text-green border border-green/30 rounded">{c.plan}</span></td>
                                            <td className={`px-4 py-3 font-bold ${c.activeIncidents >= 5 ? 'text-red-500' : 'text-foreground'}`}>{c.activeIncidents}</td>
                                            <td className="px-4 py-3 text-foreground-muted">{c.agentsOnline}/{c.agentsTotal}</td>
                                            <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 bg-green/10 text-green rounded">🟢 {c.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {wizard && (
                <AddClientWizard onClose={() => { setWizard(false); load(); }} onCreated={(c) => setCustomers(prev => [...prev, c])} />
            )}
        </PageLayout>
    );
}
