'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Search, AlertTriangle, CheckCircle, RefreshCw, ExternalLink,
    Activity, Zap, Globe, Hash, Link as LinkIcon, Monitor,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiUrl } from '@/lib/api';

type IOCType = 'ip' | 'domain' | 'hash' | 'url';
type Verdict = 'clean' | 'suspicious' | 'malicious';

interface IOCResult {
    value: string;
    type: IOCType;
    risk_score: number;
    verdict: Verdict;
    sources: {
        otx: { pulse_count: number; tags: string[]; mitre_techniques: string[] } | null;
        abuseipdb: { confidence: number; total_reports: number; country: string | null; isp: string | null; is_tor: boolean } | null;
        urlhaus: { status: string; threat: string; tags: string[] } | null;
        threatfox: { malware: string; confidence: number; threat_type: string } | null;
        virustotal: { malicious: number; suspicious: number; total_engines: number; verdict: string; as_owner: string | undefined; tags: string[] } | null;
    };
    tags: string[];
    enriched_at: string;
    note?: string;
}

interface FeedIOC {
    ioc_value: string;
    ioc_type: IOCType;
    risk_score: number;
    country_code: string | null;
    isp: string | null;
    is_tor: boolean;
    tags: string[];
    last_seen: string;
}

interface OTXPulse {
    id: string;
    name: string;
    description: string;
    tags: string[];
    created: string;
}

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; bg: string; icon: LucideIcon }> = {
    malicious: { label: 'MALICIOUS', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', icon: AlertTriangle },
    suspicious: { label: 'SUSPICIOUS', color: 'text-amber', bg: 'bg-grey-100 border-amber/30', icon: AlertTriangle },
    clean: { label: 'CLEAN', color: 'text-green', bg: 'bg-green/10 border-green/30', icon: CheckCircle },
};

const TYPE_ICONS: Record<IOCType, LucideIcon> = { ip: Globe, domain: Monitor, hash: Hash, url: LinkIcon };

const IOC_TYPES: { value: IOCType; label: string; placeholder: string }[] = [
    { value: 'ip', label: 'IP Address', placeholder: '185.220.101.47' },
    { value: 'domain', label: 'Domain', placeholder: 'suspicious-domain.com' },
    { value: 'hash', label: 'File Hash', placeholder: 'MD5 or SHA256 hash' },
    { value: 'url', label: 'URL', placeholder: 'https://suspicious-link.com/malware.exe' },
];

const TABS = [
    { id: 'search', label: 'IOC Search' },
    { id: 'feed', label: 'Live IOC Feed' },
    { id: 'pulses', label: 'OTX Pulses' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function scoreColor(score: number): string {
    return score >= 70 ? 'text-red-500' : score >= 30 ? 'text-amber' : 'text-green';
}
function scoreBg(score: number): string {
    return score >= 70 ? 'bg-red-500' : score >= 30 ? 'bg-amber' : 'bg-green';
}

export function CtiPlatform() {
    const [iocValue, setIocValue] = useState('');
    const [iocType, setIocType] = useState<IOCType>('ip');
    const [result, setResult] = useState<IOCResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feed, setFeed] = useState<FeedIOC[]>([]);
    const [feedFilter, setFeedFilter] = useState<IOCType | 'all'>('all');
    const [activeTab, setActiveTab] = useState<Tab>('search');
    const [pulses, setPulses] = useState<OTXPulse[]>([]);
    const [pulsesLoading, setPulsesLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, malicious: 0, suspicious: 0, clean: 0 });
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-detect IOC type as user types
    const detectType = (value: string): IOCType => {
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'ip';
        if (/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{64}$/.test(value)) return 'hash';
        if (/^https?:\/\//.test(value)) return 'url';
        if (/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}\.[a-zA-Z]{2,}/.test(value)) return 'domain';
        return iocType;
    };

    const handleInput = (val: string) => {
        setIocValue(val);
        setIocType(detectType(val.trim()));
    };

    const loadFeed = () => {
        const params = new URLSearchParams({ limit: '50' });
        if (feedFilter !== 'all') params.set('type', feedFilter);
        fetch(apiUrl(`/api/cti/feed?${params}`), { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => setFeed(Array.isArray(data?.iocs) ? data.iocs : []))
            .catch(() => setFeed([]));
    };

    const loadStats = () => {
        fetch(apiUrl('/api/cti/stats'), { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => setStats({ total: data.total ?? 0, malicious: data.malicious ?? 0, suspicious: data.suspicious ?? 0, clean: data.clean ?? 0 }))
            .catch(() => {});
    };

    const loadPulses = () => {
        setPulsesLoading(true);
        fetch(apiUrl('/api/cti/pulses?limit=20'), { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => setPulses(Array.isArray(data?.pulses) ? data.pulses : []))
            .catch(() => setPulses([]))
            .finally(() => setPulsesLoading(false));
    };

    const lookup = async () => {
        const trimmed = iocValue.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch(apiUrl('/api/cti/lookup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: trimmed, type: iocType }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setResult(data);
            loadFeed();
            loadStats();
        } catch {
            setError('Lookup failed — check your connection or try again');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFeed();
        loadStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedFilter]);

    useEffect(() => {
        if (activeTab === 'pulses' && pulses.length === 0 && !pulsesLoading) loadPulses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-lg font-black text-foreground">CTI Platform</h1>
                    <p className="text-xs text-foreground-muted">Threat Intelligence · Search and correlate IOCs across OTX, AbuseIPDB, URLHaus, and ThreatFox</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground-muted">
                    <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
                    4 threat feeds active
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Total IOCs', value: stats.total, border: 'border-t-blue' },
                    { label: 'Malicious', value: stats.malicious, border: 'border-t-red-500' },
                    { label: 'Suspicious', value: stats.suspicious, border: 'border-t-amber' },
                    { label: 'Clean', value: stats.clean, border: 'border-t-green' },
                ].map((stat) => (
                    <div key={stat.label} className={`bg-card border border-border rounded-xl p-4 border-t-4 ${stat.border}`}>
                        <div className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">{stat.label}</div>
                        <div className="font-heading font-black text-2xl text-foreground">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                            activeTab === tab.id ? 'border-blue text-blue' : 'border-transparent text-foreground-muted hover:text-foreground'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── SEARCH TAB ── */}
            {activeTab === 'search' && (
                <div className="space-y-4">
                    {/* Search bar */}
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Type selector */}
                            <div className="flex gap-1 bg-card-muted rounded-lg p-1 overflow-x-auto">
                                {IOC_TYPES.map((t) => {
                                    const Icon = TYPE_ICONS[t.value];
                                    return (
                                        <button
                                            key={t.value}
                                            onClick={() => setIocType(t.value)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                                                iocType === t.value ? 'bg-card text-blue shadow-sm border border-border' : 'text-foreground-muted hover:text-foreground'
                                            }`}
                                        >
                                            <Icon size={13} />
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Input */}
                            <div className="flex-1 relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={iocValue}
                                    onChange={(e) => handleInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && lookup()}
                                    placeholder={IOC_TYPES.find((t) => t.value === iocType)?.placeholder}
                                    className="w-full pl-9 pr-4 py-2 border border-border bg-card-muted rounded-lg text-sm focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20 font-mono text-foreground placeholder:font-sans placeholder:text-foreground-muted"
                                />
                            </div>

                            {/* Search button */}
                            <button
                                onClick={lookup}
                                disabled={loading || !iocValue.trim()}
                                className="flex items-center gap-2 bg-orange hover:bg-orange-hover text-white px-5 py-2 rounded-lg text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[100px] justify-center"
                            >
                                {loading ? (<><RefreshCw size={14} className="animate-spin" /> Scanning…</>) : (<><Search size={14} /> Lookup</>)}
                            </button>
                        </div>

                        {iocValue && (
                            <div className="mt-2 text-xs text-foreground-muted">
                                Detected type: <span className="text-blue font-medium">{iocType.toUpperCase()}</span> · Press Enter or click Lookup
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-500">{error}</div>
                    )}

                    {result && (() => {
                        const cfg = VERDICT_CONFIG[result.verdict];
                        const VerdictIcon = cfg.icon;
                        return (
                            <div className={`border rounded-xl overflow-hidden ${cfg.bg}`}>
                                <div className="p-5 border-b border-border">
                                    <div className="flex items-start justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-3">
                                            <VerdictIcon size={24} className={cfg.color} />
                                            <div>
                                                <div className="font-mono font-bold text-lg text-foreground break-all">{result.value}</div>
                                                <div className="text-xs text-foreground-muted mt-0.5">
                                                    {result.type.toUpperCase()} · Enriched {new Date(result.enriched_at).toLocaleString()}
                                                    {result.note ? ` · ${result.note}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-heading font-black text-3xl ${scoreColor(result.risk_score)}`}>
                                                {result.risk_score}<span className="text-lg font-normal text-foreground-muted">/100</span>
                                            </div>
                                            <div className={`text-sm font-bold mt-0.5 ${cfg.color}`}>{cfg.label}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 h-2 bg-card-muted rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-700 ${scoreBg(result.risk_score)}`} style={{ width: `${result.risk_score}%` }} />
                                    </div>

                                    {result.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {result.tags.slice(0, 10).map((tag) => (
                                                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 bg-card border border-border rounded-full text-foreground">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Source breakdown */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-x divide-y divide-border">
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-purple" />
                                            <span className="text-xs font-semibold text-foreground">AlienVault OTX</span>
                                        </div>
                                        {result.sources.otx ? (
                                            <>
                                                <div className="text-sm font-bold text-foreground">{result.sources.otx.pulse_count} threat pulses</div>
                                                {result.sources.otx.mitre_techniques.length > 0 && (
                                                    <div className="text-xs text-foreground-muted mt-1">MITRE: {result.sources.otx.mitre_techniques.slice(0, 3).join(', ')}</div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-xs text-foreground-muted">No pulse data</div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span className="text-xs font-semibold text-foreground">AbuseIPDB</span>
                                        </div>
                                        {result.sources.abuseipdb ? (
                                            <>
                                                <div className="text-sm font-bold text-foreground">{result.sources.abuseipdb.confidence}% confidence</div>
                                                <div className="text-xs text-foreground-muted mt-1">{result.sources.abuseipdb.total_reports} reports · {result.sources.abuseipdb.country ?? 'Unknown'}</div>
                                                {result.sources.abuseipdb.is_tor && (
                                                    <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded mt-1 inline-block">TOR EXIT NODE</span>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-xs text-foreground-muted">{result.type !== 'ip' ? 'IP-only service' : 'No data'}</div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-blue" />
                                            <span className="text-xs font-semibold text-foreground">VirusTotal</span>
                                        </div>
                                        {result.sources.virustotal ? (
                                            <>
                                                <div className="text-sm font-bold text-foreground">{result.sources.virustotal.malicious}/{result.sources.virustotal.total_engines} engines flagged</div>
                                                <div className="w-full h-1.5 bg-card-muted rounded-full mt-2 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-red-500 transition-all duration-700"
                                                        style={{ width: `${(result.sources.virustotal.malicious / Math.max(1, result.sources.virustotal.total_engines)) * 100}%` }}
                                                    />
                                                </div>
                                                <div className={`text-xs font-semibold mt-1 ${
                                                    result.sources.virustotal.verdict === 'malicious' ? 'text-red-500' :
                                                    result.sources.virustotal.verdict === 'suspicious' ? 'text-amber' : 'text-green'
                                                }`}>
                                                    {result.sources.virustotal.verdict.toUpperCase()}
                                                </div>
                                                {result.sources.virustotal.as_owner && (
                                                    <div className="text-xs text-foreground-muted mt-1">{result.sources.virustotal.as_owner}</div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-xs text-foreground-muted">Not found in VirusTotal</div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-amber" />
                                            <span className="text-xs font-semibold text-foreground">URLHaus</span>
                                        </div>
                                        {result.sources.urlhaus ? (
                                            <>
                                                <div className="text-sm font-bold text-foreground">{result.sources.urlhaus.threat || 'Known malicious'}</div>
                                                <div className="text-xs text-foreground-muted mt-1">Status: {result.sources.urlhaus.status}</div>
                                            </>
                                        ) : (
                                            <div className="text-xs text-foreground-muted">Not in URLHaus database</div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-blue" />
                                            <span className="text-xs font-semibold text-foreground">ThreatFox</span>
                                        </div>
                                        {result.sources.threatfox ? (
                                            <>
                                                <div className="text-sm font-bold text-foreground">{result.sources.threatfox.malware}</div>
                                                <div className="text-xs text-foreground-muted mt-1">{result.sources.threatfox.threat_type} · {result.sources.threatfox.confidence}% confidence</div>
                                            </>
                                        ) : (
                                            <div className="text-xs text-foreground-muted">Not in ThreatFox database</div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="px-5 py-3 bg-card/60 flex flex-wrap gap-3 border-t border-border">
                                    <button className="text-xs text-blue hover:text-purple font-medium transition-colors">+ Add to Blocklist</button>
                                    <button className="text-xs text-blue hover:text-purple font-medium transition-colors">Create Incident</button>
                                    <button className="text-xs text-blue hover:text-purple font-medium transition-colors">Export IOC</button>
                                    <a
                                        href={`https://otx.alienvault.com/indicator/${result.type}/${result.value}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="ml-auto text-xs text-foreground-muted hover:text-blue flex items-center gap-1 transition-colors"
                                    >
                                        View on OTX <ExternalLink size={11} />
                                    </a>
                                </div>
                            </div>
                        );
                    })()}

                    {!result && !loading && !error && (
                        <div className="bg-card border border-border rounded-xl p-12 text-center">
                            <Search size={40} className="text-border mx-auto mb-3" />
                            <div className="font-heading font-semibold text-foreground mb-1">Search any IOC</div>
                            <div className="text-sm text-foreground-muted">Paste an IP address, domain, file hash, or URL above to get an instant threat verdict</div>
                            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-foreground-muted">
                                {['185.220.101.47', 'malware.example.com'].map((ex) => (
                                    <button key={ex} onClick={() => { handleInput(ex); inputRef.current?.focus(); }} className="font-mono hover:text-blue transition-colors">
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── FEED TAB ── */}
            {activeTab === 'feed' && (
                <div>
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="text-xs text-foreground-muted">Filter:</span>
                        {(['all', 'ip', 'domain', 'hash', 'url'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFeedFilter(f)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                    feedFilter === f ? 'bg-blue text-white' : 'bg-card border border-border text-foreground-muted hover:border-grey-300'
                                }`}
                            >
                                {f === 'all' ? 'All' : f.toUpperCase()}
                            </button>
                        ))}
                        <button onClick={loadFeed} className="ml-auto flex items-center gap-1.5 text-xs text-blue">
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>

                    {feed.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-10 text-center">
                            <Activity size={36} className="text-border mx-auto mb-3" />
                            <div className="text-sm text-foreground-muted">No IOCs in feed yet — run your first lookup to populate the feed</div>
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['IOC Value', 'Type', 'Risk Score', 'Country', 'ISP', 'Tags', 'Last Seen'].map((h) => (
                                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {feed.map((ioc) => (
                                        <tr
                                            key={ioc.ioc_value}
                                            className="border-b border-border hover:bg-card-muted cursor-pointer transition-colors"
                                            onClick={() => { setIocValue(ioc.ioc_value); setIocType(ioc.ioc_type); setActiveTab('search'); }}
                                        >
                                            <td className="px-4 py-2.5 font-mono text-foreground max-w-[200px] truncate">{ioc.ioc_value}</td>
                                            <td className="px-4 py-2.5"><span className="text-[10px] font-bold bg-blue/10 text-blue px-2 py-0.5 rounded">{ioc.ioc_type.toUpperCase()}</span></td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-12 h-1.5 bg-card-muted rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${scoreBg(ioc.risk_score)}`} style={{ width: `${ioc.risk_score}%` }} />
                                                    </div>
                                                    <span className={`font-bold ${scoreColor(ioc.risk_score)}`}>{ioc.risk_score}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground-muted">{ioc.country_code || '—'}</td>
                                            <td className="px-4 py-2.5 text-foreground-muted max-w-[120px] truncate">{ioc.isp || '—'}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex gap-1 flex-wrap">
                                                    {(ioc.tags || []).slice(0, 2).map((tag) => (
                                                        <span key={tag} className="text-[10px] bg-card-muted text-foreground-muted px-1.5 py-0.5 rounded">{tag}</span>
                                                    ))}
                                                    {ioc.is_tor && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">TOR</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground-muted whitespace-nowrap">{new Date(ioc.last_seen).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── PULSES TAB ── */}
            {activeTab === 'pulses' && (
                <div className="space-y-3">
                    {pulsesLoading ? (
                        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-card-muted rounded-xl animate-pulse" />)}</div>
                    ) : pulses.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-10 text-center">
                            <Zap size={36} className="text-border mx-auto mb-3" />
                            <div className="text-sm text-foreground-muted">No OTX pulses — subscribe to threat feeds in your OTX account</div>
                            <a href="https://otx.alienvault.com/browse/pulses" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs text-blue hover:text-purple">
                                Browse OTX Pulses <ExternalLink size={11} />
                            </a>
                        </div>
                    ) : (
                        pulses.map((pulse) => (
                            <div key={pulse.id} className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="font-medium text-sm text-foreground">{pulse.name}</div>
                                    <div className="text-xs text-foreground-muted whitespace-nowrap">{new Date(pulse.created).toLocaleDateString()}</div>
                                </div>
                                {pulse.description && <div className="text-xs text-foreground-muted mb-2 line-clamp-2">{pulse.description}</div>}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {pulse.tags?.slice(0, 4).map((tag) => (
                                        <span key={tag} className="text-[10px] bg-purple/10 text-purple px-2 py-0.5 rounded-full">{tag}</span>
                                    ))}
                                    <a href={`https://otx.alienvault.com/pulse/${pulse.id}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-blue flex items-center gap-1 hover:text-purple">
                                        View pulse <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
