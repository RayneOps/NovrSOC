'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';

const PLANS = [
    {
        name: 'Free', price: 0, priceLabel: 'Free', color: 'gray',
        features: {
            'SIEM (Wazuh)': true, 'Threat Intelligence': 'Limited', 'NovrAI Analyst': false,
            'Vulnerability Mgmt (SecuBreach)': false, 'SOAR Automation': false,
            'Compliance Dashboard': false, 'MITRE ATT&CK Dashboard': false,
            'Multi-Tenant MSSP': false, 'Executive Dashboard': false,
            'Custom Threat Intel Feeds': false, 'API Access': false,
        },
        limits: { endpoints: '10', clients: '1', sla: 'None', support: 'Community' },
    },
    {
        name: 'Basic', price: 50000, priceLabel: '₦50,000/mo', color: 'blue',
        features: {
            'SIEM (Wazuh)': true, 'Threat Intelligence': true, 'NovrAI Analyst': false,
            'Vulnerability Mgmt (SecuBreach)': 'Limited', 'SOAR Automation': false,
            'Compliance Dashboard': false, 'MITRE ATT&CK Dashboard': false,
            'Multi-Tenant MSSP': false, 'Executive Dashboard': false,
            'Custom Threat Intel Feeds': false, 'API Access': 'Limited',
        },
        limits: { endpoints: '100', clients: '1', sla: '99%', support: 'Email' },
    },
    {
        name: 'Silver', price: 150000, priceLabel: '₦150,000/mo', color: 'violet', popular: true,
        features: {
            'SIEM (Wazuh)': true, 'Threat Intelligence': true, 'NovrAI Analyst': true,
            'Vulnerability Mgmt (SecuBreach)': true, 'SOAR Automation': 'Limited',
            'Compliance Dashboard': true, 'MITRE ATT&CK Dashboard': true,
            'Multi-Tenant MSSP': false, 'Executive Dashboard': true,
            'Custom Threat Intel Feeds': false, 'API Access': true,
        },
        limits: { endpoints: '500', clients: '5', sla: '99.5%', support: 'Priority' },
    },
    {
        name: 'Gold', price: 400000, priceLabel: '₦400,000/mo', color: 'amber',
        features: {
            'SIEM (Wazuh)': true, 'Threat Intelligence': true, 'NovrAI Analyst': true,
            'Vulnerability Mgmt (SecuBreach)': true, 'SOAR Automation': true,
            'Compliance Dashboard': true, 'MITRE ATT&CK Dashboard': true,
            'Multi-Tenant MSSP': true, 'Executive Dashboard': true,
            'Custom Threat Intel Feeds': true, 'API Access': true,
        },
        limits: { endpoints: '2,000', clients: '20', sla: '99.9%', support: '24/7' },
    },
    {
        name: 'Platinum', price: -1, priceLabel: 'Custom', color: 'red',
        features: {
            'SIEM (Wazuh)': true, 'Threat Intelligence': true, 'NovrAI Analyst': true,
            'Vulnerability Mgmt (SecuBreach)': true, 'SOAR Automation': true,
            'Compliance Dashboard': true, 'MITRE ATT&CK Dashboard': true,
            'Multi-Tenant MSSP': true, 'Executive Dashboard': true,
            'Custom Threat Intel Feeds': true, 'API Access': true,
        },
        limits: { endpoints: 'Unlimited', clients: 'Unlimited', sla: '99.99%', support: 'Dedicated' },
    },
];

const CURRENT_PLAN = 'Gold';

const FEATURE_KEYS = [
    'SIEM (Wazuh)', 'Threat Intelligence', 'NovrAI Analyst',
    'Vulnerability Mgmt (SecuBreach)', 'SOAR Automation', 'Compliance Dashboard',
    'MITRE ATT&CK Dashboard', 'Multi-Tenant MSSP', 'Executive Dashboard',
    'Custom Threat Intel Feeds', 'API Access',
];

const colorMap: Record<string, string> = {
    gray: 'border-border',
    blue: 'border-green',
    violet: 'border-green',
    amber: 'border-amber',
    red: 'border-red-500',
};
const accentMap: Record<string, string> = {
    gray: 'from-card-muted to-card-muted',
    blue: 'from-green to-green',
    violet: 'from-green to-green',
    amber: 'from-amber to-amber',
    red: 'from-red-500 to-red-500',
};

const FeatureValue = ({ val }: { val: boolean | string }) => {
    if (val === true) return <span className="text-green font-bold text-sm">✓</span>;
    if (val === false) return <span className="text-border text-sm">—</span>;
    return <span className="text-[10px] font-bold text-amber bg-amber/10 px-1.5 py-0.5 rounded">{val}</span>;
};

export default function SubscriptionPage() {
    const [annual, setAnnual] = useState(false);

    const price = (p: number) => {
        if (p === 0) return 'Free';
        if (p === -1) return 'Custom';
        const discounted = annual ? Math.round(p * 0.8) : p;
        return `₦${discounted.toLocaleString()}/mo`;
    };

    return (
        <PageLayout title="Subscription">
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">Subscription Plans</h1>
                        <p className="text-xs text-foreground-muted">Administration · Manage your NovrSOC subscription and billing</p>
                    </div>
                    {/* Annual toggle */}
                    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2">
                        <span className={`text-xs font-bold ${!annual ? 'text-foreground' : 'text-foreground-muted'}`}>Monthly</span>
                        <button
                            onClick={() => setAnnual(a => !a)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${annual ? 'bg-amber' : 'bg-card-muted'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-card rounded-full shadow transition-transform ${annual ? 'translate-x-5' : ''}`} />
                        </button>
                        <span className={`text-xs font-bold ${annual ? 'text-foreground' : 'text-foreground-muted'}`}>
                            Annual <span className="text-green font-black">−20%</span>
                        </span>
                    </div>
                </div>

                {/* Plan cards */}
                <div className="grid grid-cols-5 gap-4">
                    {PLANS.map(plan => {
                        const isCurrent = plan.name === CURRENT_PLAN;
                        return (
                            <div key={plan.name} className={`relative bg-card rounded-2xl border-2 overflow-hidden flex flex-col ${isCurrent ? 'border-green shadow-lg shadow-blue-700/10' : colorMap[plan.color]}`}>
                                {plan.popular && (
                                    <div className="bg-green from-green to-green text-white text-[9px] font-black text-center py-1 tracking-widest uppercase">Most Popular</div>
                                )}
                                {isCurrent && !plan.popular && (
                                    <div className="bg-amber text-white text-[9px] font-black text-center py-1 tracking-widest uppercase">Current Plan</div>
                                )}
                                <div className={`h-1 bg-green ${accentMap[plan.color]}`} />
                                <div className="p-4 flex flex-col flex-1">
                                    <p className="text-sm font-black text-foreground">{plan.name}</p>
                                    <p className="text-xl font-black text-foreground mt-1 mb-3">{price(plan.price)}</p>

                                    <div className="space-y-1 mb-4 flex-1">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-foreground-muted">Endpoints</span>
                                            <span className="font-bold text-foreground">{plan.limits.endpoints}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-foreground-muted">Clients</span>
                                            <span className="font-bold text-foreground">{plan.limits.clients}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-foreground-muted">SLA</span>
                                            <span className="font-bold text-foreground">{plan.limits.sla}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-foreground-muted">Support</span>
                                            <span className="font-bold text-foreground">{plan.limits.support}</span>
                                        </div>
                                    </div>

                                    {isCurrent ? (
                                        <div className="w-full py-2 bg-green/10 border border-green/30 text-green text-[10px] font-black text-center rounded-lg">
                                            ✓ Current Plan
                                        </div>
                                    ) : plan.name === 'Platinum' ? (
                                        <button className="w-full py-2 bg-green from-red-500 to-red-500 hover:from-red-500 hover:to-red-500 text-white text-[10px] font-black rounded-lg transition-colors">
                                            Contact Sales
                                        </button>
                                    ) : (
                                        <button className={`w-full py-2 bg-green ${accentMap[plan.color]} hover:opacity-90 text-white text-[10px] font-black rounded-lg transition-opacity`}>
                                            {plan.price > 400000 ? 'Downgrade' : 'Upgrade'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Feature comparison table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4 border-b border-border">
                        <p className="text-xs font-black text-foreground">Feature Comparison</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider w-48">Feature</th>
                                    {PLANS.map(p => (
                                        <th key={p.name} className={`px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider ${p.name === CURRENT_PLAN ? 'text-green' : 'text-foreground-muted'}`}>{p.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {FEATURE_KEYS.map(feat => (
                                    <tr key={feat} className="border-b border-border hover:bg-card-muted">
                                        <td className="px-4 py-2.5 text-xs text-foreground font-medium">{feat}</td>
                                        {PLANS.map(p => (
                                            <td key={p.name} className="px-4 py-2.5 text-center">
                                                <FeatureValue val={p.features[feat as keyof typeof p.features]} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <p className="text-[10px] text-foreground-muted text-center">
                    Need help choosing? <button className="text-green hover:underline font-semibold">Contact our sales team</button> · Prices exclude VAT · Annual billing saves 20%
                </p>
            </div>
        </PageLayout>
    );
}
