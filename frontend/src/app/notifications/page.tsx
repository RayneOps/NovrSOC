'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TYPE_CONFIG, type Notification, type NotifType } from '@/data/notifications';
import { apiUrl } from '@/lib/api';

const FILTERS: Array<'all' | NotifType> = ['all', 'critical', 'warning', 'info'];

export default function NotificationsPage() {
    const [allRead, setAllRead] = useState(false);
    const [filter, setFilter]   = useState<'all' | NotifType>('all');
    const [notifications, setNotifications] = useState<Notification[] | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/wazuh/notifications'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setNotifications(Array.isArray(data) ? data : []))
            .catch(() => setNotifications([]));
    }, []);

    const all = notifications ?? [];
    const displayed = all.filter(n => filter === 'all' || n.type === filter);
    const totalUnread = allRead ? 0 : all.filter(n => !n.read).length;
    const criticalCount = all.filter(n => n.type === 'critical').length;

    return (
        <div className="min-h-screen bg-[#F8FAFC]">

            {/* Page header */}
            <header className="bg-card border-b border-border sticky top-0 z-20 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 h-[64px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard"
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-card-muted hover:bg-card-muted text-foreground-muted transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15,18 9,12 15,6" />
                            </svg>
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple flex items-center justify-center">
                                <span className="text-[9px] font-black text-white">NVR</span>
                            </div>
                            <span className="font-black text-foreground text-sm tracking-tight">NovrSOC</span>
                            <span className="text-border select-none">/</span>
                            <span className="text-xs font-semibold text-foreground-muted">Notifications</span>
                        </div>
                    </div>
                    {!allRead && totalUnread > 0 && (
                        <button
                            onClick={() => setAllRead(true)}
                            className="text-xs font-semibold text-blue hover:underline transition-colors"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total',    value: all.length,           color: 'text-foreground', bg: 'bg-card' },
                        { label: 'Unread',   value: totalUnread,          color: 'text-green',  bg: 'bg-green/10 border-green/10' },
                        { label: 'Critical', value: criticalCount,        color: 'text-red-500',   bg: 'bg-red-500/10 border-red-500/10' },
                    ].map(stat => (
                        <div key={stat.label} className={`${stat.bg} rounded-xl border border-border p-4 shadow-sm`}>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black ${stat.color} tracking-tight`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${
                                filter === f
                                    ? 'bg-blue text-white border-blue'
                                    : 'bg-card text-foreground-muted border-border hover:border-border hover:text-foreground'
                            }`}
                        >
                            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                    <span className="ml-auto text-[11px] text-foreground-muted font-medium">{displayed.length} notification{displayed.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Notification list */}
                <div className="rounded-xl border border-border overflow-hidden shadow-sm bg-card">
                    {/* Accent bar */}
                    <div className="h-[3px] bg-blue" />

                    {notifications === null ? (
                        <div className="p-6 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-card-muted rounded animate-pulse" />)}</div>
                    ) : all.length === 0 ? (
                        <div className="py-16 text-center text-foreground-muted text-sm">No recent alerts. Your environment looks clean.</div>
                    ) : displayed.length === 0 ? (
                        <div className="py-16 text-center text-foreground-muted text-sm">No notifications match this filter.</div>
                    ) : (
                        displayed.map((notif, idx) => {
                            const cfg    = TYPE_CONFIG[notif.type];
                            const isRead = notif.read || allRead;
                            return (
                                <div
                                    key={notif.id}
                                    className={`border-l-[4px] ${cfg.border} ${isRead ? 'bg-card' : cfg.unreadBg} px-6 py-5 ${idx < displayed.length - 1 ? 'border-b border-border' : ''} hover:brightness-[0.97] transition-all`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                                                    {cfg.label}
                                                </span>
                                                {!isRead && (
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                                )}
                                            </div>
                                            <p className={`text-sm font-bold mb-1 ${isRead ? 'text-foreground-muted' : 'text-foreground'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-foreground-muted leading-relaxed">{notif.description}</p>
                                        </div>
                                        <span className="text-[11px] text-foreground-muted flex-shrink-0 mt-1">{notif.time}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer link back */}
                <div className="flex items-center justify-center pt-2">
                    <Link
                        href="/dashboard"
                        className="text-xs font-semibold text-foreground-muted hover:text-blue transition-colors"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
