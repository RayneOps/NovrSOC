'use client';

import { useEffect, useState } from 'react';
import { Globe, Plus, RefreshCw, Trash2, X, Loader2 } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { EmptyState } from '@/components/shared/EmptyState';

interface DomainAlerts {
    lookalike: boolean;
    dns_change: boolean;
    expiry: boolean;
    new_cert: boolean;
}

interface MonitoredDomain {
    id: string;
    domain: string;
    brand_keywords: string[];
    similarity_threshold: number;
    alerts: DomainAlerts;
    status: 'active';
    added_at: string;
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
}

interface ScanResult {
    domain: string;
    scanned_at: string;
    whois: WhoisInfo | null;
    ct_logs: CertRow[];
    lookalikes: Lookalike[];
}

interface DnsRecord {
    type: string;
    name: string;
    value: string;
    ttl: number;
}

interface DnsResult {
    domain: string;
    records: DnsRecord[];
    email_security: { spf: boolean; dmarc: boolean };
    checked_at: string;
}

const RISK_STYLE: Record<Lookalike['risk'], string> = {
    HIGH: 'bg-red-500/10 text-red-500 border-red-500/30',
    MEDIUM: 'bg-grey-100 text-amber border-amber/30',
    LOW: 'bg-card-muted text-foreground-muted border-border',
};

const DNS_TYPES = ['A', 'MX', 'TXT', 'NS'] as const;

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

    // Scan / DNS panel state
    const [scanningId, setScanningId] = useState<string | null>(null);
    const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
    const [openScanId, setOpenScanId] = useState<string | null>(null);
    const [dnsLoadingId, setDnsLoadingId] = useState<string | null>(null);
    const [dnsResults, setDnsResults] = useState<Record<string, DnsResult>>({});
    const [openDnsId, setOpenDnsId] = useState<string | null>(null);
    const [dnsTab, setDnsTab] = useState<(typeof DNS_TYPES)[number]>('A');

    const load = () => {
        setLoading(true);
        fetch(apiUrl('/api/brand/domains'), { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => setDomains(Array.isArray(data?.domains) ? data.domains : []))
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
        setOpenDnsId(null);
        try {
            const res = await fetch(apiUrl(`/api/brand/domains/${id}/scan`));
            const data = await res.json();
            setScanResults((prev) => ({ ...prev, [id]: data }));
            setOpenScanId(id);
        } finally {
            setScanningId(null);
        }
    };

    const viewDns = async (id: string) => {
        setOpenScanId(null);
        if (dnsResults[id]) {
            setOpenDnsId(openDnsId === id ? null : id);
            return;
        }
        setDnsLoadingId(id);
        try {
            const res = await fetch(apiUrl(`/api/brand/domains/${id}/dns`));
            const data = await res.json();
            setDnsResults((prev) => ({ ...prev, [id]: data }));
            setOpenDnsId(id);
        } finally {
            setDnsLoadingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-lg font-black text-foreground">Domain Suite</h1>
                    <p className="text-xs text-foreground-muted">Brand Protection · Typosquatting, DNS hijacking, and unauthorized SSL cert monitoring</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-orange hover:bg-orange-hover text-white text-xs font-black px-4 py-2.5 rounded-lg transition-colors"
                >
                    <Plus size={14} />
                    Add Domain
                </button>
            </div>

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
                        const scan = scanResults[d.id];
                        const dns = dnsResults[d.id];
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
                                            </p>
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
                                            onClick={() => removeDomain(d.id)}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-foreground-muted hover:text-red-500 border border-border rounded-lg px-3 py-1.5"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Scan results panel */}
                                {openScanId === d.id && scan && (
                                    <div className="border-t border-border p-4 space-y-4 bg-card-muted/40">
                                        <div>
                                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">WHOIS</p>
                                            {scan.whois ? (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                                                    <div><p className="text-foreground-muted">Registrar</p><p className="font-bold text-foreground">{scan.whois.registrar}</p></div>
                                                    <div><p className="text-foreground-muted">Created</p><p className="font-bold text-foreground">{scan.whois.created?.slice(0, 10) ?? '—'}</p></div>
                                                    <div><p className="text-foreground-muted">Expires</p><p className="font-bold text-foreground">{scan.whois.expires?.slice(0, 10) ?? '—'}</p></div>
                                                    <div>
                                                        <p className="text-foreground-muted">Days Until Expiry</p>
                                                        <p className={`font-bold ${scan.whois.daysUntilExpiry !== null && scan.whois.daysUntilExpiry < 30 ? 'text-amber' : 'text-foreground'}`}>
                                                            {scan.whois.daysUntilExpiry ?? '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-foreground-muted">WHOIS lookup unavailable for this domain.</p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Certificate Transparency Logs ({scan.ct_logs.length})</p>
                                            {scan.ct_logs.length === 0 ? (
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
                                                            {scan.ct_logs.map((c, i) => (
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
                                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Lookalike Domains</p>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead><tr className="border-b border-border">
                                                        {['Domain', 'Similarity', 'Risk'].map((h) => (
                                                            <th key={h} className="text-left px-3 py-1.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                                        ))}
                                                    </tr></thead>
                                                    <tbody>
                                                        {scan.lookalikes.map((l) => (
                                                            <tr key={l.domain} className="border-b border-border">
                                                                <td className="px-3 py-1.5 font-mono text-foreground">{l.domain}</td>
                                                                <td className="px-3 py-1.5 text-foreground">{l.similarity}%</td>
                                                                <td className="px-3 py-1.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${RISK_STYLE[l.risk]}`}>{l.risk}</span></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-foreground-muted">Last scanned: {new Date(scan.scanned_at).toLocaleString()}</p>
                                    </div>
                                )}

                                {/* DNS panel */}
                                {openDnsId === d.id && dns && (
                                    <div className="border-t border-border p-4 space-y-3 bg-card-muted/40">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${dns.email_security.spf ? 'bg-blue/10 text-blue border-blue/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                                                {dns.email_security.spf ? '✓ SPF found' : '✗ SPF missing'}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${dns.email_security.dmarc ? 'bg-blue/10 text-blue border-blue/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                                                {dns.email_security.dmarc ? '✓ DMARC found' : '✗ DMARC missing'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
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
                                        {dns.records.filter((r) => r.type === dnsTab).length === 0 ? (
                                            <p className="text-xs text-foreground-muted py-4">No {dnsTab} records found.</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {dns.records.filter((r) => r.type === dnsTab).map((r, i) => (
                                                    <div key={i} className="flex items-center gap-3 text-xs border-b border-border pb-1.5">
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-card-muted text-foreground-muted rounded">{r.type}</span>
                                                        <span className="text-foreground-muted">{r.name}</span>
                                                        <span className="font-mono text-foreground flex-1 truncate">{r.value}</span>
                                                        <span className="text-foreground-muted">TTL {r.ttl}</span>
                                                    </div>
                                                ))}
                                            </div>
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
