'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiUrl, apiFetch } from '@/lib/api';

// One framework's control list — GET /api/compliance/controls?frameworkId= (real Supabase
// query; honest empty array — there's no control catalog table, a framework's control list is
// exactly whatever rows exist in compliance_assessments for it, which is none until the first
// one is assessed). Shared by all 5 framework sub-pages rather than duplicated per-framework,
// since the only thing that differs between them is which frameworkId/name is passed in.

interface Control {
    id: string;
    control_id: string;
    title: string;
    description: string;
    status: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
    notes: string | null;
}

const STATUS_LABEL: Record<Control['status'], string> = {
    compliant: 'Compliant', partial: 'Partial', non_compliant: 'Non-Compliant', not_assessed: 'Not Assessed',
};
const STATUS_STYLE: Record<Control['status'], string> = {
    compliant: 'bg-green/10 text-green border-green/30', partial: 'bg-amber/10 text-amber border-amber/30',
    non_compliant: 'bg-red/10 text-red border-red/30', not_assessed: 'bg-card-muted text-foreground-muted border-border',
};

export function ComplianceFramework({ frameworkId, name, shortName }: { frameworkId: number; name: string; shortName: string }) {
    const [controls, setControls] = useState<Control[] | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(() => {
        apiFetch(apiUrl(`/api/compliance/controls?frameworkId=${frameworkId}`), { cache: 'no-store', signal: AbortSignal.timeout(10000) })
            .then((r) => r.json())
            .then((data) => setControls(Array.isArray(data) ? data : []))
            .catch(() => setControls([]));
    }, [frameworkId]);

    useEffect(() => { load(); }, [load]);

    const assess = async (control: Control, status: Control['status']) => {
        setBusyId(control.id);
        try {
            await apiFetch(apiUrl('/api/compliance'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frameworkId, controlId: control.control_id, controlName: control.title, status }),
            });
            load();
        } finally {
            setBusyId(null);
        }
    };

    const loading = controls === null;
    const compliantCount = controls?.filter((c) => c.status === 'compliant').length ?? 0;

    return (
        <div className="space-y-4">
            <Link href="/admin/compliance" className="flex items-center gap-1.5 text-xs font-bold text-blue hover:text-purple transition-colors">
                <ArrowLeft size={14} /> Back to Compliance Dashboard
            </Link>
            <div>
                <h1 className="text-lg font-black text-foreground">{shortName}</h1>
                <p className="text-xs text-foreground-muted">{name} · Control-by-control assessment</p>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-card-muted rounded-xl animate-pulse" />)}</div>
            ) : controls!.length === 0 ? (
                <div className="bg-card border border-dashed border-grey-300 rounded-xl p-10 text-center">
                    <p className="text-sm text-foreground-muted mb-1">No controls loaded for this framework yet.</p>
                    <p className="text-xs text-foreground-muted">The compliance backend that stores control definitions and assessments isn&apos;t deployed yet — this page will populate the moment it is, with no code change needed here.</p>
                </div>
            ) : (
                <>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 text-xs">
                        <span className="font-bold text-foreground">{controls!.length} controls</span>
                        <span className="text-green font-bold">{compliantCount} compliant</span>
                        <span className="ml-auto text-foreground-muted">{Math.round((compliantCount / controls!.length) * 100)}% complete</span>
                    </div>
                    <div className="space-y-2">
                        {controls!.map((c) => (
                            <div key={c.id} className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div>
                                        <span className="text-[10px] font-mono text-foreground-muted">{c.control_id}</span>
                                        <p className="text-sm font-bold text-foreground">{c.title}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase flex-shrink-0 ${STATUS_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                                </div>
                                <p className="text-xs text-foreground-muted mb-3">{c.description}</p>
                                <div className="flex gap-2">
                                    {(['compliant', 'partial', 'non_compliant'] as const).map((s) => (
                                        <button key={s} disabled={busyId === c.id} onClick={() => assess(c, s)}
                                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors ${c.status === s ? STATUS_STYLE[s] : 'border-border text-foreground-muted hover:bg-card-muted'}`}>
                                            Mark {STATUS_LABEL[s]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
