'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { getPortalContext } from '@/lib/portal-context';
import { apiUrl } from '@/lib/api';

type CtipStats = {
    total_iocs: number;
    iocs_last_24h: number;
    active_campaigns: number;
    exploitable_cves_this_week: number;
    sources_active: number;
    last_collector_run: string | null;
};

interface FeedStatus {
    collector_name: string;
    status: string;
    records_new: number;
    records_pulled: number;
    finished_at: string | null;
}

interface SearchMatch {
    id: string;
    ioc_type: string;
    value: string;
    source: string;
    confidence: number;
    malware_family: string | null;
    threat_type: string | null;
    country: string | null;
    first_seen: string | null;
    last_seen: string | null;
    mitre_techniques: string[];
}

interface FeedIOC {
    id: string;
    ioc_type: string;
    value: string;
    confidence: number;
    threat_type: string | null;
    country: string | null;
    first_seen: string | null;
    last_seen: string | null;
}

function iocVerdict(confidence: number): string {
    if (confidence >= 80) return 'Malicious';
    if (confidence >= 50) return 'Suspicious';
    return 'Clean';
}
const verdictEmoji: Record<string, string> = { Malicious: '🔴', Suspicious: '🟠', Clean: '🟢' };

function formatSeen(ts: string | null): string {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function feedDotColor(finishedAt: string | null): string {
    if (!finishedAt) return 'bg-red-500';
    const hrs = (Date.now() - new Date(finishedAt).getTime()) / 3600000;
    if (hrs < 1) return 'bg-green';
    if (hrs < 6) return 'bg-amber';
    return 'bg-red-500';
}

function feedDisplayName(collectorName: string, allFeeds: FeedStatus[]): string {
    const sortedNames = [...new Set(allFeeds.map(f => f.collector_name))].sort();
    const index = sortedNames.indexOf(collectorName);
    const letter = String.fromCharCode(65 + (index >= 0 ? index : 0));
    return `Intelligence Feed ${letter}`;
}

export default function CTIPage() {
    const [ctipStats, setCtipStats] = useState<CtipStats | null>(null);
    const [feeds, setFeeds] = useState<FeedStatus[]>([]);
    const [isPortal, setIsPortal] = useState(false);

    const [searchValue, setSearchValue] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<{ found: boolean; matches: SearchMatch[] } | null>(null);

    const [feedIocs, setFeedIocs] = useState<FeedIOC[] | null>(null);

    useEffect(() => {
        setIsPortal(getPortalContext().isPortal);
    }, []);

    useEffect(() => {
        fetch(apiUrl('/api/threat-intel/stats'))
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((data: CtipStats) => setCtipStats(data))
            .catch(() => setCtipStats(null));

        fetch(apiUrl('/api/ctip/feed-status'))
            .then(r => r.json())
            .then(data => setFeeds(Array.isArray(data?.feeds) ? data.feeds : []))
            .catch(() => setFeeds([]));

        fetch(apiUrl('/api/threat-intel/iocs?limit=50'))
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => setFeedIocs(Array.isArray(data?.items) ? data.items : []))
            .catch(() => setFeedIocs([]));
    }, []);

    const runSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;
        setSearching(true);
        setSearchResult(null);
        try {
            const res = await fetch(apiUrl(`/api/threat-intel/iocs/${encodeURIComponent(searchValue.trim())}`));
            const data = await res.json();
            setSearchResult({ found: Boolean(data?.found), matches: Array.isArray(data?.matches) ? data.matches : [] });
        } catch {
            setSearchResult({ found: false, matches: [] });
        } finally {
            setSearching(false);
        }
    };

    const kpiData = ctipStats ? [
        { label: 'Total IOCs', value: ctipStats.total_iocs.toLocaleString(), color: 'text-green' },
        { label: 'New Today', value: ctipStats.iocs_last_24h.toLocaleString(), color: 'text-amber' },
        { label: 'Active Campaigns', value: ctipStats.active_campaigns.toLocaleString(), color: 'text-red-500' },
        { label: 'Active Sources', value: ctipStats.sources_active.toLocaleString(), color: 'text-green' },
    ] : [
        { label: 'Total IOCs', value: '...', color: 'text-green' },
        { label: 'New Today', value: '...', color: 'text-amber' },
        { label: 'Active Campaigns', value: '...', color: 'text-red-500' },
        { label: 'Active Sources', value: '...', color: 'text-green' },
    ];

    return (
        <PageLayout title="Threat Intelligence">
            <div className="space-y-5">
                <div>
                    <h1 className="text-lg font-black text-foreground">Threat Intelligence: CTI Dashboard</h1>
                    <p className="text-xs text-foreground-muted">Threat Intelligence · Indicator search and feed health, powered by CTIP</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-3">
                    {kpiData.map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-4 -mx-4 mb-4 rounded-t-xl" />
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">{k.label}</p>
                            <p className={`text-xl font-black ${k.color} truncate`}>{k.value}</p>
                        </div>
                    ))}
                </div>

                {/* IOC Search */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">IOC Enrichment Search</p>
                        <form onSubmit={runSearch} className="flex gap-2">
                            <input value={searchValue} onChange={e => setSearchValue(e.target.value)}
                                placeholder="Search by IP, domain, URL, or hash…"
                                className="flex-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-green/20" />
                            <button type="submit" disabled={searching} className="px-4 py-2 bg-red hover:bg-red-hover disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                                {searching ? 'Searching…' : 'Search'}
                            </button>
                        </form>

                        {searchResult && !searchResult.found && (
                            <div className="mt-3 bg-card-muted border border-border rounded-lg p-3">
                                <p className="text-xs text-foreground-muted">No intelligence found for this indicator. It may be clean or not yet in our database.</p>
                            </div>
                        )}

                        {searchResult?.found && searchResult.matches.map(m => {
                            const verdict = iocVerdict(m.confidence);
                            return (
                                <div key={m.id} className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-foreground font-mono">{m.value}</p>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${verdict === 'Malicious' ? 'bg-red-500/10 text-red-500 border-red-500/30' : verdict === 'Suspicious' ? 'bg-amber/10 text-amber border-amber/30' : 'bg-green/10 text-green border-green/30'}`}>
                                            {verdictEmoji[verdict]} {verdict.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-foreground-muted">
                                        <span>Type: <span className="font-bold text-foreground">{m.ioc_type}</span></span>
                                        <span>Confidence: <span className="font-bold text-foreground">{m.confidence}%</span></span>
                                        <span>Country: <span className="font-bold text-foreground">{m.country ?? 'Unknown'}</span></span>
                                        <span>Malware Family: <span className="font-bold text-foreground">{m.malware_family ?? 'Unknown'}</span></span>
                                        <span>First Seen: <span className="font-bold text-foreground">{formatSeen(m.first_seen ?? m.last_seen)}</span></span>
                                        {m.mitre_techniques.length > 0 && (
                                            <span className="col-span-2">MITRE: <span className="font-bold text-foreground">{m.mitre_techniques.join(', ')}</span></span>
                                        )}
                                    </div>
                                    <button className="text-[10px] font-bold text-green hover:underline">+ Add to Watchlist</button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Live IOC Feed */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4 pb-3">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Live IOC Feed</p>
                    </div>
                    {feedIocs === null ? (
                        <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-6 bg-card-muted rounded animate-pulse" />)}</div>
                    ) : feedIocs.length === 0 ? (
                        <p className="text-xs text-foreground-muted text-center py-8">No indicators available right now.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead><tr className="border-b border-border">
                                    {['Type', 'Value', 'Country', 'Confidence', 'Threat Type', 'First Seen', 'Verdict'].map(h =>
                                        <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                    )}
                                </tr></thead>
                                <tbody>
                                    {feedIocs.map(ioc => {
                                        const verdict = iocVerdict(ioc.confidence);
                                        return (
                                            <tr key={ioc.id} className="border-b border-border hover:bg-card-muted transition-colors">
                                                <td className="px-4 py-2"><span className="text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground-muted rounded">{ioc.ioc_type}</span></td>
                                                <td className="px-4 py-2 font-mono text-foreground max-w-xs truncate">{ioc.value}</td>
                                                <td className="px-4 py-2 text-foreground-muted">{ioc.country ?? '—'}</td>
                                                <td className="px-4 py-2 text-foreground font-bold">{ioc.confidence}%</td>
                                                <td className="px-4 py-2 text-foreground-muted">{ioc.threat_type ?? '—'}</td>
                                                <td className="px-4 py-2 text-foreground-muted">{formatSeen(ioc.first_seen ?? ioc.last_seen)}</td>
                                                <td className={`px-4 py-2 font-bold ${verdict === 'Malicious' ? 'text-red-500' : verdict === 'Suspicious' ? 'text-amber' : 'text-green'}`}>{verdictEmoji[verdict]} {verdict}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Feed Status — operator-only info, hidden in the client portal */}
                {!isPortal && (
                    <div className="grid grid-cols-4 gap-3">
                        {feeds.length === 0 ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-card border border-border rounded-xl p-4 h-20 animate-pulse" />
                            ))
                        ) : (
                            feeds.map(f => (
                                <div key={f.collector_name} className="bg-card border border-border rounded-xl p-4">
                                    <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-4 -mx-4 mb-3 rounded-t-xl" />
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`w-2 h-2 rounded-full ${feedDotColor(f.finished_at)}`} />
                                        <p className="text-xs font-black text-foreground">{feedDisplayName(f.collector_name, feeds)}</p>
                                    </div>
                                    <p className="text-[10px] text-foreground-muted">Last sync: {f.finished_at ? formatSeen(f.finished_at) : 'Never'}</p>
                                    <p className="text-[11px] font-bold text-foreground mt-1">{f.records_pulled} pulled · {f.records_new} new</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
