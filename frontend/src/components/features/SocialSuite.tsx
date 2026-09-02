'use client';

import { useEffect, useState } from 'react';
import { AtSign, Plus, BadgeCheck, FileText, X } from 'lucide-react';
import { apiUrl, apiFetch } from '@/lib/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { ExportButton } from '@/components/shared/ExportButton';

// Mock monitoring report — a real per-account report generator is a later pass; this shows
// the shape/UX of what that report will look like once it exists.
const MOCK_SOCIAL_REPORT = {
    handle: '@cybernovr',
    platform: 'twitter',
    generated_at: '2026-08-16 09:00:00',
    summary: {
        impersonation_accounts: 2,
        keyword_mentions_24h: 47,
        sentiment_score: 0.72,
        reach_estimate: 12400,
    },
    impersonation_alerts: [
        {
            handle: '@cybernovr_ng',
            display_name: 'Cybernovr Nigeria',
            similarity_score: 87,
            followers: 23,
            created: '2026-08-01',
            bio_match: true,
            logo_detected: false,
            risk: 'HIGH' as const,
            profile_url: 'https://x.com/cybernovr_ng',
        },
        {
            handle: '@cybernovr.official',
            display_name: 'Cybernovr Official',
            similarity_score: 74,
            followers: 8,
            created: '2026-08-08',
            bio_match: false,
            logo_detected: false,
            risk: 'MEDIUM' as const,
            profile_url: 'https://x.com/cybernovr.official',
        },
    ],
    recent_mentions: [
        { text: 'Just signed up for @cybernovr — great security platform!', sentiment: 'positive' as const, time: '2h ago' },
        { text: 'Anyone tried @cybernovr for SOC monitoring?', sentiment: 'neutral' as const, time: '5h ago' },
        { text: 'Warning: fake @cybernovr account spotted, report it', sentiment: 'negative' as const, time: '8h ago' },
    ],
};

const MENTION_DOT: Record<string, string> = { positive: '🟢', neutral: '⚪', negative: '🔴' };

interface SocialAccount {
    id: string;
    platform: string;
    handle: string;
    display_name: string;
    profile_url: string;
    exec_names: string[];
    keywords: string[];
    followers: number;
    verified: boolean;
    last_checked: string;
}

interface Impersonation {
    id?: string;
    handle: string;
    platform: string;
    score: number;
    followers: number;
    created: string;
    status?: 'open' | 'reported' | 'dismissed';
    risk?: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Mention {
    text: string;
    platform: string;
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    reach?: number;
    time: string;
}

const STATUS_STYLE: Record<string, string> = {
    open: 'bg-red-500/10 text-red-500 border-red-500/30',
    reported: 'bg-blue/10 text-blue border-blue/30',
    dismissed: 'bg-card-muted text-foreground-muted border-border',
};

const SENTIMENT_STYLE: Record<string, string> = {
    Positive: 'bg-blue/10 text-blue border-blue/30',
    Negative: 'bg-red-500/10 text-red-500 border-red-500/30',
    Neutral: 'bg-card-muted text-foreground-muted border-border',
};

function scoreBadge(score: number): string {
    if (score >= 80) return 'bg-red-500/10 text-red-500 border-red-500/30';
    if (score >= 60) return 'bg-purple/10 text-purple border-purple/30';
    return 'bg-card-muted text-foreground-muted border-border';
}

const PLATFORMS = {
    twitter: { label: 'Twitter / X', icon: '𝕏' },
    facebook: { label: 'Facebook', icon: 'f' },
    instagram: { label: 'Instagram', icon: '📷' },
    linkedin: { label: 'LinkedIn', icon: 'in' },
} as const;
type PlatformKey = keyof typeof PLATFORMS;

const TABS = [
    { id: 'accounts', label: 'Official Accounts' },
    { id: 'impersonation', label: 'Impersonation Alerts' },
    { id: 'mentions', label: 'Keyword Mentions' },
] as const;
type Tab = (typeof TABS)[number]['id'];


export function SocialSuite() {
    const [tab, setTab] = useState<Tab>('accounts');
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [impersonations, setImpersonations] = useState<Impersonation[]>([]);
    const [mentions, setMentions] = useState<Mention[]>([]);
    const [loading, setLoading] = useState(true);

    // Add-account modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [platform, setPlatform] = useState<PlatformKey | null>(null);
    const [handle, setHandle] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [profileUrl, setProfileUrl] = useState('');
    const [saving, setSaving] = useState(false);

    // Report view — mock for now; keyed by account id, all accounts see the same mock report
    const [reportAccountId, setReportAccountId] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        Promise.all([
            apiFetch(apiUrl('/api/brand/socials'), { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ socials: [] })),
            apiFetch(apiUrl('/api/brand/socials/alerts'), { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ impersonations: [], mentions: [] })),
        ]).then(([socialsRes, alertsRes]) => {
            setAccounts(Array.isArray(socialsRes?.socials) ? socialsRes.socials : []);
            setImpersonations(Array.isArray(alertsRes?.impersonations) ? alertsRes.impersonations : []);
            setMentions(Array.isArray(alertsRes?.mentions) ? alertsRes.mentions : []);
            setLoading(false);
        });
    };

    useEffect(load, []);

    const resetModal = () => {
        setStep(1);
        setPlatform(null);
        setHandle('');
        setDisplayName('');
        setProfileUrl('');
    };

    const addAccount = async () => {
        if (!platform || !handle.trim()) return;
        setSaving(true);
        try {
            await apiFetch(apiUrl('/api/brand/socials'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform,
                    handle: handle.trim(),
                    display_name: displayName.trim() || handle.trim(),
                    profile_url: profileUrl.trim(),
                }),
            });
            resetModal();
            setShowAddModal(false);
            load();
        } finally {
            setSaving(false);
        }
    };

    const openImpersonations = impersonations.filter((i) => i.status !== 'dismissed').length;
    const totalReach = mentions.reduce((sum, m) => sum + (m.reach ?? 0), 0);

    return (
        <div id="report-content" className="space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-lg font-black text-foreground">Social Suite</h1>
                    <p className="text-xs text-foreground-muted">Brand Protection · Monitor social channels for impersonation and abuse</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButton elementId="report-content" filename="social-suite" title="Social Suite" />
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-orange hover:bg-orange-hover text-white text-xs font-black px-4 py-2.5 rounded-lg transition-colors"
                    >
                        <Plus size={14} />
                        Add Account
                    </button>
                </div>
            </div>

            {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-card border border-border rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-foreground">{accounts.length}</p>
                        <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Accounts Monitored</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-red-500">{openImpersonations}</p>
                        <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Open Impersonations</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-purple">{mentions.length}</p>
                        <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Mentions Tracked</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-blue">{totalReach.toLocaleString()}</p>
                        <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Est. Reach</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                            tab === t.id ? 'border-blue text-blue' : 'border-transparent text-foreground-muted hover:text-foreground'
                        }`}
                    >
                        {t.label}
                        {t.id === 'accounts' && accounts.length > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-blue text-white' : 'bg-card-muted text-foreground-muted'}`}>{accounts.length}</span>
                        )}
                        {t.id === 'impersonation' && impersonations.length > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-blue text-white' : 'bg-card-muted text-foreground-muted'}`}>{impersonations.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-card-muted rounded-xl animate-pulse" />)}</div>
            ) : (
                <>
                    {tab === 'accounts' && (
                        accounts.length === 0 ? (
                            <EmptyState icon={AtSign} title="No social accounts configured" description="Add your brand's social handles to begin monitoring for impersonation and abuse." actionLabel="Add Account" onAction={() => setShowAddModal(true)} />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {accounts.map((acc) => {
                                    const plat = PLATFORMS[acc.platform as PlatformKey];
                                    return (
                                        <div key={acc.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0 text-sm font-black text-blue">
                                                {plat?.icon ?? <AtSign size={18} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-foreground truncate">{acc.handle}</span>
                                                    {acc.verified && <BadgeCheck size={14} className="text-blue flex-shrink-0" />}
                                                </div>
                                                <p className="text-[11px] text-foreground-muted">{plat?.label ?? acc.platform} · {acc.followers.toLocaleString()} followers{acc.verified ? ' · Verified' : ''}</p>
                                                {acc.keywords.length > 0 && (
                                                    <p className="text-[10px] text-foreground-muted mt-1">Keywords: {acc.keywords.join(', ')}</p>
                                                )}
                                                <p className="text-[10px] text-foreground-muted mt-1">Last checked: {acc.last_checked}</p>
                                                <button
                                                    onClick={() => setReportAccountId(acc.id)}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-blue hover:underline mt-1.5"
                                                >
                                                    <FileText size={10} /> View Report
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {tab === 'impersonation' && (
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            {impersonations.length === 0 ? (
                                <p className="text-xs text-foreground-muted text-center py-10">No impersonation alerts detected</p>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-border">
                                            {['Account', 'Platform', 'Score', 'Followers', 'Created', 'Status', 'Actions'].map((h) => (
                                                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {impersonations.map((item) => (
                                            <tr key={item.id ?? item.handle} className="border-b border-border hover:bg-card-muted">
                                                <td className="px-4 py-2.5 font-mono text-foreground">{item.handle}</td>
                                                <td className="px-4 py-2.5 text-foreground-muted">{item.platform}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${scoreBadge(item.score)}`}>{item.score}%</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-foreground-muted">{item.followers.toLocaleString()}</td>
                                                <td className="px-4 py-2.5 text-foreground-muted">{item.created}</td>
                                                <td className="px-4 py-2.5">
                                                    {item.status && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${STATUS_STYLE[item.status]}`}>{item.status}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <button className="text-[10px] font-bold text-blue hover:underline">Report</button>
                                                        <button className="text-[10px] font-bold text-foreground-muted hover:text-foreground">Dismiss</button>
                                                        <button className="text-[10px] font-bold text-foreground-muted hover:text-foreground">View Profile →</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {tab === 'mentions' && (
                        <div className="space-y-2">
                            {mentions.length === 0 ? (
                                <p className="text-xs text-foreground-muted text-center py-10">No mentions found</p>
                            ) : (
                                mentions.map((m, i) => (
                                    <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-card-muted flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-foreground">{m.text}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[10px] text-foreground-muted">{m.platform}</span>
                                                <span className="text-[10px] text-foreground-muted">·</span>
                                                <span className="text-[10px] text-foreground-muted">{m.time}</span>
                                                {m.reach !== undefined && (
                                                    <>
                                                        <span className="text-[10px] text-foreground-muted">·</span>
                                                        <span className="text-[10px] text-foreground-muted">{m.reach.toLocaleString()} reach</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${SENTIMENT_STYLE[m.sentiment]}`}>{m.sentiment}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                        {step === 1 ? (
                            <>
                                <h3 className="font-heading font-bold text-lg text-foreground mb-4">Choose Platform</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => { setPlatform(key); setStep(2); }}
                                            className="flex flex-col items-center gap-2 border border-border rounded-xl p-4 hover:border-blue hover:bg-card-muted transition-colors"
                                        >
                                            <span className="text-xl font-black text-blue">{PLATFORMS[key].icon}</span>
                                            <span className="text-xs font-bold text-foreground">{PLATFORMS[key].label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-end mt-6">
                                    <button onClick={() => { setShowAddModal(false); resetModal(); }} className="text-sm text-foreground-muted hover:text-foreground">Cancel</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-heading font-bold text-lg text-foreground">Account Details</h3>
                                    <button onClick={() => setStep(1)} className="text-[11px] font-bold text-blue hover:underline">Platform: {platform && PLATFORMS[platform].label} (change)</button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Official Handle</label>
                                        <input type="text" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@cybernovr"
                                            className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-blue" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Display Name</label>
                                        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Cybernovr"
                                            className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-blue" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Profile URL</label>
                                        <input type="text" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="https://x.com/cybernovr"
                                            className="w-full mt-1 bg-card-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-blue" />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => { setShowAddModal(false); resetModal(); }} className="flex-1 border border-border text-foreground-muted py-2.5 rounded-lg text-sm hover:border-grey-300 transition-colors">Cancel</button>
                                    <button onClick={addAccount} disabled={saving || !handle.trim()} className="flex-1 bg-orange hover:bg-orange-hover disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">
                                        {saving ? 'Adding…' : 'Start Monitoring'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {reportAccountId && (() => {
                const acc = accounts.find((a) => a.id === reportAccountId);
                const plat = acc ? PLATFORMS[acc.platform as PlatformKey] : PLATFORMS.twitter;
                const r = MOCK_SOCIAL_REPORT;
                return (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                        <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-1">
                                    <div>
                                        <h3 className="font-heading font-bold text-lg text-foreground">{acc?.handle ?? r.handle} · {plat?.label ?? 'Report'}</h3>
                                        <p className="text-[11px] text-foreground-muted">Generated: {r.generated_at}</p>
                                    </div>
                                    <button onClick={() => setReportAccountId(null)} className="text-foreground-muted hover:text-foreground" aria-label="Close report">
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Summary */}
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="border border-border rounded-lg p-3">
                                        <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Impersonation Accounts</p>
                                        <p className="text-xl font-black text-red-500">{r.summary.impersonation_accounts}</p>
                                    </div>
                                    <div className="border border-border rounded-lg p-3">
                                        <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Mentions (24h)</p>
                                        <p className="text-xl font-black text-blue">{r.summary.keyword_mentions_24h}</p>
                                    </div>
                                    <div className="border border-border rounded-lg p-3">
                                        <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Sentiment</p>
                                        <p className="text-xl font-black text-purple">{Math.round(r.summary.sentiment_score * 100)}% positive</p>
                                    </div>
                                    <div className="border border-border rounded-lg p-3">
                                        <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Est. Reach</p>
                                        <p className="text-xl font-black text-foreground">{r.summary.reach_estimate.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Impersonation alerts */}
                                <div className="mt-5">
                                    <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wide mb-2">⚠️ Impersonation Alerts ({r.impersonation_alerts.length})</p>
                                    <div className="space-y-2">
                                        {r.impersonation_alerts.map((a) => (
                                            <div key={a.handle} className="border border-border rounded-lg p-3">
                                                <div className="min-w-0">
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${a.risk === 'HIGH' ? 'bg-red-500 text-white' : 'bg-grey-100 text-amber'}`}>{a.risk}</span>
                                                    <span className="text-xs font-bold text-foreground">{a.handle}</span>
                                                    <span className="text-[11px] text-foreground-muted"> — {a.similarity_score}% similarity, {a.followers} followers</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <button className="text-[10px] font-bold text-blue hover:underline">Report to Platform</button>
                                                    <a href={a.profile_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-foreground-muted hover:text-foreground">View Profile</a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recent mentions */}
                                <div className="mt-5">
                                    <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wide mb-2">Recent Mentions ({r.recent_mentions.length})</p>
                                    <div className="space-y-2">
                                        {r.recent_mentions.map((m, i) => (
                                            <div key={i} className="flex items-start gap-2 text-xs">
                                                <span className="flex-shrink-0">{MENTION_DOT[m.sentiment]}</span>
                                                <span className="flex-1 text-foreground">&ldquo;{m.text}&rdquo;</span>
                                                <span className="text-[10px] text-foreground-muted flex-shrink-0">{m.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button className="flex-1 border border-border text-foreground-muted py-2.5 rounded-lg text-sm hover:border-grey-300 transition-colors">Export Report PDF</button>
                                    <button className="flex-1 bg-purple hover:bg-purple-hover text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">Schedule Weekly Report</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
