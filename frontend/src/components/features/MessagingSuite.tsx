'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Paperclip } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { apiUrl } from '@/lib/api';

interface MailGateway {
    name: string;
    type: 'outbound' | 'inbound';
    ip: string;
    status: 'healthy' | 'degraded' | 'down';
    delivery_rate: number;
    avg_latency_ms: number;
    messages_24h: number;
    rbl_listed: boolean;
    last_checked: string;
}

interface SuspiciousEmail {
    id: string;
    from: string;
    to: string;
    subject: string;
    relay_ip: string;
    relay_country: string;
    received_at: string;
    helo_domain: string;
    spf: 'pass' | 'fail';
    dkim: 'pass' | 'fail';
    suspicious_reason: string | null;
    severity: 'critical' | 'high' | 'clean';
    attachment: string | null;
}

interface RblResult {
    name: string;
    listed: boolean;
    answer: string | null;
    error?: boolean;
}

const STATUS_DOT: Record<string, string> = { healthy: 'bg-green', degraded: 'bg-amber', down: 'bg-red-500' };
const SEVERITY_STYLE: Record<string, { label: string; text: string; bg: string; border: string }> = {
    critical: { label: 'CRITICAL', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    high: { label: 'HIGH', text: 'text-amber', bg: 'bg-grey-100', border: 'border-amber/30' },
    clean: { label: 'CLEAN', text: 'text-green', bg: 'bg-green/10', border: 'border-green/30' },
};

const TABS = [
    { id: 'gateways', label: 'Gateways' },
    { id: 'inspector', label: 'Email Inspector' },
    { id: 'rbl', label: 'RBL Check' },
] as const;
type Tab = (typeof TABS)[number]['id'];

// Deterministic per-gateway 7-day sparkline sample around the reported avg latency.
function sparklineFor(avg: number) {
    return [0.9, 1.1, 0.95, 1.2, 0.85, 1.05, 1].map((mult, i) => ({ day: i, latency: Math.round(avg * mult) }));
}

export function MessagingSuite() {
    const [gateways, setGateways] = useState<MailGateway[]>([]);
    const [emails, setEmails] = useState<SuspiciousEmail[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('gateways');
    const [selectedEmail, setSelectedEmail] = useState<SuspiciousEmail | null>(null);
    const [rblIp, setRblIp] = useState('102.89.45.13');
    const [rblResults, setRblResults] = useState<RblResult[] | null>(null);
    const [rblChecking, setRblChecking] = useState(false);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch(apiUrl('/api/email/messaging/gateways'), { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ gateways: [] })),
            fetch(apiUrl('/api/email/messaging/suspicious'), { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ emails: [] })),
        ]).then(([gwRes, emRes]) => {
            setGateways(Array.isArray(gwRes?.gateways) ? gwRes.gateways : []);
            setEmails(Array.isArray(emRes?.emails) ? emRes.emails : []);
            setLoading(false);
        });
    }, []);

    const runRblCheck = async () => {
        if (!rblIp.trim()) return;
        setRblChecking(true);
        setRblResults(null);
        try {
            const res = await fetch(apiUrl('/api/email/messaging/rbl-check'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: rblIp.trim() }),
            });
            const data = await res.json();
            setRblResults(Array.isArray(data?.results) ? data.results : []);
        } catch {
            setRblResults([]);
        } finally {
            setRblChecking(false);
        }
    };

    const avgLatency = gateways.length > 0 ? Math.round(gateways.reduce((s, g) => s + g.avg_latency_ms, 0) / gateways.length) : 0;
    const suspiciousCount = emails.filter((e) => e.severity !== 'clean').length;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Messaging Suite</h1>
                <p className="text-xs text-foreground-muted">Email Security · Monitor email gateway health, inspect relay paths, track IP reputations, and detect suspicious email transport patterns</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green" />
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Active Gateways</p>
                    </div>
                    <p className="font-heading font-black text-2xl text-foreground">{gateways.filter((g) => g.status === 'healthy').length}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                        {suspiciousCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Suspicious Emails (24h)</p>
                    </div>
                    <p className="font-heading font-black text-2xl text-red-500">{suspiciousCount}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Avg Delivery Latency</p>
                    <p className="font-heading font-black text-2xl text-blue">{avgLatency}ms</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === t.id ? 'border-blue text-blue' : 'border-transparent text-foreground-muted hover:text-foreground'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-40 bg-card-muted rounded-xl animate-pulse" />)}</div>
            ) : (
                <>
                    {/* GATEWAYS TAB */}
                    {activeTab === 'gateways' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {gateways.map((g) => (
                                <div key={g.ip} className="bg-card border border-border rounded-xl p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[g.status]}`} />
                                                <span className="text-sm font-bold text-foreground">{g.name}</span>
                                            </div>
                                            <p className="text-[10px] text-foreground-muted mt-0.5 font-mono">{g.ip}</p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-card-muted text-foreground-muted rounded-full uppercase">{g.type}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-[11px] mb-3">
                                        <div><p className="text-foreground-muted">Delivery Rate</p><p className="font-bold text-foreground">{g.delivery_rate}%</p></div>
                                        <div><p className="text-foreground-muted">Avg Latency</p><p className="font-bold text-foreground">{g.avg_latency_ms}ms</p></div>
                                        <div><p className="text-foreground-muted">Messages (24h)</p><p className="font-bold text-foreground">{g.messages_24h}</p></div>
                                        <div><p className="text-foreground-muted">RBL Status</p><p className={`font-bold ${g.rbl_listed ? 'text-red-500' : 'text-green'}`}>{g.rbl_listed ? 'Listed' : 'Clean'}</p></div>
                                    </div>

                                    <div className="h-10 mb-3">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={sparklineFor(g.avg_latency_ms)}>
                                                <Line type="monotone" dataKey="latency" stroke="var(--color-blue)" strokeWidth={1.5} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-foreground-muted">Checked {g.last_checked}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setRblIp(g.ip); setActiveTab('rbl'); }} className="text-[10px] font-bold text-blue hover:underline">Check Reputation</button>
                                            <button className="text-[10px] font-bold text-foreground-muted hover:text-foreground">View Logs</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* EMAIL INSPECTOR TAB */}
                    {activeTab === 'inspector' && (
                        <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Severity', 'From', 'To', 'Subject', 'Relay IP', 'Country', 'SPF', 'DKIM', 'Reason'].map((h) => (
                                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {emails.map((e) => {
                                        const cfg = SEVERITY_STYLE[e.severity];
                                        return (
                                            <tr key={e.id} onClick={() => setSelectedEmail(e)} className="border-b border-border hover:bg-card-muted cursor-pointer transition-colors">
                                                <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span></td>
                                                <td className="px-4 py-2.5 font-mono text-foreground max-w-[180px] truncate">{e.from}</td>
                                                <td className="px-4 py-2.5 font-mono text-foreground-muted max-w-[140px] truncate">{e.to}</td>
                                                <td className="px-4 py-2.5 text-foreground max-w-[200px] truncate">
                                                    <span className="flex items-center gap-1">{e.attachment && <Paperclip size={10} className="text-foreground-muted flex-shrink-0" />}{e.subject}</span>
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-foreground-muted">{e.relay_ip}</td>
                                                <td className="px-4 py-2.5 text-foreground-muted">{e.relay_country}</td>
                                                <td className="px-4 py-2.5">{e.spf === 'pass' ? <CheckCircle2 size={14} className="text-green" /> : <XCircle size={14} className="text-red-500" />}</td>
                                                <td className="px-4 py-2.5">{e.dkim === 'pass' ? <CheckCircle2 size={14} className="text-green" /> : <XCircle size={14} className="text-red-500" />}</td>
                                                <td className="px-4 py-2.5 text-foreground-muted max-w-[240px] truncate">{e.suspicious_reason ?? '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* RBL CHECK TAB */}
                    {activeTab === 'rbl' && (
                        <div className="space-y-4">
                            <div className="bg-card border border-border rounded-xl p-4">
                                <div className="flex gap-3">
                                    <input type="text" value={rblIp} onChange={(e) => setRblIp(e.target.value)} placeholder="102.89.45.13"
                                        onKeyDown={(e) => e.key === 'Enter' && runRblCheck()}
                                        className="flex-1 bg-card-muted border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-blue" />
                                    <button onClick={runRblCheck} disabled={rblChecking || !rblIp.trim()}
                                        className="flex items-center gap-2 bg-orange hover:bg-orange-hover disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-xs font-black transition-colors">
                                        {rblChecking ? (<><RefreshCw size={14} className="animate-spin" /> Checking…</>) : (<><Search size={14} /> Check</>)}
                                    </button>
                                </div>
                                <p className="text-[10px] text-foreground-muted mt-2">RBL checks use public DNS queries — no API key required.</p>
                            </div>

                            {rblResults && (
                                <div className="bg-card border border-border rounded-xl overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-border">
                                                {['RBL Name', 'Listed', 'Reason', ''].map((h) => (
                                                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rblResults.map((r) => (
                                                <tr key={r.name} className="border-b border-border">
                                                    <td className="px-4 py-2.5 font-bold text-foreground">{r.name}</td>
                                                    <td className="px-4 py-2.5">
                                                        {r.listed ? (
                                                            <span className="flex items-center gap-1.5 text-red-500 font-bold"><AlertTriangle size={12} /> LISTED</span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-green font-bold"><CheckCircle2 size={12} /> Clean</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-foreground-muted font-mono">{r.answer ?? (r.error ? 'Check failed' : '—')}</td>
                                                    <td className="px-4 py-2.5">
                                                        {r.listed && <a href={`https://${r.name.toLowerCase().replace(/\s+/g, '')}.org`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue hover:underline">Delist</a>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Email detail modal */}
            {selectedEmail && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setSelectedEmail(null)}>
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-bold text-lg text-foreground">Email Header Analysis</h3>
                            <button onClick={() => setSelectedEmail(null)} className="text-foreground-muted hover:text-foreground">✕</button>
                        </div>

                        <div className="space-y-3 text-xs mb-4">
                            {[
                                ['From', selectedEmail.from],
                                ['To', selectedEmail.to],
                                ['Subject', selectedEmail.subject],
                                ['HELO Domain', selectedEmail.helo_domain],
                                ['Received', selectedEmail.received_at],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between border-b border-border pb-2 gap-3">
                                    <span className="text-foreground-muted flex-shrink-0">{label}</span>
                                    <span className="font-mono font-bold text-foreground text-right break-all">{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Relay chain */}
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Relay Chain</p>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 bg-card-muted rounded-lg p-2 text-center">
                                <p className="text-[10px] font-mono text-foreground">{selectedEmail.relay_ip}</p>
                                <p className="text-[9px] text-foreground-muted">{selectedEmail.relay_country}</p>
                            </div>
                            <span className="text-foreground-muted">→</span>
                            <div className="flex-1 bg-card-muted rounded-lg p-2 text-center">
                                <p className="text-[10px] font-mono text-foreground">{selectedEmail.to.split('@')[1]}</p>
                                <p className="text-[9px] text-foreground-muted">Recipient</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedEmail.spf === 'pass' ? 'bg-green/10 text-green border-green/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>SPF: {selectedEmail.spf.toUpperCase()}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedEmail.dkim === 'pass' ? 'bg-green/10 text-green border-green/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>DKIM: {selectedEmail.dkim.toUpperCase()}</span>
                        </div>

                        {selectedEmail.attachment && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 mb-4">
                                <Paperclip size={12} className="text-red-500 flex-shrink-0" />
                                <span className="text-xs font-mono text-red-500">{selectedEmail.attachment}</span>
                            </div>
                        )}

                        {selectedEmail.suspicious_reason && (
                            <div className="bg-card-muted rounded-lg p-3 mb-4">
                                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Suspicious Reason</p>
                                <p className="text-xs text-foreground">{selectedEmail.suspicious_reason}</p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <button className="text-xs font-bold px-3 py-2 bg-red hover:bg-red-hover text-white rounded-lg transition-colors">Block Sender Domain</button>
                            <button className="text-xs font-bold px-3 py-2 border border-border text-foreground-muted rounded-lg hover:bg-card-muted transition-colors">Report Phishing</button>
                            <button className="text-xs font-bold px-3 py-2 border border-blue text-blue rounded-lg hover:bg-blue/10 transition-colors">Mark Safe</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
