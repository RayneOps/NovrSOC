'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TYPE_CONFIG, type Notification } from '@/data/notifications';
import type { AccountData } from '@/lib/account';
import React from 'react';
import { apiUrl } from '@/lib/api';

function usageColor(pct: number): string {
    if (pct > 80) return 'bg-red';
    if (pct >= 60) return 'bg-amber';
    return 'bg-green';
}

const baseHealthRows: { label: string; status?: string; value?: string }[] = [
    { label: 'Wazuh Manager',   status: 'Healthy' },
    { label: 'Elastic Cluster', status: 'Healthy' },
    { label: 'API Gateway',     status: 'Operational' },
    { label: 'Database',        status: 'Healthy' },
    { label: 'Version',         value: 'NovrSOC v1.0' },
];

function minsAgo(iso: string): string {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 1) return 'Just now';
    return mins === 1 ? '1 min ago' : `${mins} min ago`;
}

const quickActions = [
    { icon: '＋', label: 'Add Organization' },
    { icon: '＋', label: 'Invite User' },
    { icon: '⚡', label: 'Create API Key' },
    { icon: '📊', label: 'Generate Report' },
    { icon: '📥', label: 'Export Dashboard' },
    { icon: '⚙',  label: 'Platform Settings' },
    { icon: '🛡',  label: 'Run Security Scan' },
];

function statusColor(s: string) {
    if (['Healthy', 'Operational'].includes(s)) return 'text-green';
    if (s === 'Warning') return 'text-amber';
    return 'text-red';
}
function statusDot(s: string) {
    if (['Healthy', 'Operational'].includes(s)) return 'bg-green';
    if (s === 'Warning') return 'bg-amber';
    return 'bg-red';
}

const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm bg-card">
        <div className="h-[3px] bg-blue" />
        {children}
    </div>
);

export const RightRail = () => {
    const [panelOpen, setPanelOpen] = useState(false);
    const [seen,      setSeen]      = useState(false);
    const [allRead,   setAllRead]   = useState(false);
    const [ctipStats, setCtipStats] = useState<{ sources_active: number; last_collector_run: string } | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/threat-intel/stats'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setCtipStats(data))
            .catch(() => {});
    }, []);

    const [notifications, setNotifications] = useState<Notification[] | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/wazuh/notifications'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setNotifications(Array.isArray(data) ? data : []))
            .catch(() => setNotifications([]));
    }, []);

    const [account, setAccount] = useState<AccountData | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('portal_token') || localStorage.getItem('admin_token');
        if (!token) return;
        fetch(apiUrl('/api/account'), {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((data: AccountData) => setAccount(data))
            .catch(() => {});
    }, []);

    const healthRows = [
        ...baseHealthRows.slice(0, 4),
        {
            label: 'Intelligence Feed',
            value: ctipStats
                ? `${ctipStats.sources_active} sources active, last sync ${minsAgo(ctipStats.last_collector_run)}`
                : '...',
        },
        ...baseHealthRows.slice(4),
    ];

    const unreadCount = allRead ? 0 : (notifications ?? []).filter(n => !n.read).length;
    const openPanel  = () => { setPanelOpen(true); setSeen(true); };
    const closePanel = () => setPanelOpen(false);

    return (
        <>
            <aside className="w-[305px] bg-card border-l border-border h-screen sticky top-0 flex flex-col z-30 flex-shrink-0">

                {/* Top controls */}
                <div className="h-[64px] border-b border-border px-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
                        </span>
                        <span className="text-[10px] font-bold text-foreground-muted">Cloud Node</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={openPanel}
                            className="relative w-8 h-8 rounded-lg bg-card-muted border border-border flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            {!seen && unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red rounded-full border-2 border-card" />
                            )}
                        </button>

                        <div className="w-8 h-8 rounded-full bg-purple flex items-center justify-center cursor-pointer flex-shrink-0">
                            <span className="text-[10px] font-black text-white">MA</span>
                        </div>
                    </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
                    <Card>
                        <div className="p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-xs">🏢</span>
                                <h4 className="text-[11px] font-bold text-foreground border-b border-border pb-3 mb-3">Account Overview</h4>
                            </div>
                            {!account ? (
                                <div className="space-y-2 py-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-4 bg-card-muted rounded animate-pulse" />)}</div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-9 h-9 rounded-full bg-purple flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-black text-white">{account.org.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-foreground truncate">{account.org.name}</p>
                                            <p className="text-[9px] text-foreground-muted truncate">{account.org.industry}</p>
                                        </div>
                                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 bg-blue/10 text-blue border border-blue/30 rounded-full flex-shrink-0">{account.org.plan}</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
                                        {[
                                            { label: 'Endpoints', value: account.stats.total_endpoints },
                                            { label: 'Incidents', value: account.stats.active_incidents },
                                            { label: 'Members', value: account.stats.member_count },
                                        ].map(s => (
                                            <div key={s.label} className="bg-card-muted rounded-lg py-1.5">
                                                <p className="text-xs font-black text-foreground">{s.value}</p>
                                                <p className="text-[8px] text-foreground-muted uppercase tracking-wide">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[9px] text-foreground-muted">Endpoints</span>
                                            <span className="text-[9px] font-semibold text-foreground">{account.subscription.endpoints_used} / {account.subscription.endpoints_limit} used</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-card-muted rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${usageColor(account.subscription.usage_percent)}`} style={{ width: `${Math.min(100, account.subscription.usage_percent)}%` }} />
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-border space-y-0.5">
                                        <p className="text-[10px] font-semibold text-foreground">{account.org.contact_name}</p>
                                        <p className="text-[9px] text-foreground-muted">{account.org.contact_email}</p>
                                    </div>
                                </>
                            )}
                            <div className="mt-3 pt-3 border-t border-border">
                                <Link href="/account" className="text-[10px] font-semibold text-blue hover:underline">View Full Account →</Link>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-xs">🟢</span>
                                <h4 className="text-[11px] font-bold text-foreground border-b border-border pb-3 mb-3">Platform Health</h4>
                            </div>
                            <p className="text-[10px] text-foreground-muted mb-3">Overall platform status.</p>
                            <div className="space-y-2">
                                {healthRows.map(row => (
                                    <div key={row.label} className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-foreground-muted">{row.label}</span>
                                        {row.status ? (
                                            <span className={`flex items-center gap-1 text-[10px] font-semibold ${statusColor(row.status)}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(row.status)}`} />
                                                {row.status}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-medium text-foreground">{row.value}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-border">
                                <button className="text-[10px] font-semibold text-blue hover:underline">View System Status →</button>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-xs">⚡</span>
                                <h4 className="text-[11px] font-bold text-foreground border-b border-border pb-3 mb-3">Quick Actions</h4>
                            </div>
                            <p className="text-[10px] text-foreground-muted mb-3">Frequently used administrative tasks.</p>
                            <div className="space-y-0.5">
                                {quickActions.map(action => (
                                    <button key={action.label} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-blue/10 transition-all group text-left">
                                        <span className="text-xs w-4 text-center flex-shrink-0">{action.icon}</span>
                                        <span className="text-[10px] font-semibold text-foreground-muted group-hover:text-blue transition-colors">{action.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-border">
                                <button className="text-[10px] font-semibold text-blue hover:underline">View All Actions →</button>
                            </div>
                        </div>
                    </Card>
                </div>
            </aside>

            {/* Overlay */}
            <div onClick={closePanel} className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${panelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

            {/* Notification panel */}
            <div className={`fixed inset-y-0 right-0 w-[380px] bg-card z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-[56px] border-b border-border px-5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <h2 className="font-bold text-foreground text-sm">Notifications</h2>
                        {unreadCount > 0 && (
                            <span className="text-[10px] font-black bg-red text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {!allRead && (
                            <button onClick={() => setAllRead(true)} className="text-[11px] font-semibold text-blue hover:underline">Mark all as read</button>
                        )}
                        <button onClick={closePanel} className="w-7 h-7 rounded-lg bg-card-muted flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {notifications === null ? (
                        <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 skeleton-shimmer rounded" />)}</div>
                    ) : notifications.length === 0 ? (
                        <div className="py-16 px-6 text-center">
                            <p className="text-xs text-foreground-muted">No recent alerts. Your environment looks clean.</p>
                        </div>
                    ) : (
                        notifications.map(notif => {
                            const cfg = TYPE_CONFIG[notif.type];
                            const isRead = notif.read || allRead;
                            return (
                                <div key={notif.id} className={`border-l-[4px] ${cfg.border} ${isRead ? 'bg-card' : cfg.unreadBg} px-4 py-4 border-b border-border cursor-pointer hover:brightness-95 transition-all`}>
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                                        <span className="text-[10px] text-foreground-muted flex-shrink-0">{notif.time}</span>
                                    </div>
                                    <p className={`text-xs font-bold mb-1 ${isRead ? 'text-foreground-muted' : 'text-foreground'}`}>{notif.title}</p>
                                    <p className="text-[11px] text-foreground-muted leading-snug">{notif.description}</p>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="border-t border-border px-5 py-3 flex-shrink-0">
                    <Link href="/notifications" onClick={closePanel} className="text-[11px] font-semibold text-blue hover:underline">View all notifications →</Link>
                </div>
            </div>
        </>
    );
};
