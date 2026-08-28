'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

// Mock data, deliberately — no NCC-CSIRT/NGCERT scraper or API integration exists yet. Real
// advisory format so this is genuinely useful as a template once a live feed is wired in.

interface Advisory {
    id: string;
    source: 'NCC-CSIRT' | 'NGCERT';
    title: string;
    severity: 'critical' | 'high' | 'medium';
    date: string;
    affected: string;
    description: string;
    tags: string[];
    link: string;
}

const MOCK_NIGERIA_ADVISORIES: Advisory[] = [
    { id: 'NCC-2026-001', source: 'NCC-CSIRT', title: 'Critical Vulnerability in Nigerian Banking Applications', severity: 'critical', date: '2026-08-20', affected: 'Financial sector', description: 'Multiple Nigerian banking apps found vulnerable to authentication bypass. Immediate patching required.', tags: ['banking', 'authentication', 'CVE'], link: 'https://csirt.ncc.gov.ng' },
    { id: 'NGCERT-2026-047', source: 'NGCERT', title: 'Phishing Campaign Targeting Nigerian Telcos', severity: 'high', date: '2026-08-18', affected: 'Telecommunications', description: 'Coordinated phishing campaign targeting employees of major Nigerian telecom operators.', tags: ['phishing', 'telecom', 'social-engineering'], link: 'https://ngcert.gov.ng' },
    { id: 'NCC-2026-002', source: 'NCC-CSIRT', title: 'Ransomware Wave Targeting West African Organizations', severity: 'critical', date: '2026-08-15', affected: 'All sectors', description: "New ransomware variant specifically targeting organizations in Nigeria, Ghana, and Côte d'Ivoire.", tags: ['ransomware', 'west-africa', 'malware'], link: 'https://csirt.ncc.gov.ng' },
    { id: 'NGCERT-2026-046', source: 'NGCERT', title: 'CBN Issues Warning on Fraudulent USSD Transactions', severity: 'high', date: '2026-08-12', affected: 'Banking, Fintech', description: 'Central Bank of Nigeria warns of increase in fraudulent USSD-based mobile banking transactions.', tags: ['fraud', 'ussd', 'mobile-banking', 'cbn'], link: 'https://ngcert.gov.ng' },
];

const SEV_STYLE: Record<Advisory['severity'], string> = {
    critical: 'bg-red/10 text-red border-red/30', high: 'bg-orange/10 text-orange border-orange/30', medium: 'bg-amber/10 text-amber border-amber/30',
};
const SOURCES = ['All', 'NCC-CSIRT', 'NGCERT'] as const;

export function NigerianThreatFeed() {
    const [sourceFilter, setSourceFilter] = useState<(typeof SOURCES)[number]>('All');
    const filtered = MOCK_NIGERIA_ADVISORIES.filter((a) => sourceFilter === 'All' || a.source === sourceFilter);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Nigerian Threat Intelligence Feed</h1>
                <p className="text-xs text-foreground-muted">NCC-CSIRT and NGCERT advisories. Mock data — no live scraper wired yet.</p>
            </div>

            <div className="flex gap-1 bg-card-muted rounded-lg p-1 w-fit">
                {SOURCES.map((s) => (
                    <button key={s} onClick={() => setSourceFilter(s)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${sourceFilter === s ? 'bg-card text-blue shadow-sm' : 'text-foreground-muted hover:text-foreground'}`}>
                        {s}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filtered.map((a) => (
                    <div key={a.id} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${SEV_STYLE[a.severity]}`}>{a.severity}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple/10 text-purple rounded-full">{a.source}</span>
                                <span className="text-[10px] text-foreground-muted font-mono">{a.id}</span>
                            </div>
                            <span className="text-[10px] text-foreground-muted flex-shrink-0">{a.date}</span>
                        </div>
                        <p className="text-sm font-bold text-foreground mb-1">{a.title}</p>
                        <p className="text-xs text-foreground-muted mb-2">{a.description}</p>
                        <p className="text-[10px] text-foreground-muted mb-3">Affected: <span className="font-bold text-foreground">{a.affected}</span></p>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                                {a.tags.map((t) => <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 bg-card-muted text-foreground-muted rounded-full">{t}</span>)}
                            </div>
                            <a href={a.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-blue hover:text-purple transition-colors flex-shrink-0">
                                View Original Advisory <ExternalLink size={10} />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
