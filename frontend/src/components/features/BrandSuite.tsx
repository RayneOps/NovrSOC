'use client';

import { useEffect, useState } from 'react';
import { Shield, Pencil, X, Upload, Search, ExternalLink, CheckCircle, AlertTriangle, History, FileText } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { ExportButton } from '@/components/shared/ExportButton';

// Mock brand-wide violation report — a real report generator (aggregating scan history +
// takedown status) is a later pass; this shows the shape/UX of what it will look like.
const MOCK_BRAND_REPORT = {
    brand_name: 'Cybernovr',
    generated_at: '2026-08-16',
    period: 'Last 30 days',
    summary: {
        violations_found: 3,
        counterfeit_sites: 1,
        phishing_pages: 2,
        logo_misuse: 0,
        domains_monitored: 2,
        web_scans_run: 47,
    },
    violations: [
        {
            id: 'viol_001',
            type: 'PHISHING' as const,
            url: 'https://cybernovr-login-secure.ru/verify',
            title: 'Fake Cybernovr Login Page',
            detected: '2026-08-12',
            severity: 'CRITICAL' as const,
            status: 'active',
            threat_score: 94,
            description: 'Page mimics Cybernovr login portal. Collects credentials.',
        },
        {
            id: 'viol_002',
            type: 'COUNTERFEIT' as const,
            url: 'https://cybernovr-africa.com/products',
            title: 'Unauthorized Reseller Site',
            detected: '2026-08-10',
            severity: 'HIGH' as const,
            status: 'active',
            threat_score: 72,
            description: 'Site claims to sell Cybernovr products without authorization.',
        },
        {
            id: 'viol_003',
            type: 'IMPERSONATION' as const,
            url: 'https://cybernovr-ng.blogspot.com',
            title: 'Brand Impersonation Blog',
            detected: '2026-08-08',
            severity: 'MEDIUM' as const,
            status: 'under_review',
            threat_score: 45,
            description: 'Blog claims to be official Cybernovr Nigeria updates.',
        },
    ],
};

const BRAND_SEVERITY_STYLE: Record<string, string> = {
    CRITICAL: 'bg-red-500 text-white',
    HIGH: 'border border-red-500 text-red-500',
    MEDIUM: 'border border-amber text-amber',
};

// Violations per week, for the report's trend chart — 30 days of MOCK_BRAND_REPORT's data.
const BRAND_VIOLATION_TREND = [
    { week: 'Jul 21', count: 0 },
    { week: 'Jul 28', count: 0 },
    { week: 'Aug 4', count: 1 },
    { week: 'Aug 11', count: 2 },
];

interface BrandAssets {
    official_domain: string;
    brand_name: string;
    trademark_keywords: string[];
    logo_uploaded: boolean;
    logo_filename: string | null;
    capabilities: { vision: boolean; web_search: boolean };
}

interface SearchHit {
    id?: string;
    type?: 'PHISHING' | 'COUNTERFEIT' | 'IMPERSONATION';
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    title: string;
    url: string;
    snippet: string;
    domain: string;
    detected?: string;
    status?: string;
    threat_score?: number;
    evidence?: string[];
}

interface ScanRecord {
    ran_at: string;
    pages_checked: number;
    violations_found: number;
}

// Pre-seeded so the Scan History tab isn't empty before the user has run a scan this session.
const SEED_SCAN_HISTORY: ScanRecord[] = [
    { ran_at: '2026-08-16T06:00:00.000Z', pages_checked: 847, violations_found: 3 },
    { ran_at: '2026-08-09T06:00:00.000Z', pages_checked: 812, violations_found: 2 },
    { ran_at: '2026-08-02T06:00:00.000Z', pages_checked: 799, violations_found: 0 },
    { ran_at: '2026-07-26T06:00:00.000Z', pages_checked: 834, violations_found: 1 },
];

const TABS = [
    { id: 'violations', label: 'Web Scan Results' },
    { id: 'history', label: 'Scan History' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function BrandSuite() {
    const [assets, setAssets] = useState<BrandAssets | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('violations');

    const [showEditModal, setShowEditModal] = useState(false);
    const [domainInput, setDomainInput] = useState('');
    const [brandNameInput, setBrandNameInput] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const [scanning, setScanning] = useState(false);
    const [configured, setConfigured] = useState(true);
    const [violations, setViolations] = useState<SearchHit[]>([]);
    const [scanHistory, setScanHistory] = useState<ScanRecord[]>(SEED_SCAN_HISTORY);
    const [showBrandReport, setShowBrandReport] = useState(false);

    const scanFor = async (brandName: string, officialDomain: string) => {
        setScanning(true);
        try {
            const res = await fetch(apiUrl('/api/brand/search'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand_name: brandName, official_domains: [officialDomain], search_type: 'counterfeit' }),
            });
            const data = await res.json();
            setConfigured(data?.configured !== false);
            setViolations(Array.isArray(data?.results) ? data.results : []);
            setScanHistory((prev) => [{ ran_at: new Date().toISOString(), pages_checked: data?.total_results ?? data?.results?.length ?? 0, violations_found: data?.results?.length ?? 0 }, ...prev]);
        } finally {
            setScanning(false);
        }
    };

    const load = () => {
        setLoading(true);
        fetch(apiUrl('/api/brand/assets'), { cache: 'no-store' })
            .then((r) => r.json())
            .then((data: BrandAssets) => {
                setAssets(data);
                setDomainInput(data.official_domain);
                setBrandNameInput(data.brand_name);
                setKeywords(data.trademark_keywords ?? []);
                // Show violations immediately on page load, not just after a manual scan.
                scanFor(data.brand_name, data.official_domain);
            })
            .catch(() => setAssets(null))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const addKeyword = () => {
        const v = keywordInput.trim().toLowerCase();
        if (v && !keywords.includes(v)) setKeywords([...keywords, v]);
        setKeywordInput('');
    };

    const saveAssets = async () => {
        setSaving(true);
        try {
            const res = await fetch(apiUrl('/api/brand/assets'), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ official_domain: domainInput.trim(), brand_name: brandNameInput.trim(), trademark_keywords: keywords }),
            });
            const data = await res.json();
            setAssets((prev) => (prev ? { ...prev, ...data } : prev));
            setShowEditModal(false);
        } finally {
            setSaving(false);
        }
    };

    const uploadLogo = async (file: File) => {
        await fetch(apiUrl('/api/brand/assets/logo'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name }),
        });
        load();
    };

    const runWebScan = async () => {
        if (!assets) return;
        await scanFor(assets.brand_name, assets.official_domain);
        setTab('violations');
    };

    if (loading || !assets) {
        return (
            <div className="space-y-4">
                <div>
                    <h1 className="text-lg font-black text-foreground">Brand Suite</h1>
                    <p className="text-xs text-foreground-muted">Brand Protection · Logo misuse, counterfeit sites, and trademark infringement</p>
                </div>
                <div className="h-40 bg-card-muted rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <div id="report-content" className="space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-lg font-black text-foreground">Brand Suite</h1>
                    <p className="text-xs text-foreground-muted">Brand Protection · Logo misuse, counterfeit sites, and trademark infringement</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButton elementId="report-content" filename="brand-suite" title="Brand Suite" />
                    <button
                        onClick={() => setShowBrandReport(true)}
                        className="flex items-center gap-2 border border-purple text-purple hover:bg-purple/5 text-xs font-black px-4 py-2.5 rounded-lg transition-colors flex-shrink-0"
                    >
                        <FileText size={14} />
                        View Brand Report
                    </button>
                </div>
            </div>

            {/* Brand Assets panel */}
            <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-black text-foreground">Your Brand Assets</p>
                    <button onClick={() => setShowEditModal(true)} className="flex items-center gap-1.5 text-[11px] font-bold text-blue hover:underline">
                        <Pencil size={12} /> Edit Assets
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-foreground-muted">Official Domain</span>
                        <span className="font-bold text-foreground flex items-center gap-1">{assets.official_domain} <CheckCircle size={12} className="text-blue" /></span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-foreground-muted">Brand Name</span>
                        <span className="font-bold text-foreground flex items-center gap-1">{assets.brand_name} <CheckCircle size={12} className="text-blue" /></span>
                    </div>
                    <div className="sm:col-span-2 flex items-start justify-between border-b border-border pb-2 gap-3">
                        <span className="text-foreground-muted flex-shrink-0">Trademark Keywords</span>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                            {assets.trademark_keywords.map((k) => (
                                <span key={k} className="text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground rounded-full">{k}</span>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-foreground-muted">Logo</span>
                        {assets.logo_uploaded ? (
                            <span className="font-bold text-foreground flex items-center gap-1">{assets.logo_filename} <CheckCircle size={12} className="text-blue" /></span>
                        ) : (
                            <label className="text-[11px] font-bold text-blue hover:underline cursor-pointer flex items-center gap-1">
                                <Upload size={12} /> Upload Logo
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                            </label>
                        )}
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-foreground-muted">Visual Analysis Engine</span>
                        <span className={`text-[11px] font-bold flex items-center gap-1 ${assets.capabilities.vision ? 'text-blue' : 'text-amber'}`}>
                            {assets.capabilities.vision ? <><CheckCircle size={12} /> Active</> : <><AlertTriangle size={12} /> Not active (billing required)</>}
                        </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-foreground-muted">Web Scanner</span>
                        <span className={`text-[11px] font-bold flex items-center gap-1 ${assets.capabilities.web_search ? 'text-blue' : 'text-amber'}`}>
                            {assets.capabilities.web_search ? <><CheckCircle size={12} /> Web Intelligence Engine active</> : <><AlertTriangle size={12} /> Demo mode — not yet configured</>}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-1">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${tab === t.id ? 'border-blue text-blue' : 'border-transparent text-foreground-muted hover:text-foreground'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={runWebScan}
                    disabled={scanning}
                    className="mb-2 flex items-center gap-2 bg-amber hover:opacity-90 disabled:opacity-60 text-white text-xs font-black px-4 py-2 rounded-lg transition-colors"
                >
                    <Search size={12} className={scanning ? 'animate-pulse' : ''} />
                    {scanning ? 'Scanning…' : 'Run Web Scan'}
                </button>
            </div>

            {tab === 'violations' && (
                <div className="space-y-3">
                    {!configured && violations.length > 0 && (
                        <p className="text-[11px] text-amber">Demo data — Web Intelligence Engine not yet configured for live results.</p>
                    )}

                    {/* Scan stats summary */}
                    {scanHistory.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-card border border-border rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-foreground">{scanHistory[0].pages_checked}</p>
                                <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Pages Checked</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-red-500">{violations.length}</p>
                                <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Violations Found</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-purple">{violations.filter((v) => v.severity === 'CRITICAL').length}</p>
                                <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Critical</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-blue">{new Date(scanHistory[0].ran_at).toLocaleDateString()}</p>
                                <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Last Scan</p>
                            </div>
                        </div>
                    )}

                    {violations.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl py-12 text-center">
                            <Shield className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
                            <p className="text-xs text-foreground-muted">No violations found yet. Run a web scan to check for counterfeit sites and brand misuse.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {violations.map((v, i) => (
                                <div key={v.id ?? i} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                                    <div className="w-14 h-14 rounded-lg bg-card-muted flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-foreground truncate">{v.title}</p>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${BRAND_SEVERITY_STYLE[v.severity ?? 'MEDIUM'] ?? 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                                                {v.type ?? 'COUNTERFEIT'}
                                            </span>
                                            {v.threat_score !== undefined && (
                                                <span className="text-[9px] font-bold text-foreground-muted">Threat score: {v.threat_score}</span>
                                            )}
                                        </div>
                                        <a href={v.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue hover:underline flex items-center gap-1 mt-0.5">
                                            {v.domain} <ExternalLink size={10} />
                                        </a>
                                        <p className="text-xs text-foreground-muted mt-1.5">{v.snippet}</p>
                                        {v.evidence && v.evidence.length > 0 && (
                                            <ul className="mt-1.5 space-y-0.5">
                                                {v.evidence.map((e, ei) => (
                                                    <li key={ei} className="text-[10px] text-foreground-muted flex items-start gap-1">
                                                        <span className="text-foreground-muted/60">•</span> {e}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <div className="flex items-center gap-3 mt-2">
                                            <button className="text-[10px] font-bold text-blue hover:underline">View Page</button>
                                            <button className="text-[10px] font-bold text-red-500 hover:underline">Report</button>
                                            <button className="text-[10px] font-bold text-foreground-muted hover:text-foreground">Mark Safe</button>
                                            <button className="text-[10px] font-bold text-foreground-muted hover:text-foreground">Escalate</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'history' && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {scanHistory.length === 0 ? (
                        <p className="text-xs text-foreground-muted text-center py-10">No scans run yet this session.</p>
                    ) : (
                        <div className="divide-y divide-border">
                            {scanHistory.map((s, i) => (
                                <div key={i} className="p-3 flex items-center gap-3">
                                    <History size={14} className="text-foreground-muted flex-shrink-0" />
                                    <div className="flex-1 text-xs">
                                        <p className="text-foreground font-semibold">{new Date(s.ran_at).toLocaleString()}</p>
                                        <p className="text-foreground-muted">{s.pages_checked} pages checked · {s.violations_found} violations found</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="font-heading font-bold text-lg text-foreground mb-4">Edit Brand Assets</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Official Domain</label>
                                <input type="text" value={domainInput} onChange={(e) => setDomainInput(e.target.value)}
                                    className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-blue" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Brand Name</label>
                                <input type="text" value={brandNameInput} onChange={(e) => setBrandNameInput(e.target.value)}
                                    className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-blue" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Trademark Keywords</label>
                                <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1.5">
                                    {keywords.map((k) => (
                                        <span key={k} className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground rounded-full">
                                            {k}
                                            <button onClick={() => setKeywords(keywords.filter((x) => x !== k))}><X size={10} /></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                                        placeholder="novr" className="flex-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-blue" />
                                    <button onClick={addKeyword} className="text-xs font-bold text-blue px-2">+ Add</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Logo</label>
                                <label className="mt-1 flex items-center justify-center gap-2 border border-dashed border-border rounded-lg py-4 text-xs text-foreground-muted cursor-pointer hover:border-blue">
                                    <Upload size={14} /> {assets.logo_uploaded ? assets.logo_filename : 'Choose File — drag & drop or click'}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 border border-border text-foreground-muted py-2.5 rounded-lg text-sm hover:border-grey-300 transition-colors">Cancel</button>
                            <button onClick={saveAssets} disabled={saving} className="flex-1 bg-orange hover:bg-orange-hover disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">
                                {saving ? 'Saving…' : 'Save Assets'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBrandReport && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-1">
                                <div>
                                    <h3 className="font-heading font-bold text-lg text-foreground">{MOCK_BRAND_REPORT.brand_name} Brand Report</h3>
                                    <p className="text-[11px] text-foreground-muted">Generated: {MOCK_BRAND_REPORT.generated_at} · {MOCK_BRAND_REPORT.period}</p>
                                </div>
                                <button onClick={() => setShowBrandReport(false)} className="text-foreground-muted hover:text-foreground" aria-label="Close report">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Summary KPIs */}
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Violations Found</p>
                                    <p className="text-xl font-black text-red-500">{MOCK_BRAND_REPORT.summary.violations_found}</p>
                                </div>
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Counterfeit Sites</p>
                                    <p className="text-xl font-black text-orange">{MOCK_BRAND_REPORT.summary.counterfeit_sites}</p>
                                </div>
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Phishing Pages</p>
                                    <p className="text-xl font-black text-red-500">{MOCK_BRAND_REPORT.summary.phishing_pages}</p>
                                </div>
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Logo Misuse</p>
                                    <p className="text-xl font-black text-blue">{MOCK_BRAND_REPORT.summary.logo_misuse}</p>
                                </div>
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Domains Monitored</p>
                                    <p className="text-xl font-black text-purple">{MOCK_BRAND_REPORT.summary.domains_monitored}</p>
                                </div>
                                <div className="border border-border rounded-lg p-3">
                                    <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Web Scans Run</p>
                                    <p className="text-xl font-black text-foreground">{MOCK_BRAND_REPORT.summary.web_scans_run}</p>
                                </div>
                            </div>

                            {/* Trend chart */}
                            <div className="mt-5">
                                <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wide mb-2">Violations Per Week</p>
                                <div className="flex items-end gap-3 h-20 border border-border rounded-lg p-3">
                                    {BRAND_VIOLATION_TREND.map((w) => (
                                        <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                                            <div
                                                className="w-full bg-purple rounded-t"
                                                style={{ height: `${Math.max(4, (w.count / 2) * 100)}%` }}
                                            />
                                            <span className="text-[9px] text-foreground-muted">{w.week}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Violations table */}
                            <div className="mt-5">
                                <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wide mb-2">Violations ({MOCK_BRAND_REPORT.violations.length})</p>
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-border">
                                                {['Severity', 'Type', 'URL', 'Detected', 'Action'].map((h) => (
                                                    <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {MOCK_BRAND_REPORT.violations.map((v) => (
                                                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-card-muted">
                                                    <td className="px-3 py-2">
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${BRAND_SEVERITY_STYLE[v.severity]}`}>{v.severity}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-foreground-muted">{v.type}</td>
                                                    <td className="px-3 py-2 max-w-[180px]">
                                                        <a href={v.url} target="_blank" rel="noreferrer" className="text-blue hover:underline truncate block" title={v.title}>{v.url}</a>
                                                    </td>
                                                    <td className="px-3 py-2 text-foreground-muted whitespace-nowrap">{v.detected}</td>
                                                    <td className="px-3 py-2">
                                                        <button className="text-[10px] font-bold text-red-500 hover:underline whitespace-nowrap">Takedown Request</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
