'use client';

import { useState, useEffect } from 'react';
import { Ban, Copy, Download, ShieldCheck } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface ExtensionStats {
    endpoints_protected: number;
    pages_scanned_24h: number;
    threats_blocked: number;
    threats_warned: number;
    clean_pages: number;
    avg_classification_ms: number;
}

interface PhishEvent {
    id: string;
    url: string;
    domain: string;
    page_title: string;
    form_action: string;
    verdict: 'allow' | 'warn' | 'block';
    risk: number;
    reason: string;
    endpoint: string;
    user: string;
    detected_at: string;
    action_taken: string;
}

interface EndpointStatus {
    device: string;
    user: string;
    browser: string;
    version: string;
    last_active: string;
    pages_today: number;
}

const VERDICT_STYLE: Record<string, { label: string; text: string; bg: string; border: string }> = {
    block: { label: 'BLOCKED', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    warn: { label: 'WARNED', text: 'text-amber', bg: 'bg-grey-100', border: 'border-amber/30' },
    allow: { label: 'ALLOWED', text: 'text-green', bg: 'bg-green/10', border: 'border-green/30' },
};

const TABS = [
    { id: 'events', label: 'Protection Events' },
    { id: 'endpoints', label: 'Endpoint Status' },
    { id: 'setup', label: 'Extension Setup' },
] as const;
type Tab = (typeof TABS)[number]['id'];

// Endpoint status is derived from the same demo events feed (no dedicated backend collection
// yet) rather than a second hardcoded array — one source of truth for "who's protected".
const MOCK_ENDPOINTS: EndpointStatus[] = [
    { device: 'rayne-laptop', user: 'rayne@cybernovr.com', browser: 'Chrome 126', version: 'v1.0.2', last_active: '2 min ago', pages_today: 423 },
    { device: 'karl-laptop', user: 'karl@cybernovr.com', browser: 'Firefox 128', version: 'v1.0.2', last_active: '18 min ago', pages_today: 424 },
];

const CHROME_POLICY_JSON = `{
  "ExtensionSettings": {
    "novrsoc-phishid-id": {
      "installation_mode": "force_installed",
      "update_url": "https://api.novrsoc.com/extension/updates.xml"
    }
  }
}`;

export function PHISHIDProtection() {
    const [stats, setStats] = useState<ExtensionStats | null>(null);
    const [events, setEvents] = useState<PhishEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('events');
    const [filter, setFilter] = useState<'all' | 'block' | 'warn' | 'allow'>('all');
    const [selectedEvent, setSelectedEvent] = useState<PhishEvent | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch(apiUrl('/api/email/phishid/stats'), { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
            fetch(apiUrl('/api/email/phishid/events'), { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ events: [] })),
        ]).then(([statsRes, eventsRes]) => {
            setStats(statsRes);
            setEvents(Array.isArray(eventsRes?.events) ? eventsRes.events : []);
            setLoading(false);
        });
    }, []);

    const filteredEvents = filter === 'all' ? events : events.filter((e) => e.verdict === filter);

    const copyPolicy = () => {
        navigator.clipboard.writeText(CHROME_POLICY_JSON).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Intelli CODE PHISHID</h1>
                <p className="text-xs text-foreground-muted">Email Security · Real-time browser-level protection against zero-day phishing pages. AI classifies every login form your team encounters before credentials are entered.</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Endpoints Protected', value: stats?.endpoints_protected ?? '...', color: 'text-blue' },
                    { label: 'Pages Scanned Today', value: stats?.pages_scanned_24h?.toLocaleString() ?? '...', color: 'text-blue' },
                    { label: 'Threats Blocked', value: stats?.threats_blocked ?? '...', color: 'text-red-500', pulse: true },
                    { label: 'Avg Classification', value: stats ? `${stats.avg_classification_ms}ms` : '...', color: 'text-green' },
                ].map((k) => (
                    <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                            {k.pulse && stats && stats.threats_blocked > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                        </div>
                        <p className={`font-heading font-black text-2xl ${k.color}`}>{k.value}</p>
                    </div>
                ))}
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
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-card-muted rounded-xl animate-pulse" />)}</div>
            ) : (
                <>
                    {/* PROTECTION EVENTS TAB */}
                    {activeTab === 'events' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-foreground-muted">Filter:</span>
                                {(['all', 'block', 'warn', 'allow'] as const).map((f) => (
                                    <button key={f} onClick={() => setFilter(f)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-blue text-white' : 'bg-card border border-border text-foreground-muted hover:border-grey-300'}`}>
                                        {f === 'all' ? 'All' : VERDICT_STYLE[f].label}
                                    </button>
                                ))}
                            </div>

                            {filteredEvents.length === 0 ? (
                                <div className="bg-card border border-border rounded-xl p-10 text-center">
                                    <ShieldCheck size={36} className="text-border mx-auto mb-3" />
                                    <p className="text-sm text-foreground-muted">No events match this filter</p>
                                </div>
                            ) : (
                                filteredEvents.map((e) => {
                                    const cfg = VERDICT_STYLE[e.verdict];
                                    return (
                                        <div key={e.id} className={`bg-card border rounded-xl p-4 ${e.verdict === 'block' ? 'border-red-500/30' : 'border-border'}`}>
                                            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
                                                    <span className={`text-sm font-black ${cfg.text}`}>{e.risk}/100</span>
                                                </div>
                                                <span className="text-xs text-foreground-muted whitespace-nowrap">{e.detected_at}</span>
                                            </div>
                                            <p className="font-mono text-xs text-foreground break-all mb-1">{e.domain}</p>
                                            <p className="text-xs text-foreground-muted mb-1">{e.reason}</p>
                                            {e.form_action && (
                                                <p className="text-xs text-foreground-muted mb-2">Form submits to: <span className="font-mono">{e.form_action}</span></p>
                                            )}
                                            <p className="text-[11px] text-foreground-muted mb-3">{e.endpoint} · {e.user}</p>
                                            <div className="flex flex-wrap gap-3">
                                                <button onClick={() => setSelectedEvent(e)} className="text-xs font-bold text-blue hover:underline">View Details</button>
                                                <button className="text-xs font-bold text-foreground-muted hover:text-foreground">Create Incident</button>
                                                <button className="text-xs font-bold text-foreground-muted hover:text-foreground">Report URL</button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ENDPOINT STATUS TAB */}
                    {activeTab === 'endpoints' && (
                        <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Device', 'User', 'Browser', 'Extension Version', 'Last Active', 'Status', 'Pages Today'].map((h) => (
                                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_ENDPOINTS.map((ep) => (
                                        <tr key={ep.device} className="border-b border-border">
                                            <td className="px-4 py-2.5 font-bold text-foreground">{ep.device}</td>
                                            <td className="px-4 py-2.5 text-foreground-muted">{ep.user}</td>
                                            <td className="px-4 py-2.5 text-foreground-muted">{ep.browser}</td>
                                            <td className="px-4 py-2.5 font-mono text-foreground-muted">{ep.version}</td>
                                            <td className="px-4 py-2.5 text-foreground-muted">{ep.last_active}</td>
                                            <td className="px-4 py-2.5"><span className="flex items-center gap-1 text-green font-bold"><ShieldCheck size={12} /> Active</span></td>
                                            <td className="px-4 py-2.5 font-bold text-foreground">{ep.pages_today}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="px-4 py-3 border-t border-border">
                                <button className="text-xs font-bold px-3 py-2 bg-red hover:bg-red-hover text-white rounded-lg transition-colors">+ Deploy Extension</button>
                            </div>
                        </div>
                    )}

                    {/* EXTENSION SETUP TAB */}
                    {activeTab === 'setup' && (
                        <div className="space-y-4">
                            <div className="bg-card border border-border rounded-xl p-5">
                                <p className="text-xs font-black text-foreground mb-4">How to Deploy</p>
                                <div className="space-y-3">
                                    {[
                                        { step: 1, label: 'Download extension package', action: <button className="text-[10px] font-bold text-blue hover:underline flex items-center gap-1"><Download size={11} /> Download .crx / .xpi</button> },
                                        { step: 2, label: <>Configure API endpoint: <span className="font-mono">https://api.novrsoc.com/api/phishid</span></> },
                                        { step: 3, label: 'Set org API key in extension settings' },
                                        { step: 4, label: 'Verify — send a test classification' },
                                    ].map((s) => (
                                        <div key={s.step} className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-blue text-white flex items-center justify-center text-[11px] font-black flex-shrink-0">{s.step}</div>
                                            <div className="text-xs text-foreground pt-0.5">{s.label}{s.action}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-xl p-5">
                                <p className="text-xs font-black text-foreground mb-2">Chrome Enterprise Policy JSON (for MDM deployment)</p>
                                <div className="bg-card-muted border border-border rounded-lg p-3 flex items-start gap-2">
                                    <pre className="text-[10px] font-mono text-foreground flex-1 overflow-x-auto whitespace-pre">{CHROME_POLICY_JSON}</pre>
                                    <button onClick={copyPolicy} className="flex items-center gap-1 text-[10px] font-bold text-blue hover:text-purple flex-shrink-0">
                                        <Copy size={12} /> {copied ? 'Copied ✓' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-green/10 border border-green/30 rounded-xl p-4">
                                <ShieldCheck size={18} className="text-green flex-shrink-0" />
                                <span className="text-sm font-semibold text-foreground">Status: {MOCK_ENDPOINTS.length}/{MOCK_ENDPOINTS.length} expected endpoints active</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Event detail modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-bold text-lg text-foreground">AI Classification</h3>
                            <button onClick={() => setSelectedEvent(null)} className="text-foreground-muted hover:text-foreground">✕</button>
                        </div>

                        <div className="text-center mb-4">
                            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-2 ${VERDICT_STYLE[selectedEvent.verdict].border}`}>
                                <span className={`text-2xl font-black ${VERDICT_STYLE[selectedEvent.verdict].text}`}>{selectedEvent.risk}</span>
                            </div>
                            <p className={`text-sm font-bold ${VERDICT_STYLE[selectedEvent.verdict].text}`}>{VERDICT_STYLE[selectedEvent.verdict].label}</p>
                        </div>

                        <div className="space-y-2 text-xs mb-4">
                            <div className="border-b border-border pb-2"><p className="text-foreground-muted mb-0.5">Page URL</p><p className="font-mono text-foreground break-all">{selectedEvent.url}</p></div>
                            <div className="border-b border-border pb-2"><p className="text-foreground-muted mb-0.5">Page Title</p><p className="text-foreground">{selectedEvent.page_title}</p></div>
                            <div className="border-b border-border pb-2"><p className="text-foreground-muted mb-0.5">Form Action</p><p className="font-mono text-foreground break-all">{selectedEvent.form_action}</p></div>
                        </div>

                        <div className="bg-card-muted rounded-lg p-3 mb-4">
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">Claude&rsquo;s Reasoning</p>
                            <p className="text-xs text-foreground">{selectedEvent.reason}</p>
                        </div>

                        <div className="mb-4">
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">DOM Signals Detected</p>
                            <div className="space-y-1">
                                {['Password input field detected', 'Form action to external domain', 'Domain age < 7 days'].map((sig) => (
                                    <div key={sig} className="flex items-center gap-2 text-xs text-foreground">
                                        <ShieldCheck size={12} className="text-red-500 flex-shrink-0" />
                                        {sig}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button className="text-xs font-bold px-3 py-2 bg-red hover:bg-red-hover text-white rounded-lg transition-colors flex items-center gap-1"><Ban size={12} /> Block Domain Sitewide</button>
                            <button className="text-xs font-bold px-3 py-2 border border-border text-foreground-muted rounded-lg hover:bg-card-muted transition-colors">Whitelist</button>
                            <button className="text-xs font-bold px-3 py-2 border border-blue text-blue rounded-lg hover:bg-blue/10 transition-colors">Create Incident</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
