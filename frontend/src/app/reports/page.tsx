'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { getPortalContext } from '@/lib/portal-context';
import { SecurityReportTemplate, type ReportData } from '@/components/reports/SecurityReportTemplate';
import { apiUrl } from '@/lib/api';
import './print.css';

interface Customer {
    id: number;
    name: string;
    industry: string;
    wazuhGroup: string;
}

interface Period {
    label: string;
    start: string;
    end: string;
}

function buildPeriods(count: number): Period[] {
    const periods: Period[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
        const isCurrentMonth = i === 0;
        const end = isCurrentMonth ? now : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59));
        periods.push({
            label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            start: start.toISOString(),
            end: end.toISOString(),
        });
    }
    return periods;
}

export default function ReportsPage() {
    const portal = getPortalContext();
    const [customers, setCustomers] = useState<Customer[] | null>(null);
    const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

    const [generatingPeriod, setGeneratingPeriod] = useState<string | null>(null);
    const [generatedReports, setGeneratedReports] = useState<Record<string, ReportData>>({});
    const [viewingPeriod, setViewingPeriod] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const periods = useMemo(() => buildPeriods(6), []);

    useEffect(() => {
        if (portal.isPortal) return;
        fetch(apiUrl('/api/customers'), { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => {
                const list: Customer[] = Array.isArray(data?.customers) ? data.customers : [];
                setCustomers(list);
                if (list.length > 0) setSelectedOrgId(list[0].id);
            })
            .catch(() => setCustomers([]));
    }, [portal.isPortal]);

    const selectedCustomer = customers?.find((c) => c.id === selectedOrgId) ?? null;

    const org = portal.isPortal
        ? { orgId: portal.orgId, orgName: portal.orgName, wazuhGroup: portal.wazuhGroup }
        : { orgId: selectedCustomer?.id ?? null, orgName: selectedCustomer?.name ?? null, wazuhGroup: selectedCustomer?.wazuhGroup ?? null };

    const generateReport = async (period: Period) => {
        if (!org.orgId || !org.orgName) return;
        setError(null);
        setGeneratingPeriod(period.label);
        try {
            const res = await fetch(apiUrl('/api/reports/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId: org.orgId,
                    orgName: org.orgName,
                    wazuhGroup: org.wazuhGroup,
                    month: period.label,
                    period_start: period.start,
                    period_end: period.end,
                }),
            });
            if (!res.ok) throw new Error('Failed to generate report');
            const data: ReportData = await res.json();
            setGeneratedReports((prev) => ({ ...prev, [period.label]: data }));
            setViewingPeriod(period.label);
        } catch {
            setError('Could not generate the report. Please try again.');
        } finally {
            setGeneratingPeriod(null);
        }
    };

    useEffect(() => {
        if (viewingPeriod && generatedReports[viewingPeriod]) {
            const t = setTimeout(() => window.print(), 400);
            return () => clearTimeout(t);
        }
    }, [viewingPeriod, generatedReports]);

    if (viewingPeriod && generatedReports[viewingPeriod]) {
        return (
            <div>
                <div className="no-print sticky top-0 z-10 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
                    <button
                        onClick={() => setViewingPeriod(null)}
                        className="text-xs font-bold text-foreground-muted hover:text-foreground"
                    >
                        ← Back to Reports
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg"
                    >
                        Print / Save as PDF
                    </button>
                </div>
                <SecurityReportTemplate report={generatedReports[viewingPeriod]} />
            </div>
        );
    }

    return (
        <PageLayout title="Security Reports">
            <div className="space-y-5">
                <div>
                    <h1 className="text-lg font-black text-foreground">Monthly Security Reports</h1>
                    <p className="text-xs text-foreground-muted">Generate a per-client PDF security report sourced from live Wazuh, CTIP, and platform data</p>
                </div>

                {!portal.isPortal && (
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-foreground-muted">Client:</label>
                        <select
                            value={selectedOrgId ?? ''}
                            onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                            className="bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                        >
                            {(customers ?? []).map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

                {!org.orgId ? (
                    <div className="bg-card border border-border rounded-xl p-8 text-center text-xs text-foreground-muted">
                        {portal.isPortal ? 'No organization context found.' : 'No clients onboarded yet.'}
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="h-[3px] bg-green from-green via-green to-red-500" />
                        <div className="divide-y divide-border">
                            {periods.map((period) => {
                                const isGenerating = generatingPeriod === period.label;
                                const isGenerated = Boolean(generatedReports[period.label]);
                                return (
                                    <div key={period.label} className="flex items-center justify-between px-5 py-4">
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{period.label} Security Report</p>
                                            <p className="text-[10px] text-foreground-muted">{org.orgName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isGenerating ? (
                                                <span className="text-[11px] font-bold text-foreground-muted flex items-center gap-2">
                                                    <span className="w-3 h-3 border-2 border-border border-t-blue-700 rounded-full animate-spin" />
                                                    Generating your report…
                                                </span>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => generateReport(period)}
                                                        className="px-3 py-1.5 bg-red hover:bg-red-hover text-white text-[11px] font-bold rounded-lg"
                                                    >
                                                        Generate PDF
                                                    </button>
                                                    {isGenerated && (
                                                        <button
                                                            onClick={() => setViewingPeriod(period.label)}
                                                            className="px-3 py-1.5 border border-border hover:bg-card-muted text-foreground text-[11px] font-bold rounded-lg"
                                                        >
                                                            Download
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
