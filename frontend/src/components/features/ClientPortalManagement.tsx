'use client';

import { useState } from 'react';
import { ArrowLeft, Building2, Upload } from 'lucide-react';

// Mock data only — no backend route exists for per-client feature toggles or white-label
// settings yet. routes/customers.ts has the real org list this would eventually read from.

interface Feature { label: string; enabled: boolean; subFeatures?: { label: string; enabled: boolean }[] }
interface Client {
    id: string;
    name: string;
    slug: string;
    plan: string;
    mrr: number;
    renewal: string;
    ciso: string;
    itDirector: string;
    billingContact: string;
    features: Feature[];
}

const CLIENTS: Client[] = [
    {
        id: 'cli_001', name: 'Dangote Group', slug: 'dangote', plan: 'Enterprise SOC', mrr: 4500000, renewal: '2027-01-15',
        ciso: 'Aisha Bello', itDirector: 'Chidi Okafor', billingContact: 'accounts@dangote-group.ng',
        features: [
            { label: 'Brand Protection', enabled: true, subFeatures: [{ label: 'Domain Suite', enabled: true }, { label: 'Executive Monitoring', enabled: true }, { label: 'Social Suite', enabled: false }] },
            { label: 'Threat Intelligence', enabled: true },
            { label: 'Infrastructure', enabled: true },
            { label: 'Email Security', enabled: true },
            { label: 'SecOps', enabled: true },
            { label: 'Data Continuity', enabled: false },
        ],
    },
    {
        id: 'cli_002', name: 'Access Bank Plc', slug: 'access-bank', plan: 'Enterprise SOC + Compliance', mrr: 6200000, renewal: '2026-11-30',
        ciso: 'Funmi Adeyemi', itDirector: 'Tunde Bakare', billingContact: 'procurement@accessbankplc.com',
        features: [
            { label: 'Brand Protection', enabled: true },
            { label: 'Threat Intelligence', enabled: true },
            { label: 'Infrastructure', enabled: true },
            { label: 'Email Security', enabled: true },
            { label: 'SecOps', enabled: true },
            { label: 'Data Continuity', enabled: true },
        ],
    },
    {
        id: 'cli_003', name: 'Paystack', slug: 'paystack', plan: 'Growth SOC', mrr: 1800000, renewal: '2026-12-01',
        ciso: '—', itDirector: 'Segun Adewale', billingContact: 'finance@paystack.com',
        features: [
            { label: 'Brand Protection', enabled: false },
            { label: 'Threat Intelligence', enabled: true },
            { label: 'Infrastructure', enabled: true },
            { label: 'Email Security', enabled: true },
            { label: 'SecOps', enabled: false },
            { label: 'Data Continuity', enabled: false },
        ],
    },
];

function formatNaira(n: number): string {
    return '₦' + n.toLocaleString('en-NG');
}

export function ClientPortalManagement() {
    const [clients, setClients] = useState<Client[]>(CLIENTS);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [color, setColor] = useState('#520385');

    const selected = clients.find((c) => c.id === selectedId) ?? null;

    const toggleFeature = (label: string) => {
        if (!selected) return;
        setClients((prev) => prev.map((c) => c.id !== selected.id ? c : {
            ...c,
            features: c.features.map((f) => f.label === label ? { ...f, enabled: !f.enabled } : f),
        }));
    };
    const toggleSubFeature = (parentLabel: string, subLabel: string) => {
        if (!selected) return;
        setClients((prev) => prev.map((c) => c.id !== selected.id ? c : {
            ...c,
            features: c.features.map((f) => f.label !== parentLabel ? f : {
                ...f,
                subFeatures: f.subFeatures?.map((sf) => sf.label === subLabel ? { ...sf, enabled: !sf.enabled } : sf),
            }),
        }));
    };

    if (selected) {
        return (
            <div className="space-y-4">
                <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-xs font-bold text-blue hover:text-purple transition-colors">
                    <ArrowLeft size={14} /> Back to Clients
                </button>

                <div className="bg-card border border-border rounded-xl p-5 flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-lg font-black text-foreground">{selected.name}</h1>
                        <p className="text-xs text-foreground-muted font-mono mt-0.5">client.novrsoc.com/{selected.slug}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{selected.plan}</p>
                        <p className="text-xs text-foreground-muted">{formatNaira(selected.mrr)}/mo · Renews {selected.renewal}</p>
                    </div>
                </div>

                {/* Feature toggles */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-heading font-semibold text-sm text-foreground mb-4">Feature Access</h3>
                    <div className="space-y-1">
                        {selected.features.map((f) => (
                            <div key={f.label}>
                                <div className="flex items-center justify-between py-2 border-b border-border">
                                    <span className="text-sm font-medium text-foreground">{f.label}</span>
                                    <button onClick={() => toggleFeature(f.label)} aria-label={`Toggle ${f.label}`}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${f.enabled ? 'bg-blue' : 'bg-card-muted'}`}>
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${f.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                                {f.enabled && f.subFeatures && (
                                    <div className="pl-4 py-1">
                                        {f.subFeatures.map((sf) => (
                                            <div key={sf.label} className="flex items-center justify-between py-1.5">
                                                <span className="text-xs text-foreground-muted">{sf.label}</span>
                                                <button onClick={() => toggleSubFeature(f.label, sf.label)} aria-label={`Toggle ${sf.label}`}
                                                    className={`w-8 h-4 rounded-full transition-colors relative ${sf.enabled ? 'bg-purple' : 'bg-card-muted'}`}>
                                                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${sf.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* White-label */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-heading font-semibold text-sm text-foreground mb-4">White-Label</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Client Logo</label>
                            <button className="mt-1 w-full flex items-center justify-center gap-2 border border-dashed border-grey-300 rounded-lg py-6 text-xs text-foreground-muted hover:border-blue hover:text-blue transition-colors">
                                <Upload size={14} /> Upload logo
                            </button>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Primary Color</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
                                <span className="font-mono text-sm text-foreground">{color}</span>
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Portal URL</label>
                            <p className="text-sm font-mono text-foreground mt-1">client.novrsoc.com/{selected.slug}</p>
                        </div>
                    </div>
                </div>

                {/* Contacts */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-heading font-semibold text-sm text-foreground mb-4">Contacts &amp; Subscription</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-xs">
                        <div className="flex justify-between border-b border-border pb-2 pr-4"><span className="text-foreground-muted">CISO</span><span className="font-bold text-foreground">{selected.ciso}</span></div>
                        <div className="flex justify-between border-b border-border pb-2 pr-4"><span className="text-foreground-muted">IT Director</span><span className="font-bold text-foreground">{selected.itDirector}</span></div>
                        <div className="flex justify-between border-b border-border pb-2 pr-4"><span className="text-foreground-muted">Billing Contact</span><span className="font-bold text-foreground">{selected.billingContact}</span></div>
                        <div className="flex justify-between pb-2 pr-4"><span className="text-foreground-muted">Plan / MRR</span><span className="font-bold text-foreground">{selected.plan} · {formatNaira(selected.mrr)}</span></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Client Portal Management</h1>
                <p className="text-xs text-foreground-muted">Platform Administration · Manage what each client sees in their portal. Super admin only.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((c) => (
                    <button key={c.id} onClick={() => setSelectedId(c.id)} className="text-left bg-card border border-border rounded-xl p-4 hover:border-blue/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 size={16} className="text-purple flex-shrink-0" />
                            <p className="text-sm font-bold text-foreground truncate">{c.name}</p>
                        </div>
                        <p className="text-xs text-foreground-muted mb-3">{c.plan}</p>
                        <div className="flex items-center justify-between text-[10px] text-foreground-muted">
                            <span>{formatNaira(c.mrr)}/mo</span>
                            <span>{c.features.filter((f) => f.enabled).length}/{c.features.length} features on</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
