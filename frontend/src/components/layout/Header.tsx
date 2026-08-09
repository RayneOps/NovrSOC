'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, Bell } from 'lucide-react';
import { getPortalContext, type PortalContext } from '@/lib/portal-context';
import { portalSignOut } from '@/lib/portal-auth';
import { isAdminAuthenticated, adminSignOut } from '@/lib/admin-auth';
import { useTheme } from '@/components/providers/ThemeProvider';

interface HeaderProps {
    currentDashboard: string;
}

const NOT_PORTAL: PortalContext = { isPortal: false, orgId: null, orgName: null, orgIndustry: null, wazuhGroup: null, portalRole: null };

export const Header = ({ currentDashboard }: HeaderProps) => {
    const [portal, setPortal] = useState<PortalContext>(NOT_PORTAL);
    const [isAdmin, setIsAdmin] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();

    useEffect(() => {
        setPortal(getPortalContext());
        setIsAdmin(isAdminAuthenticated());
    }, []);

    const signOut = portal.isPortal ? portalSignOut : adminSignOut;
    const isDark = resolvedTheme === 'dark';

    return (
        <header className="h-[64px] bg-card border-b border-border sticky top-0 px-6 flex items-center justify-between z-20">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                {portal.isPortal ? (
                    <>
                        <span className="font-black text-foreground text-sm tracking-tight truncate">{portal.orgName}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 bg-blue/10 text-blue border border-blue/30 rounded-full flex-shrink-0">Portal</span>
                    </>
                ) : (
                    <span className="font-black text-foreground text-sm tracking-tight">NovrSOC</span>
                )}
                <span className="text-foreground-muted select-none">/</span>
                <span className="text-xs font-semibold text-foreground-muted truncate">{currentDashboard}</span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xl ml-8 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Search incidents, alerts, assets, threats…"
                    className="w-full bg-card-muted border border-border rounded-lg pl-8 pr-12 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all text-foreground placeholder:text-foreground-muted"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-foreground-muted bg-card px-1.5 py-0.5 rounded border border-border pointer-events-none">
                    ⌘K
                </kbd>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <span className="hidden sm:inline-block text-[10px] font-bold bg-green text-white px-2.5 py-1 rounded-full">
                    Telemetry Online
                </span>

                <button
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-card-muted transition-colors"
                    aria-label="Toggle theme"
                >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <Link
                    href="/notifications"
                    className="relative w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-card-muted transition-colors"
                    aria-label="Notifications"
                >
                    <Bell size={16} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red" />
                </Link>

                {portal.isPortal || isAdmin ? (
                    <button onClick={signOut}
                        className="text-[10px] font-bold text-foreground-muted hover:text-red border border-border rounded-lg px-3 py-1.5 transition-colors">
                        Sign Out
                    </button>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-purple flex items-center justify-center cursor-pointer flex-shrink-0">
                        <span className="text-[10px] font-black text-white">MA</span>
                    </div>
                )}
            </div>
        </header>
    );
};
