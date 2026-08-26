'use client';

import { useState } from 'react';
import { Search, RefreshCw, ShieldAlert, ShieldCheck, ShieldQuestion, ArrowRight, History } from 'lucide-react';

// Mock analysis only — no backend route parses real headers yet. A real implementation would
// need to parse Received: chains, run the originating IP through the CTI Platform
// (AbuseIPDB/VT enrichment, services/abuseipdb.ts + services/virustotal.ts already exist for
// that), and evaluate SPF/DKIM/DMARC against the sending domain's DNS records.

interface AnalysisResult {
    verdict: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';
    risk_score: number;
    from_address: string;
    envelope_sender: string;
    sender_mismatch: boolean;
    originating_ip: string;
    ip_verdict: { score: number; verdict: string; country: string };
    relay_hops: Array<{ ip: string; server: string; timestamp: string }>;
    spf: { result: string; detail: string };
    dkim: { result: string; detail: string };
    dmarc: { result: string; detail: string };
    risk_indicators: Array<{ name: string; severity: 'critical' | 'high' | 'medium' | 'low' }>;
}

const SAMPLE_RESULT: AnalysisResult = {
    verdict: 'SUSPICIOUS',
    risk_score: 67,
    from_address: 'invoice@dangote-group.ng',
    envelope_sender: 'bounce@malicious-relay.ru',
    sender_mismatch: true,
    originating_ip: '185.220.101.47',
    ip_verdict: { score: 94, verdict: 'malicious', country: 'DE' },
    relay_hops: [
        { ip: '185.220.101.47', server: 'mail.unknown.ru', timestamp: '09:41:00' },
        { ip: '209.85.220.41', server: 'gmail-smtp-in.l.google.com', timestamp: '09:41:02' },
    ],
    spf: { result: 'fail', detail: 'sender not in SPF record' },
    dkim: { result: 'none', detail: 'no DKIM signature' },
    dmarc: { result: 'reject', detail: 'blocked by DMARC policy' },
    risk_indicators: [
        { name: 'Envelope sender mismatch', severity: 'high' },
        { name: 'Originating IP on blocklist', severity: 'critical' },
        { name: 'No DKIM signature', severity: 'medium' },
        { name: 'SPF authentication failed', severity: 'high' },
    ],
};

interface PastInvestigation { id: string; verdict: AnalysisResult['verdict']; from: string; time: string }
const RECENT: PastInvestigation[] = [
    { id: 'inv_001', verdict: 'MALICIOUS', from: 'ceo@dangote-groupp.ng', time: '2026-08-23 16:12' },
    { id: 'inv_002', verdict: 'SUSPICIOUS', from: 'invoice@dangote-group.ng', time: '2026-08-24 09:41' },
    { id: 'inv_003', verdict: 'SAFE', from: 'noreply@github.com', time: '2026-08-22 11:05' },
];

const VERDICT_STYLE: Record<AnalysisResult['verdict'], { bg: string; text: string; icon: typeof ShieldCheck }> = {
    SAFE: { bg: 'bg-green/10 border-green/30', text: 'text-green', icon: ShieldCheck },
    SUSPICIOUS: { bg: 'bg-amber/10 border-amber/30', text: 'text-amber', icon: ShieldQuestion },
    MALICIOUS: { bg: 'bg-red/10 border-red/30', text: 'text-red', icon: ShieldAlert },
};
const SEVERITY_TEXT: Record<string, string> = { critical: 'text-red', high: 'text-red', medium: 'text-amber', low: 'text-blue' };
const AUTH_COLOR: Record<string, string> = { pass: 'text-green', fail: 'text-red', reject: 'text-red', none: 'text-amber', softfail: 'text-amber' };

const TABS = [
    { id: 'investigate', label: 'Investigate' },
    { id: 'recent', label: 'Recent Investigations' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function EmailInvestigation() {
    const [tab, setTab] = useState<Tab>('investigate');
    const [headers, setHeaders] = useState('');
    const [analysing, setAnalysing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const analyse = () => {
        if (!headers.trim()) return;
        setAnalysing(true);
        setResult(null);
        setTimeout(() => {
            setResult(SAMPLE_RESULT);
            setAnalysing(false);
        }, 1200);
    };

    const Verdict = result ? VERDICT_STYLE[result.verdict].icon : null;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Email Investigation</h1>
                <p className="text-xs text-foreground-muted">Email Security · Paste raw email headers for sender, relay path, and authentication analysis.</p>
            </div>

            <div className="flex gap-1 border-b border-border">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${tab === t.id ? 'border-blue text-blue' : 'border-transparent text-foreground-muted hover:text-foreground'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'investigate' && (
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-xl p-4">
                        <textarea
                            value={headers}
                            onChange={(e) => setHeaders(e.target.value)}
                            placeholder="Paste email headers here…"
                            rows={8}
                            className="w-full border border-border bg-card-muted rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20 text-foreground resize-none"
                        />
                        <button onClick={analyse} disabled={!headers.trim() || analysing}
                            className="mt-3 flex items-center justify-center gap-2 bg-orange hover:bg-orange-hover text-white text-sm font-bold px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                            {analysing ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                            {analysing ? 'Analysing…' : 'Analyse Headers'}
                        </button>
                    </div>

                    {result && Verdict && (
                        <div className="space-y-4">
                            {/* 1. Verdict banner */}
                            <div className={`rounded-xl p-4 border flex items-center gap-3 ${VERDICT_STYLE[result.verdict].bg}`}>
                                <Verdict size={22} className={VERDICT_STYLE[result.verdict].text} />
                                <div>
                                    <p className={`font-black text-sm ${VERDICT_STYLE[result.verdict].text}`}>{result.verdict}</p>
                                    <p className="text-xs text-foreground-muted">Risk score {result.risk_score}/100</p>
                                </div>
                            </div>

                            {/* 2. Sender analysis */}
                            <div className="bg-card border border-border rounded-xl p-5">
                                <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Sender Analysis</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-xs">
                                    <div className="flex justify-between border-b border-border pb-2 pr-4"><span className="text-foreground-muted">From Address</span><span className="font-bold text-foreground">{result.from_address}</span></div>
                                    <div className="flex justify-between border-b border-border pb-2 pr-4"><span className="text-foreground-muted">Envelope Sender</span><span className={`font-bold ${result.sender_mismatch ? 'text-red' : 'text-foreground'}`}>{result.envelope_sender}</span></div>
                                    <div className="flex justify-between border-b border-border pb-2 pr-4"><span className="text-foreground-muted">Originating IP</span><span className="font-mono font-bold text-foreground">{result.originating_ip}</span></div>
                                    <div className="flex justify-between border-b border-border pb-2 pr-4"><span className="text-foreground-muted">IP Verdict</span><span className={`font-bold capitalize ${result.ip_verdict.verdict === 'malicious' ? 'text-red' : 'text-green'}`}>{result.ip_verdict.verdict} ({result.ip_verdict.score}/100)</span></div>
                                    <div className="flex justify-between pb-2 pr-4"><span className="text-foreground-muted">Geolocation</span><span className="font-bold text-foreground">{result.ip_verdict.country}</span></div>
                                </div>
                            </div>

                            {/* 3. Relay path */}
                            <div className="bg-card border border-border rounded-xl p-5">
                                <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Relay Path</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {result.relay_hops.map((hop, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className={`rounded-lg border px-3 py-2 text-xs ${i === 0 && result.ip_verdict.verdict === 'malicious' ? 'border-red/30 bg-red/10' : 'border-border bg-card-muted'}`}>
                                                <p className="font-mono font-bold text-foreground">{hop.ip}</p>
                                                <p className="text-foreground-muted">{hop.server}</p>
                                                <p className="text-[10px] text-foreground-muted">{hop.timestamp}</p>
                                            </div>
                                            {i < result.relay_hops.length - 1 && <ArrowRight size={14} className="text-foreground-muted flex-shrink-0" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. Authentication results */}
                            <div className="bg-card border border-border rounded-xl p-5">
                                <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Authentication Results</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {([['SPF', result.spf], ['DKIM', result.dkim], ['DMARC', result.dmarc]] as const).map(([label, r]) => (
                                        <div key={label} className="bg-card-muted rounded-lg p-3">
                                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wide mb-1">{label}</p>
                                            <p className={`text-sm font-black uppercase ${AUTH_COLOR[r.result] ?? 'text-foreground'}`}>{r.result}</p>
                                            <p className="text-[10px] text-foreground-muted mt-1">{r.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 5. Risk indicators */}
                            <div className="bg-card border border-border rounded-xl p-5">
                                <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Risk Indicators</h3>
                                <div className="space-y-2">
                                    {result.risk_indicators.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between border-b border-border last:border-0 pb-2 last:pb-0">
                                            <span className="text-sm text-foreground">{r.name}</span>
                                            <span className={`text-[10px] font-bold uppercase ${SEVERITY_TEXT[r.severity]}`}>{r.severity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'recent' && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-grey-800">
                                    {['Investigation', 'From Address', 'Verdict', 'Time'].map((c) => (
                                        <th key={c} className="px-4 py-3 text-[10px] font-semibold text-white uppercase tracking-widest whitespace-nowrap">{c}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {RECENT.map((r) => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-3 font-mono text-foreground-muted whitespace-nowrap flex items-center gap-2"><History size={12} className="text-foreground-muted" />{r.id}</td>
                                        <td className="px-4 py-3 text-foreground">{r.from}</td>
                                        <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${VERDICT_STYLE[r.verdict].bg} ${VERDICT_STYLE[r.verdict].text}`}>{r.verdict}</span></td>
                                        <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{r.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
