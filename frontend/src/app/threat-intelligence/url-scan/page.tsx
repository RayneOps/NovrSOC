'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { getPortalContext } from '@/lib/portal-context';
import { apiUrl } from '@/lib/api';

interface ScanSource {
    name: string;
    result: string;
    detail: string;
    verdict: string;
}

interface ScanResult {
    value: string;
    type: string;
    verdict: 'Malicious' | 'Suspicious' | 'Clean' | 'Unknown';
    confidence: number;
    sources: ScanSource[];
    country: string | null;
    malware_family: string | null;
    threat_type: string | null;
    first_seen: string | null;
    tags: string[];
}

interface ScanHistoryItem {
    id: number;
    value: string;
    type: string | null;
    verdict: string | null;
    scanned_by: string | null;
    created_at: string;
}

const VERDICT_STYLE: Record<string, string> = {
    Malicious: 'bg-red-500/10 text-red-500 border-red-500/30',
    Suspicious: 'bg-amber/10 text-amber border-amber/30',
    Clean: 'bg-green/10 text-green border-green/30',
    Unknown: 'bg-card-muted text-foreground-muted border-border',
};
const VERDICT_EMOJI: Record<string, string> = { Malicious: '🔴', Suspicious: '🟠', Clean: '🟢', Unknown: '⚪' };

function detectType(value: string): 'url' | 'ip' | 'domain' | 'hash' {
    if (/^https?:\/\//i.test(value)) return 'url';
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return 'ip';
    if (/^[a-fA-F0-9]{32}$/.test(value) || /^[a-fA-F0-9]{64}$/.test(value)) return 'hash';
    return 'domain';
}

function formatWhen(iso: string): string {
    return new Date(iso).toLocaleString();
}

const SCAN_STEPS = ['Checking CTIP Database…', 'Checking Intelligence Feed A…', 'Checking Intelligence Feed B…', 'Calculating verdict…'];

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
    URLHaus: 'Intelligence Feed A',
    AbuseIPDB: 'Intelligence Feed B',
};
function sanitizeSourceName(name: string): string {
    return SOURCE_DISPLAY_NAMES[name] ?? name;
}

export default function URLScanPage() {
    const [value, setValue] = useState('');
    const [typeChoice, setTypeChoice] = useState('auto');
    const [scanning, setScanning] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<ScanHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [copied, setCopied] = useState(false);

    const loadHistory = () => {
        const orgId = getPortalContext().orgId;
        fetch(apiUrl(`/api/scan/history${orgId ? `?org_id=${orgId}` : ''}`), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setHistory(Array.isArray(data?.scans) ? data.scans : []))
            .catch(() => setHistory([]))
            .finally(() => setLoadingHistory(false));
    };

    useEffect(loadHistory, []);

    const scan = async () => {
        if (!value.trim()) return;
        setScanning(true);
        setError(null);
        setResult(null);
        setStepIndex(0);

        const interval = setInterval(() => {
            setStepIndex(i => (i < SCAN_STEPS.length - 1 ? i + 1 : i));
        }, 500);

        try {
            const orgId = getPortalContext().orgId;
            const res = await fetch(apiUrl('/api/scan'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: value.trim(), type: typeChoice, ...(orgId ? { orgId } : {}) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Scan failed');
            setResult(data);
            loadHistory();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Scan failed');
        } finally {
            clearInterval(interval);
            setScanning(false);
        }
    };

    const copyReport = () => {
        if (!result) return;
        const lines = [
            `Scan Report — ${result.value}`,
            `Verdict: ${result.verdict} (${result.confidence}% confidence)`,
            `Type: ${result.type}`,
            result.country ? `Country: ${result.country}` : '',
            result.malware_family ? `Malware Family: ${result.malware_family}` : '',
            result.threat_type ? `Threat Type: ${result.threat_type}` : '',
            '',
            'Sources:',
            ...result.sources.map(s => `  - ${sanitizeSourceName(s.name)}: ${s.result} — ${s.detail} [${s.verdict}]`),
        ].filter(Boolean).join('\n');
        navigator.clipboard.writeText(lines).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    const detected = typeChoice === 'auto' && value.trim() ? detectType(value.trim()) : null;

    return (
        <PageLayout title="URL Scan">
            <div className="space-y-4">
                <div>
                    <h1 className="text-lg font-black text-foreground">URL Scan Suite</h1>
                    <p className="text-xs text-foreground-muted">Threat Intelligence · Check a URL, IP, domain, or hash against Cybernovr Intelligence</p>
                </div>

                {/* Scan bar */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-6">
                        <p className="text-xs font-black text-foreground mb-3">Scan an Indicator for Threats</p>
                        <div className="flex gap-3">
                            <select value={typeChoice} onChange={e => setTypeChoice(e.target.value)}
                                className="bg-card-muted border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none">
                                {['auto', 'url', 'ip', 'domain', 'hash'].map(t => <option key={t} value={t}>{t === 'auto' ? 'Auto-detect' : t.toUpperCase()}</option>)}
                            </select>
                            <input value={value} onChange={e => setValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && scan()}
                                placeholder="Enter URL, IP address, domain, or file hash…"
                                className="flex-1 bg-card-muted border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-foreground placeholder:text-foreground-muted" />
                            <button onClick={scan} disabled={scanning || !value.trim()}
                                className="px-6 py-2.5 bg-red hover:bg-red-hover disabled:opacity-60 text-white text-xs font-black rounded-lg transition-colors whitespace-nowrap">
                                {scanning ? '⏳ Scanning…' : '🔍 Scan Now'}
                            </button>
                        </div>
                        {detected && <p className="text-[10px] text-foreground-muted mt-2">Detected type: <span className="font-bold text-foreground-muted">{detected}</span></p>}

                        {scanning && (
                            <div className="mt-4 space-y-1.5">
                                {SCAN_STEPS.map((s, i) => (
                                    <p key={s} className={`text-[11px] flex items-center gap-2 ${i <= stepIndex ? 'text-foreground' : 'text-border'}`}>
                                        {i < stepIndex ? '✓' : i === stepIndex ? '⏳' : '○'} {s}
                                    </p>
                                ))}
                            </div>
                        )}
                        {error && <p className="text-[11px] text-red-500 mt-3">{error}</p>}
                    </div>
                </div>

                {/* Result */}
                {result && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className={`h-[3px] ${result.verdict === 'Malicious' ? 'bg-green from-red-500 to-red-500' : result.verdict === 'Suspicious' ? 'bg-green from-amber to-amber' : 'bg-green from-green to-green'}`} />
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <p className="text-[10px] text-foreground-muted mb-1 font-mono">{result.value}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{VERDICT_EMOJI[result.verdict]}</span>
                                        <span className={`text-lg font-black ${result.verdict === 'Malicious' ? 'text-red-500' : result.verdict === 'Suspicious' ? 'text-amber' : result.verdict === 'Clean' ? 'text-green' : 'text-foreground-muted'}`}>
                                            {result.verdict.toUpperCase()}
                                        </span>
                                        <span className="text-[10px] text-foreground-muted">({result.confidence}% confidence)</span>
                                    </div>
                                </div>
                                <button onClick={() => setResult(null)} className="text-foreground-muted hover:text-foreground-muted">✕</button>
                            </div>

                            <div className="overflow-x-auto mb-4">
                                <table className="w-full text-xs">
                                    <thead><tr className="border-b border-border">
                                        {['Source', 'Result', 'Detail', 'Verdict'].map(h => (
                                            <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody>
                                        {result.sources.map(s => (
                                            <tr key={s.name} className="border-b border-border">
                                                <td className="px-3 py-2 font-bold text-foreground whitespace-nowrap">{sanitizeSourceName(s.name)}</td>
                                                <td className="px-3 py-2 text-foreground-muted whitespace-nowrap">{s.result}</td>
                                                <td className="px-3 py-2 text-foreground-muted">{s.detail}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${VERDICT_STYLE[s.verdict] ?? VERDICT_STYLE.Unknown}`}>{s.verdict}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5 text-[11px]">
                                    {result.country && <div className="flex justify-between border-b border-border pb-1"><span className="text-foreground-muted">Country</span><span className="font-bold text-foreground">{result.country}</span></div>}
                                    {result.malware_family && <div className="flex justify-between border-b border-border pb-1"><span className="text-foreground-muted">Malware Family</span><span className="font-bold text-foreground">{result.malware_family}</span></div>}
                                    {result.threat_type && <div className="flex justify-between border-b border-border pb-1"><span className="text-foreground-muted">Threat Type</span><span className="font-bold text-foreground">{result.threat_type}</span></div>}
                                    {result.first_seen && <div className="flex justify-between border-b border-border pb-1"><span className="text-foreground-muted">First Seen</span><span className="font-bold text-foreground">{formatWhen(result.first_seen)}</span></div>}
                                </div>
                                {result.tags.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Tags</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {result.tags.map(t => (
                                                <span key={t} className="text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground-muted border border-border rounded">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={copyReport} className="text-[10px] font-bold px-3 py-2 border border-border text-foreground-muted hover:bg-card-muted rounded-lg transition-colors">
                                    {copied ? 'Copied ✓' : 'Copy Report'}
                                </button>
                                <button className="text-[10px] font-bold px-3 py-2 border border-border text-foreground-muted rounded-lg cursor-not-allowed" title="Coming soon">Add to Blocklist</button>
                                <button onClick={() => { setResult(null); setValue(''); }} className="text-[10px] font-bold px-3 py-2 bg-red hover:bg-red-hover text-white rounded-lg transition-colors">Scan Another</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent scans */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="p-4 border-b border-border">
                        <p className="text-xs font-black text-foreground">Recent Scans</p>
                    </div>
                    {loadingHistory ? (
                        <div className="p-6 space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 bg-card-muted rounded animate-pulse" />)}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-xs text-foreground-muted">No recent scans. Enter a URL, IP, or hash above to begin.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Value', 'Type', 'Verdict', 'Scanned', 'Scanned By'].map(h => (
                                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(s => (
                                        <tr key={s.id} className="border-b border-border hover:bg-card-muted">
                                            <td className="px-4 py-2.5 font-mono text-foreground-muted text-[10px] max-w-[260px] truncate">{s.value}</td>
                                            <td className="px-4 py-2.5 text-foreground-muted">{s.type ?? '—'}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${VERDICT_STYLE[s.verdict ?? 'Unknown']}`}>{s.verdict ?? 'Unknown'}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-foreground-muted whitespace-nowrap">{formatWhen(s.created_at)}</td>
                                            <td className="px-4 py-2.5 text-foreground-muted">{s.scanned_by ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
