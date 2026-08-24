'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell, Sun, Moon } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { useTheme } from '@/components/providers/ThemeProvider';

interface HeaderProps {
    initials: string;
    onSignOut: () => void;
}

function humanizePathname(pathname: string): string {
    if (pathname.endsWith('/dashboard')) return 'General';
    const last = pathname.split('/').filter(Boolean).pop() ?? '';
    return last
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export function Header({ initials, onSignOut }: HeaderProps) {
    const pathname = usePathname();
    const pageTitle = humanizePathname(pathname);
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <header className="h-14 bg-white border-b border-grey-100 flex items-center gap-4 px-6 sticky top-0 z-30 w-full">
            {/* Left */}
            <div className="flex items-center gap-2 min-w-fit">
                <Logo size="sm" />
                <span className="text-grey-300">/</span>
                <span className="text-sm text-grey-500">{pageTitle}</span>
            </div>

            {/* Center — search */}
            <div className="flex-1 flex justify-center">
                <div className="relative w-full max-w-[480px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
                    <input
                        type="text"
                        placeholder="Search incidents, alerts, assets, threats..."
                        className="w-full bg-grey-50 border border-grey-100 rounded-lg pl-9 pr-16 py-2 text-sm text-grey-800 placeholder:text-grey-500 focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20"
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 border border-grey-100 rounded px-1.5 py-0.5 text-xs text-grey-500 font-mono">⌘K</kbd>
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 min-w-fit">
                <div className="flex items-center gap-1.5 bg-blue text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
                    Telemetry Online
                </div>
                <button onClick={onSignOut} className="text-sm text-grey-500 hover:text-red transition-colors">
                    Sign Out
                </button>
                <div className="w-px h-4 bg-grey-100" />
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green" />
                    <span className="text-sm text-grey-800">Cloud Node</span>
                </div>
                <button
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className="text-grey-500 hover:text-grey-800 transition-colors"
                    aria-label="Toggle theme"
                >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <div className="relative">
                    <Bell size={18} className="text-grey-500" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red rounded-full" />
                </div>
                <div className="w-8 h-8 rounded-full bg-purple text-white flex items-center justify-center text-xs font-bold">
                    {initials}
                </div>
            </div>
        </header>
    );
}
