'use client';

import { useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Framework {
    name: string;
    fullName: string;
    total: number;
    passed: number;
    failed: number;
    partial: number;
    color: string;
    priority: boolean;
}

const FRAMEWORKS: Framework[] = [
    {
        name: 'NDPR',
        fullName: 'Nigeria Data Protection Regulation',
        total: 34,
        passed: 21,
        failed: 5,
        partial: 8,
        color: '#2B3BCC', // blue — Nigerian regulation, primary
        priority: true,   // always show first
    },
    {
        name: 'ISO 27001',
        fullName: 'ISO/IEC 27001:2022',
        total: 114,
        passed: 67,
        failed: 18,
        partial: 29,
        color: '#6B1FA8', // purple
        priority: false,
    },
    {
        name: 'PCI-DSS',
        fullName: 'Payment Card Industry DSS',
        total: 78,
        passed: 0,
        failed: 0,
        partial: 0,
        color: '#CC2B2B', // red — not started
        priority: false,
    },
    {
        name: 'SOC 2',
        fullName: 'SOC 2 Type II',
        total: 64,
        passed: 0,
        failed: 0,
        partial: 0,
        color: '#7A8099', // grey — not started
        priority: false,
    },
    {
        name: 'NIST CSF',
        fullName: 'NIST Cybersecurity Framework 2.0',
        total: 108,
        passed: 44,
        failed: 22,
        partial: 42,
        color: '#6B1FA8',
        priority: false,
    },
];

export function ComplianceSummary() {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? FRAMEWORKS : FRAMEWORKS.slice(0, 3);

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-blue rounded-full" />
                    <div>
                        <h2 className="font-heading font-semibold text-sm text-foreground uppercase tracking-widest">
                            Compliance Overview
                        </h2>
                        <p className="text-xs text-foreground-muted mt-0.5">Regulatory framework assessment status</p>
                    </div>
                </div>
                <Link
                    href="/admin/data/sla"
                    className="text-xs text-blue hover:text-purple transition-colors flex items-center gap-1"
                >
                    Full Report <ChevronRight size={12} />
                </Link>
            </div>

            {/* Framework grid */}
            <div className="p-6 grid grid-cols-1 gap-4">
                {visible.map((fw) => {
                    const pct = fw.total > 0 ? Math.round((fw.passed / fw.total) * 100) : 0;
                    const notAssessed = fw.passed === 0 && fw.failed === 0 && fw.partial === 0;

                    return (
                        <div key={fw.name} className="border border-border rounded-xl p-4 hover:border-grey-300 transition-colors">
                            {/* Framework header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: `${fw.color}15` }}
                                    >
                                        <Shield size={16} style={{ color: fw.color }} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-heading font-bold text-sm text-foreground">{fw.name}</span>
                                            {fw.priority && (
                                                <span className="text-[10px] font-bold text-blue bg-blue/10 px-1.5 py-0.5 rounded-full">
                                                    REQUIRED
                                                </span>
                                            )}
                                            {notAssessed && (
                                                <span className="text-[10px] font-bold text-foreground-muted bg-card-muted px-1.5 py-0.5 rounded-full border border-border">
                                                    NOT STARTED
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-foreground-muted">{fw.fullName}</span>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="text-right flex-shrink-0">
                                    <div
                                        className="text-2xl font-heading font-bold"
                                        style={{ color: notAssessed ? '#C4C9D8' : fw.color }}
                                    >
                                        {notAssessed ? '—' : `${pct}%`}
                                    </div>
                                    <div className="text-xs text-foreground-muted">
                                        {notAssessed ? 'Not assessed' : `${fw.passed}/${fw.total} controls`}
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            {!notAssessed && (
                                <div className="mb-3">
                                    <div className="h-2 bg-card-muted rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full transition-all duration-500"
                                            style={{ width: `${(fw.passed / fw.total) * 100}%`, backgroundColor: '#16A34A' }}
                                        />
                                        <div
                                            className="h-full transition-all duration-500"
                                            style={{ width: `${(fw.partial / fw.total) * 100}%`, backgroundColor: '#D97706' }}
                                        />
                                        <div
                                            className="h-full transition-all duration-500"
                                            style={{ width: `${(fw.failed / fw.total) * 100}%`, backgroundColor: '#CC2B2B' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Control counts */}
                            {!notAssessed && (
                                <div className="flex items-center gap-4 text-xs flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle size={12} className="text-green" />
                                        <span className="text-foreground-muted">{fw.passed} passed</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <AlertCircle size={12} className="text-amber" />
                                        <span className="text-foreground-muted">{fw.partial} partial</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <XCircle size={12} className="text-red-500" />
                                        <span className="text-foreground-muted">{fw.failed} failed</span>
                                    </div>
                                    <Link
                                        href="/admin/data/sla"
                                        className="ml-auto text-blue hover:text-purple transition-colors flex items-center gap-1"
                                    >
                                        View details <ChevronRight size={10} />
                                    </Link>
                                </div>
                            )}

                            {/* Not started CTA */}
                            {notAssessed && (
                                <button className="w-full mt-2 py-2 border border-dashed border-grey-300 rounded-lg text-xs text-foreground-muted hover:text-blue hover:border-blue transition-colors">
                                    + Start {fw.name} assessment
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Show more/less */}
            {FRAMEWORKS.length > 3 && (
                <div className="px-6 pb-4">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full py-2.5 border border-border rounded-lg text-xs text-foreground-muted hover:text-blue hover:border-blue transition-colors"
                    >
                        {expanded ? 'Show fewer frameworks' : `Show ${FRAMEWORKS.length - 3} more frameworks`}
                    </button>
                </div>
            )}
        </div>
    );
}
