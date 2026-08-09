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

interface Advisory {
    id: number;
    title: string;
    summary: string | null;
    severity: string;
    source: string | null;
    sectors: string[] | null;
    affected_products: string[] | null;
    related_cves: string[] | null;
    recommended_actions: string[] | null;
    published_at: string;
    created_by: string | null;
}

const SEV_STYLE: Record<string, string> = {
    Critical: 'border-l-red-600 bg-red-500/10',
    High: 'border-l-orange-500 bg-amber/10',
    Medium: 'border-l-amber-500 bg-amber/10',
    Low: 'border-l-blue-500 bg-green/10',
};
const SEV_BADGE: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-500 border-red-500/30',
    High: 'bg-amber/10 text-amber border-amber/30',
    Medium: 'bg-amber/10 text-amber border-amber/30',
    Low: 'bg-green/10 text-green border-green/30',
};
const SECTOR_OPTIONS = ['Banking', 'Telecom', 'Government', 'Oil & Gas', 'Healthcare', 'All Sectors'];

function sourceDisplayName(source: string | null): string {
    if (!source) return 'Cybernovr Threat Intelligence';
    const s = source.toUpperCase();
    if (s.includes('CBN')) return 'Financial Sector Intelligence';
    if (s.includes('NGCERT') || s.includes('NCC')) return 'National Threat Advisory';
    if (s.includes('CISA')) return 'Critical Infrastructure Alert';
    return 'Cybernovr Threat Intelligence';
}

function timeAgo(iso: string): string {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return mins <= 1 ? 'Just now' : `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function SkeletonCard() {
    return (
        <div className="rounded-r-xl p-4 border border-border border-l-4 border-l-gray-200">
            <div className="h-3 w-24 bg-card-muted rounded animate-pulse mb-3" />
            <div className="h-4 w-2/3 bg-card-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-full bg-card-muted rounded animate-pulse mb-1.5" />
            <div className="h-3 w-4/5 bg-card-muted rounded animate-pulse" />
        </div>
    );
}

function PublishModal({ onClose, onPublished }: { onClose: () => void; onPublished: (a: Advisory) => void }) {
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [severity, setSeverity] = useState('Medium');
    const [source, setSource] = useState('');
    const [sectors, setSectors] = useState<string[]>([]);
    const [affectedProducts, setAffectedProducts] = useState('');
    const [recommendedActions, setRecommendedActions] = useState('');
    const [relatedCves, setRelatedCves] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleSector = (s: string) =>
        setSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

    const submit = async () => {
        if (!title.trim()) { setError('Title is required'); return; }
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(apiUrl('/api/advisories'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    summary,
                    severity,
                    source,
                    sectors,
                    affected_products: affectedProducts.split(',').map(s => s.trim()).filter(Boolean),
                    recommended_actions: recommendedActions.split('\n').map(s => s.trim()).filter(Boolean),
                    related_cves: relatedCves.split(',').map(s => s.trim()).filter(Boolean),
                    created_by: 'Admin User',
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Failed to publish');
            onPublished(data.advisory);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to publish advisory');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-black text-foreground mb-4">Publish Advisory</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Summary</label>
                        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3}
                            className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Severity</label>
                            <select value={severity} onChange={e => setSeverity(e.target.value)}
                                className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none">
                                {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Source</label>
                            <input value={source} onChange={e => setSource(e.target.value)} placeholder="Internal source label"
                                className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Sectors</label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {SECTOR_OPTIONS.map(s => (
                                <button key={s} type="button" onClick={() => toggleSector(s)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                                        sectors.includes(s) ? 'bg-amber text-white border-green' : 'bg-card border-border text-foreground-muted'
                                    }`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Affected Products (comma-separated)</label>
                        <input value={affectedProducts} onChange={e => setAffectedProducts(e.target.value)}
                            className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Recommended Actions (one per line)</label>
                        <textarea value={recommendedActions} onChange={e => setRecommendedActions(e.target.value)} rows={3}
                            className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Related CVEs (comma-separated)</label>
                        <input value={relatedCves} onChange={e => setRelatedCves(e.target.value)} placeholder="CVE-2026-1234"
                            className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none" />
                    </div>
                    {error && <p className="text-[11px] text-red-500">{error}</p>}
                    <div className="flex gap-2 pt-2">
                        <button onClick={onClose} className="flex-1 py-2 border border-border text-foreground-muted text-xs font-bold rounded-lg">Cancel</button>
                        <button onClick={submit} disabled={submitting}
                            className="flex-1 py-2 bg-red hover:bg-red-hover disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                            {submitting ? 'Publishing…' : 'Publish'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdvisoryPage() {
    const [ctipStats, setCtipStats] = useState<CtipStats | null>(null);
    const [advisories, setAdvisories] = useState<Advisory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isPortal, setIsPortal] = useState(false);

    useEffect(() => {
        setIsPortal(getPortalContext().isPortal);
    }, []);

    useEffect(() => {
        fetch(apiUrl('/api/threat-intel/stats'))
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((data: CtipStats) => setCtipStats(data))
            .catch(() => setCtipStats(null));
    }, []);

    useEffect(() => {
        const industry = getPortalContext().orgIndustry;
        fetch(apiUrl(`/api/advisories${industry ? `?industry=${encodeURIComponent(industry)}` : ''}`), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setAdvisories(Array.isArray(data?.advisories) ? data.advisories : []))
            .catch(() => setAdvisories([]))
            .finally(() => setLoading(false));
    }, []);

    const sevCounts = ['Critical', 'High', 'Medium', 'Low'].map(sev => ({
        sev, count: advisories.filter(a => a.severity === sev).length,
    })).filter(s => s.count > 0);

    return (
        <PageLayout title="Threat Advisory">
            <div className="space-y-4">
                {ctipStats && ctipStats.total_iocs > 0 && (
                    <div className="bg-card rounded-xl border border-border p-4 mb-6 flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="w-2 h-2 rounded-full bg-green animate-pulse inline-block" />
                            <span className="text-xs text-green font-medium">CTIP Live</span>
                        </div>
                        <p className="text-xs text-foreground-muted">
                            Live Intel:{' '}
                            <span className="font-bold text-green">{ctipStats.iocs_last_24h.toLocaleString()}</span>
                            {' '}new IOCs tracked in the last 24 hours across{' '}
                            <span className="font-bold text-green">{ctipStats.sources_active}</span>
                            {' '}active sources —{' '}
                            <span className="font-bold text-green">{ctipStats.total_iocs.toLocaleString()}</span>
                            {' '}total indicators in database
                        </p>
                    </div>
                )}

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">Threat Advisory</h1>
                        <p className="text-xs text-foreground-muted">Threat Intelligence · Advisories published by the Cybernovr SOC team</p>
                    </div>
                    {!loading && advisories.length > 0 && !isPortal && (
                        <button onClick={() => setShowModal(true)}
                            className="text-xs font-bold px-3 py-2 bg-red hover:bg-red-hover text-white rounded-lg transition-colors whitespace-nowrap">
                            + Publish Advisory
                        </button>
                    )}
                </div>

                {!loading && sevCounts.length > 0 && (
                    <div className="flex items-center gap-3">
                        {sevCounts.map(({ sev, count }) => (
                            <div key={sev} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold ${SEV_BADGE[sev]}`}>
                                <span>{sev}</span><span className="font-black">{count}</span>
                            </div>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : advisories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-card border border-border rounded-xl">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground-muted mb-4">
                            <path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 8h8M8 12h8M8 16h4" strokeLinecap="round" />
                        </svg>
                        <h3 className="text-sm font-bold text-foreground mb-1">No Advisories Published Yet</h3>
                        <p className="text-xs text-foreground-muted max-w-sm mb-4">
                            The Cybernovr SOC team publishes advisories when new threats are identified. Check back soon.
                        </p>
                        {!isPortal && (
                            <button onClick={() => setShowModal(true)}
                                className="text-xs font-bold px-4 py-2 bg-red hover:bg-red-hover text-white rounded-lg transition-colors">
                                + Publish Advisory
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {advisories.map(a => (
                            <div key={a.id} className={`border-l-4 ${SEV_STYLE[a.severity] ?? SEV_STYLE.Medium} rounded-r-xl p-4 border border-border border-l-4`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${SEV_BADGE[a.severity] ?? SEV_BADGE.Medium}`}>{a.severity}</span>
                                            <span className="text-[10px] text-foreground-muted">· {sourceDisplayName(a.source)}</span>
                                            <span className="text-[10px] text-foreground-muted">· {timeAgo(a.published_at)}</span>
                                        </div>
                                        <h3 className="text-sm font-black text-foreground mb-1">{a.title}</h3>
                                        {a.summary && <p className="text-[11px] text-foreground-muted leading-relaxed mb-2">{a.summary}</p>}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {a.sectors && a.sectors.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] font-bold text-foreground-muted uppercase">Sectors:</span>
                                                    {a.sectors.map(s => <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 bg-card-muted text-foreground-muted rounded">{s}</span>)}
                                                </div>
                                            )}
                                            {a.recommended_actions && a.recommended_actions.length > 0 && (
                                                <span className="text-[9px] font-bold text-green">→ {a.recommended_actions[0]}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <PublishModal
                    onClose={() => setShowModal(false)}
                    onPublished={(a) => { setAdvisories(prev => [a, ...prev]); setShowModal(false); }}
                />
            )}
        </PageLayout>
    );
}
