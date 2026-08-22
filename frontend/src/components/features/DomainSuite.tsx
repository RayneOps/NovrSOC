'use client';

import { useEffect, useState } from 'react';
import { Globe, Plus, RefreshCw, Trash2, X, Loader2, AlertTriangle } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { ExportButton } from '@/components/shared/ExportButton';

interface DomainAlerts {
    lookalike: boolean;
    dns_change: boolean;
    expiry: boolean;
    new_cert: boolean;
}

interface WhoisInfo {
    registrar: string;
    created: string | null;
    expires: string | null;
    nameservers: string[];
    daysUntilExpiry: number | null;
}

interface CertRow {
    domain: string;
    issuer: string;
    not_before: string;
    not_after: string;
    suspicious: boolean;
}

interface Lookalike {
    domain: string;
    similarity: number;
    risk: 'HIGH' | 'MEDIUM' | 'LOW';
    registered?: string;
}

interface DomainAlertEvent {
    type: string;
    message: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    time: string;
}

interface DnsRecord {
    type: string;
    name: string;
    value: string;
    ttl: number;
}

interface LastScan {
    scanned_at: string;
    whois: WhoisInfo | null;
    ssl_grade: string | null;
    ct_logs: CertRow[];
    lookalikes: Lookalike[];
    dns_records: DnsRecord[];
    email_security: { spf: boolean; dmarc: boolean; dkim: boolean } | null;
    alert_history: DomainAlertEvent[];
}

interface MonitoredDomain {
    id: string;
    domain: string;
    brand_keywords: string[];
    similarity_threshold: number;
    alerts: DomainAlerts;
    status: 'active';
    added_at: string;
    last_scan: LastScan | null;
}

interface ScanResult {
    domain: string;
    scanned_at: string;
    whois: WhoisInfo | null;
    ct_logs: CertRow[];
    lookalikes: Lookalike[];
}

interface DnsResult {
    domain: string;
    records: DnsRecord[];
    email_security: { spf: boolean; dmarc: boolean; dkim: boolean };
    checked_at: string;
}

const RISK_STYLE: Record<Lookalike['risk'], string> = {
    HIGH: 'bg-red-500/10 text-red-500 border-red-500/30',
    MEDIUM: 'bg-grey-100 text-amber border-amber/30',
    LOW: 'bg-card-muted text-foreground-muted border-border',
};

const DNS_TYPES = ['A', 'MX', 'TXT', 'NS'] as const;

// Small ✓/✗ health-strip badge — SPF/DMARC/DKIM/DNSSEC all follow the same shape.
function HealthBadge({ ok, label }: { ok: boolean | null; label: string }) {
    if (ok === null) {
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-card-muted text-foreground-muted border-border">{label}: —</span>;
    }
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ok ? 'bg-blue/10 text-blue border-blue/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
            {ok ? '✓' : '✗'} {label}
        </span>
    );
}

export function DomainSuite() {
    const [domains, setDomains] = useState<MonitoredDomain[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Add-domain form state
    const [domainInput, setDomainInput] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [threshold, setThreshold] = useState(80);
    const [alerts, setAlerts] = useState<DomainAlerts>({ lookalike: true, dns_change: true, expiry: true, new_cert: true });
    const [saving, setSaving] = useState(false);

    // Scan / DNS panel state — live fetches override the pre-seeded last_scan once run.
    const [scanningId, setScanningId] = useState<string | null>(null);
    const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
    const [dnsLoadingId, setDnsLoadingId] = useState<string | null>(null);
    const [dnsResults, setDnsResults] = useState<Record<string, DnsResult>>({});
    // Panels start expanded for every domain — data is shown immediately, no click required.
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [dnsTab, setDnsTab] = useState<(typeof DNS_TYPES)[number]>('A');

    const load = () => {
        setLoading(true);
        fetch(apiUrl('/api/brand/domains'), { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => {
                const list: MonitoredDomain[] = Array.isArray(data?.domains) ? data.domains : [];
                setDomains(list);
                setExpanded(new Set(list.map((d) => d.id)));
            })
            .catch(() => setDomains([]))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const addKeyword = () => {
        const v = keywordInput.trim().toLowerCase();
        if (v && !keywords.includes(v)) setKeywords([...keywords, v]);
        setKeywordInput('');
    };

    const resetForm = () => {
        setDomainInput('');
        setKeywordInput('');
        setKeywords([]);
        setThreshold(80);
        setAlerts({ lookalike: true, dns_change: true, expiry: true, new_cert: true });
    };

    const addDomain = async () => {
        const cleaned = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!cleaned) return;
        setSaving(true);
        try {
            const res = await fetch(apiUrl('/api/brand/domains'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: cleaned, brand_keywords: keywords, similarity_threshold: threshold, alerts }),
            });
            if (res.ok) {
                resetForm();
                setShowAddModal(false);
                load();
            }
        } finally {
            setSaving(false);
        }
    };

    const removeDomain = async (id: string) => {
        await fetch(apiUrl(`/api/brand/domains/${id}`), { method: 'DELETE' });
        setDomains((prev) => prev.filter((d) => d.id !== id));
    };

    const runScan = async (id: string) => {
        setScanningId(id);
        try {
            const res = await fetch(apiUrl(`/api/brand/domains/${id}/scan`));
            const data = await res.json();
            setScanResults((prev) => ({ ...prev, [id]: data }));
            setExpanded((prev) => new Set(prev).add(id));
        } finally {
            setScanningId(null);
        }
    };

    const viewDns = async (id: string) => {
        setDnsLoadingId(id);
        try {
            const res = await fetch(apiUrl(`/api/brand/domains/${id}/dns`));
            const data = await res.json();
            setDnsResults((prev) => ({ ...prev, [id]: data }));
            setExpanded((prev) => new Set(prev).add(id));
        } finally {
            setDnsLoadingId(null);
        }
    };

    const toggleExpanded = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Merge live-fetched results over the pre-seeded last_scan cache — same shape either way.
    const viewFor = (d: MonitoredDomain) => {
        const liveScan = scanResults[d.id];
        const liveDns = dnsResults[d.id];
        return {
            whois: liveScan?.whois ?? d.last_scan?.whois ?? null,
            ct_logs: liveScan?.ct_logs ?? d.last_scan?.ct_logs ?? [],
            lookalikes: liveScan?.lookalikes ?? d.last_scan?.lookalikes ?? [],
            scanned_at: liveScan?.scanned_at ?? d.last_scan?.scanned_at ?? null,
            dns_records: liveDns?.records ?? d.last_scan?.dns_records ?? [],
            email_security: liveDns?.email_security ?? d.last_scan?.email_security ?? null,
            ssl_grade: d.last_scan?.ssl_grade ?? null,
            alert_history: d.last_scan?.alert_history ?? [],
        };
    };

    // Summary bar + top-level alert banner, computed across every monitored domain.
    const allViews = domains.map((d) => ({ domain: d.domain, ...viewFor(d) }));
    const totalLookalikes = allViews.reduce((sum, v) => sum + v.lookalikes.length, 0);
    const suspiciousCerts = allViews.reduce((sum, v) => sum + v.ct_logs.filter((c) => c.suspicious).length, 0);
    const dmarcIssues = allViews.filter((v) => v.email_security && !v.email_security.dmarc).length;
    const highAlerts = allViews.flatMap((v) => v.alert_history.filter((a) => a.severity === 'HIGH').map((a) => ({ ...a, domain: v.domain })));

    return (
        <div id="report-content" className="space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-lg font-black text-foreground">Domain Suite</h1>
                    <p className="text-xs text-foreground-muted">Brand Protection · Typosquatting, DNS hijacking, and unauthorized SSL cert monitoring</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButton elementId="report-content" filename="domain-suite" title="Domain Suite" />
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-orange hover:bg-orange-hover text-white text-xs font-black px-4 py-2.5 rounded-lg transition-colors"
                    >
                        <Plus size={14} />
                        Add Domain
                    </button>
                </div>
            </div>

            {!loading && domains.length > 0 && (
                <>
                    {/* Summary bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-card border border-border rounded-xl p-3 text-center">
                            <p className="text-xl font-black text-foreground">{domains.length}</p>
                            <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Domains Monitored</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-3 text-center">
                            <p className="text-xl font-black text-red-500">{totalLookalikes}</p>
                            <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Lookalikes</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-3 text-center">
                            <p className="text-xl font-black text-amber">{suspiciousCerts}</p>
                            <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Suspicious Certs</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-3 text-center">
                            <p className="text-xl font-black text-purple">{dmarcIssues}</p>
                            <p className="text-[10px] text-foreground-muted uppercase tracking-wide">DMARC Issues</p>
                        </div>
                    </div>

                    {/* Active alert banner */}
                    {highAlerts.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1.5">
                            {highAlerts.map((a, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                    <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-red-500 font-semibold">{a.domain}:</span>
                                    <span className="text-foreground-muted">{a.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {loading ? (
                <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 bg-card-muted rounded-xl animate-pulse" />)}</div>
            ) : domains.length === 0 ? (
                <EmptyState
                    icon={Globe}
                    title="No domains monitored yet"
                    description="Add your brand domain to start monitoring for typosquatting, DNS hijacking, and unauthorized SSL certificates."
                    actionLabel="Add Your First Domain"
                    onAction={() => setShowAddModal(true)}
                />
            ) : (
                <div className="space-y-3">
                    {domains.map((d) => {
                        const view = viewFor(d);
                        const isOpen = expanded.has(d.id);
                        return (
                            <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
                                            <Globe size={18} className="text-blue" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-foreground font-mono truncate">{d.domain}</span>
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-blue">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue" /> Active
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-foreground-muted">
                                                Keywords: {d.brand_keywords.join(', ')} · Threshold {d.similarity_threshold}%
                                                {view.whois?.registrar && ` · ${view.whois.registrar}`}
                                                {view.whois?.expires && ` · Expires ${view.whois.expires.slice(0, 10)}`}
                                            </p>
                                            {/* Health strip */}
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                {view.ssl_grade && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue/10 text-blue border-blue/30">SSL: {view.ssl_grade}</span>
                                                )}
                                                <HealthBadge ok={view.email_security?.spf ?? null} label="SPF" />
                                                <HealthBadge ok={view.email_security?.dmarc ?? null} label="DMARC" />
                                                <HealthBadge ok={view.email_security?.dkim ?? null} label="DKIM" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => runScan(d.id)}
                                            disabled={scanningId === d.id}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-blue rounded-lg px-3 py-1.5 disabled:opacity-50"
                                        >
                                            {scanningId === d.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                            {scanningId === d.id ? 'Scanning…' : 'Run Scan'}
                                        </button>
                                        <button
                                            onClick={() => viewDns(d.id)}
                                            disabled={dnsLoadingId === d.id}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-foreground border border-border rounded-lg px-3 py-1.5 disabled:opacity-50"
                                        >
                                            {dnsLoadingId === d.id && <Loader2 size={12} className="animate-spin" />}
                                            View DNS
                                        </button>
                                        <button
                                            onClick={() => toggleExpanded(d.id)}
                                            className="text-[11px] font-bold text-foreground-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5"
                                        >
                                            {isOpen ? 'Collapse' : 'Expand'}
                                        </button>
                                        <button
                                            onClick={() => removeDomain(d.id)}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-foreground-muted hover:text-red-500 border border-border rounded-lg px-3 py-1.5"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="border-t border-border p-4 space-y-4 bg-card-muted/40">
                                        <div>
                                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">WHOIS</p>
                                            {view.whois ? (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                                                    <div><p className="text-foreground-muted">Registrar</p><p className="font-bold text-foreground">{view.whois.registrar}</p></div>
                                                    <div><p className="text-foreground-muted">Created</p><p className="font-bold text-foreground">{view.whois.created?.slice(0, 10) ?? '—'}</p></div>
                                                    <div><p className="text-foreground-muted">Expires</p><p className="font-bold text-foreground">{view.whois.expires?.slice(0, 10) ?? '—'}</p></div>
                                                    <div>
                                                        <p className="text-foreground-muted">Days Until Expiry</p>
                                                        <p className={`font-bold ${view.whois.daysUntilExpiry !== null && view.whois.daysUntilExpiry < 30 ? 'text-amber' : 'text-foreground'}`}>
                                                            {view.whois.daysUntilExpiry ?? '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-foreground-muted">WHOIS lookup unavailable for this domain. Click Run Scan to check.</p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Certificate Transparency Logs ({view.ct_logs.length})</p>
                                            {view.ct_logs.length === 0 ? (
                                                <p className="text-xs text-foreground-muted">No certificates found in CT logs.</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead><tr className="border-b border-border">
                                                            {['Cert Domain', 'Issuer', 'Not Before', 'Not After'].map((h) => (
                                                                <th key={h} className="text-left px-3 py-1.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                                            ))}
                                                        </tr></thead>
                                                        <tbody>
                                                            {view.ct_logs.map((c, i) => (
                                                                <tr key={i} className="border-b border-border">
                                                                    <td className={`px-3 py-1.5 font-mono ${c.suspicious ? 'text-red-500 font-bold' : 'text-foreground'}`}>
                                                                        {c.suspicious && '⚠ '}{c.domain}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-foreground-muted">{c.issuer}</td>
                                                                    <td className="px-3 py-1.5 text-foreground-muted">{c.not_before?.slice(0, 10)}</td>
                                                                    <td className="px-3 py-1.5 text-foreground-muted">{c.not_after?.slice(0, 10)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Lookalike Domains ({view.lookalikes.length})</p>
                                            {view.lookalikes.length === 0 ? (
                                                <p className="text-xs text-foreground-muted">No lookalikes detected.</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead><tr className="border-b border-border">
                                                            {['Domain', 'Similarity', 'Risk', 'Registered'].map((h) => (
                                                                <th key={h} className="text-left px-3 py-1.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                                            ))}
                                                        </tr></thead>
                                                        <tbody>
                                                            {view.lookalikes.map((l) => (
                                                                <tr key={l.domain} className="border-b border-border">
                                                                    <td className="px-3 py-1.5 font-mono text-foreground">{l.domain}</td>
                                                                    <td className="px-3 py-1.5 text-foreground">{l.similarity}%</td>
                                                                    <td className="px-3 py-1.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${RISK_STYLE[l.risk]}`}>{l.risk}</span></td>
                                                                    <td className="px-3 py-1.5 text-foreground-muted">{l.registered ?? '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {view.alert_history.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Alert History</p>
                                                <div className="space-y-1">
                                                    {view.alert_history.map((a, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-xs">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a.severity === 'HIGH' ? 'bg-red-500 text-white' : 'bg-grey-100 text-amber'}`}>{a.severity}</span>
                                                            <span className="text-foreground-muted">{a.message}</span>
                                                            <span className="text-foreground-muted ml-auto flex-shrink-0">{a.time}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">DNS Records ({view.dns_records.length})</p>
                                            {view.dns_records.length === 0 ? (
                                                <p className="text-xs text-foreground-muted">No DNS records loaded yet. Click View DNS to check live records.</p>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit mb-2">
                                                        {DNS_TYPES.map((t) => (
                                                            <button
                                                                key={t}
                                                                onClick={() => setDnsTab(t)}
                                                                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${dnsTab === t ? 'bg-blue text-white' : 'text-foreground-muted hover:text-foreground'}`}
                                                            >
                                                                {t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {view.dns_records.filter((r) => r.type === dnsTab).length === 0 ? (
                                                        <p className="text-xs text-foreground-muted py-2">No {dnsTab} records found.</p>
                                                    ) : (
                                                        <div className="space-y-1.5">
                                                            {view.dns_records.filter((r) => r.type === dnsTab).map((r, i) => (
                                                                <div key={i} className="flex items-center gap-3 text-xs border-b border-border pb-1.5">
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-card-muted text-foreground-muted rounded">{r.type}</span>
                                                                    <span className="text-foreground-muted">{r.name}</span>
                                                                    <span className="font-mono text-foreground flex-1 truncate">{r.value}</span>
                                                                    <span className="text-foreground-muted">TTL {r.ttl}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {view.scanned_at && (
                                            <p className="text-[10px] text-foreground-muted">Last scanned: {new Date(view.scanned_at).toLocaleString()}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="font-heading font-bold text-lg text-foreground mb-4">Add Domain</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Domain Name</label>
                                <input
                                    type="text"
                                    value={domainInput}
                                    onChange={(e) => setDomainInput(e.target.value)}
                                    placeholder="cybernovr.com"
                                    className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-blue"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Brand Keywords</label>
                                <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1.5">
                                    {keywords.map((k) => (
                                        <span key={k} className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground rounded-full">
                                            {k}
                                            <button onClick={() => setKeywords(keywords.filter((x) => x !== k))}><X size={10} /></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                                        placeholder="cybernovr"
                                        className="flex-1 bg-card-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-blue"
                                    />
                                    <button onClick={addKeyword} className="text-xs font-bold text-blue px-2">+ Add</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Similarity Threshold: {threshold}%</label>
                                <input type="range" min={70} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full mt-1.5" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-1.5 block">Alert On</label>
                                <div className="space-y-1.5">
                                    {([
                                        ['lookalike', 'New lookalike domain registered'],
                                        ['dns_change', 'DNS record changes'],
                                        ['expiry', 'Domain expiring < 30 days'],
                                        ['new_cert', 'New SSL certificate issued'],
                                    ] as const).map(([key, label]) => (
                                        <label key={key} className="flex items-center gap-2 text-xs text-foreground">
                                            <input type="checkbox" checked={alerts[key]} onChange={(e) => setAlerts({ ...alerts, [key]: e.target.checked })} />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1 border border-border text-foreground-muted py-2.5 rounded-lg text-sm hover:border-grey-300 transition-colors">Cancel</button>
                            <button onClick={addDomain} disabled={saving || !domainInput.trim()} className="flex-1 bg-orange hover:bg-orange-hover disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">
                                {saving ? 'Adding…' : 'Start Monitoring'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
