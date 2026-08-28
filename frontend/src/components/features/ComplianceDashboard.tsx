'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';

// Real data from GET /api/compliance?orgId= (routes/compliance.ts) — framework metadata
// (name/description/control counts) is static reference data seeded from the
// compliance_frameworks migration; assessed/compliant/score are honest zeros until the
// external compliance backend (APP_API_BASE_URL) is actually deployed, per that route's own
// comment. orgId=1 (Cybernovr) — the single pre-launch tenant this whole codebase defaults to.

interface Framework {
    id: number;
    name: string;
    shortName: string;
    description: string;
    totalControls: number;
    assessed: number;
    compliant: number;
    score: number;
}

const FW_COLOR: Record<string, string> = {
    NDPA: 'border-t-purple', 'ISO 27001': 'border-t-blue', CBN: 'border-t-orange',
    'PCI-DSS': 'border-t-green', NCC: 'border-t-red', 'NIST CSF': 'border-t-foreground-muted', 'SWIFT CSP': 'border-t-purple',
};
const FW_SLUG: Record<string, string> = {
    NDPA: 'ndpa', 'ISO 27001': 'iso27001', CBN: 'cbn', 'PCI-DSS': 'pcidss', NCC: 'ncc',
};

export function ComplianceDashboard() {
    const [frameworks, setFrameworks] = useState<Framework[] | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/compliance?orgId=1'), { cache: 'no-store', signal: AbortSignal.timeout(10000) })
            .then((r) => r.json())
            .then((data) => setFrameworks(Array.isArray(data) ? data : []))
            .catch(() => setFrameworks([]));
    }, []);

    const loading = frameworks === null;
    const avgScore = frameworks && frameworks.length > 0 ? Math.round(frameworks.reduce((s, f) => s + f.score, 0) / frameworks.length) : 0;
    const anyAssessed = frameworks?.some((f) => f.assessed > 0) ?? false;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Compliance Dashboard</h1>
                <p className="text-xs text-foreground-muted">Regulatory and industry framework assessment — Nigerian and international standards.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Frameworks Tracked', value: frameworks?.length ?? 0 },
                    { label: 'Average Score', value: anyAssessed ? `${avgScore}%` : 'Not assessed' },
                    { label: 'Frameworks Assessed', value: frameworks?.filter((f) => f.assessed > 0).length ?? 0 },
                    { label: 'Total Controls', value: frameworks?.reduce((s, f) => s + f.totalControls, 0) ?? 0 },
                ].map((s) => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                        <div className="text-2xl font-black text-foreground">{loading ? '—' : s.value}</div>
                        <div className="text-[10px] text-foreground-muted uppercase tracking-wider mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 bg-card-muted rounded-xl animate-pulse" />)}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {frameworks!.map((f) => {
                        const slug = FW_SLUG[f.shortName];
                        return (
                            <div key={f.id} className={`bg-card border border-border rounded-xl p-5 border-t-4 ${FW_COLOR[f.shortName] ?? 'border-t-blue'}`}>
                                <p className="text-sm font-bold text-foreground">{f.shortName}</p>
                                <p className="text-[10px] text-foreground-muted mb-3">{f.name}</p>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-3xl font-black text-foreground">{f.assessed > 0 ? `${f.score}%` : '—'}</span>
                                    {f.assessed === 0 && <span className="text-xs text-foreground-muted">Not assessed</span>}
                                </div>
                                <div className="bg-card-muted rounded-full h-1.5 mb-3">
                                    <div className="h-1.5 rounded-full bg-purple" style={{ width: `${f.score}%` }} />
                                </div>
                                <p className="text-[10px] text-foreground-muted mb-3">{f.assessed}/{f.totalControls} controls assessed</p>
                                {slug ? (
                                    <Link href={`/admin/compliance/${slug}`} className="block text-center text-xs font-bold bg-orange hover:bg-orange-hover text-white rounded-lg py-2 transition-colors">
                                        {f.assessed > 0 ? 'Continue Assessment' : 'Assess Now'}
                                    </Link>
                                ) : (
                                    <p className="text-[10px] text-foreground-muted text-center">Detail page not yet built</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
