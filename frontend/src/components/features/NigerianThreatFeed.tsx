'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Newspaper, ShieldAlert } from 'lucide-react';
import { apiUrl, apiFetch } from '@/lib/api';

// NCC-CSIRT/NGCERT advisories below are still mock data — neither agency exposes a scrapable
// feed. Real advisory format so this stays useful as a template once a live scraper is wired in.
// The "Live Cyber News" and Shadowserver sections underneath ARE live: GET /api/dashboard/
// nigeria-threats' `supplemental` field, sourced from services/serper.ts (Google News search,
// no key needed to degrade — empty array if SERPER_API_KEY isn't set) and
// services/shadowserver.ts (national exposure stats — requires manual org approval from the
// Shadowserver Foundation, so `shadowserver_configured` is false and the section stays hidden
// until SHADOWSERVER_API_ID/SECRET are set).

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

interface NewsItem {
    title: string;
    url: string;
    snippet: string;
    source: string;
    date: string | null;
}

interface ShadowserverStats {
    country: string;
    date: string;
    total_exposed: number;
    by_category: Record<string, number>;
    top_ports: Array<{ port: number; count: number }>;
}

export function NigerianThreatFeed() {
    const [sourceFilter, setSourceFilter] = useState<(typeof SOURCES)[number]>('All');
    const filtered = MOCK_NIGERIA_ADVISORIES.filter((a) => sourceFilter === 'All' || a.source === sourceFilter);

    const [news, setNews] = useState<NewsItem[]>([]);
    const [newsLoading, setNewsLoading] = useState(true);
    const [shadowserver, setShadowserver] = useState<ShadowserverStats | null>(null);
    const [shadowserverConfigured, setShadowserverConfigured] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch(apiUrl('/api/dashboard/nigeria-threats?range=24h'), { cache: 'no-store' });
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                setNews(data?.supplemental?.cyber_news ?? []);
                setShadowserver(data?.supplemental?.shadowserver ?? null);
                setShadowserverConfigured(!!data?.supplemental?.shadowserver_configured);
            } catch {
                // leave news/shadowserver empty — sections below render their own empty states
            } finally {
                if (!cancelled) setNewsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Nigerian Threat Intelligence Feed</h1>
                <p className="text-xs text-foreground-muted">NCC-CSIRT and NGCERT advisories (mock — no live scraper wired yet), plus live cyber news and exposure stats below.</p>
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

            {/* Live Nigerian Cyber News — Serper Google News search, no mock fallback */}
            <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                    <Newspaper size={14} className="text-blue" />
                    <h2 className="text-sm font-black text-foreground">Live Cyber News</h2>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue/10 text-blue rounded-full uppercase">Serper</span>
                </div>
                {newsLoading ? (
                    <p className="text-xs text-foreground-muted">Loading live news…</p>
                ) : news.length === 0 ? (
                    <p className="text-xs text-foreground-muted">No live news available — SERPER_API_KEY not configured, or no recent results.</p>
                ) : (
                    <div className="space-y-2">
                        {news.slice(0, 8).map((n) => (
                            <a key={n.url} href={n.url} target="_blank" rel="noreferrer"
                                className="block bg-card border border-border rounded-xl p-3 hover:border-blue/40 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-xs font-bold text-foreground">{n.title}</p>
                                    <ExternalLink size={10} className="text-foreground-muted flex-shrink-0 mt-0.5" />
                                </div>
                                {n.snippet && <p className="text-[11px] text-foreground-muted mt-1">{n.snippet}</p>}
                                <p className="text-[9px] text-foreground-muted mt-1">{n.source}{n.date ? ` · ${n.date}` : ''}</p>
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Shadowserver national exposure stats — hidden entirely until an API key pair is
                approved and configured, rather than showing a permanently-empty widget */}
            {shadowserverConfigured && (
                <div className="pt-2">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert size={14} className="text-orange" />
                        <h2 className="text-sm font-black text-foreground">Nigeria Network Exposure</h2>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-orange/10 text-orange rounded-full uppercase">Shadowserver</span>
                    </div>
                    {shadowserver ? (
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-2xl font-black text-foreground">{shadowserver.total_exposed.toLocaleString()}</p>
                            <p className="text-[10px] text-foreground-muted mb-3">exposed hosts reported for Nigeria on {shadowserver.date}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(shadowserver.by_category).map(([tag, count]) => (
                                    <span key={tag} className="text-[9px] font-medium px-1.5 py-0.5 bg-card-muted text-foreground-muted rounded-full">{tag}: {count}</span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-foreground-muted">Shadowserver reports unavailable right now.</p>
                    )}
                </div>
            )}
        </div>
    );
}
