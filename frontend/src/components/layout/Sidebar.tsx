'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LogOut, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    // Hidden unless user.role === 'super_admin'. Only meaningful in the admin portal today —
    // the client portal's nav has no such role tier.
    adminOnly?: boolean;
}

export interface NavGroup {
    section: string;
    items: NavItem[];
    collapsible: boolean;
    icon?: LucideIcon;
    groupLabel?: string;
}

interface SidebarProps {
    navGroups: NavGroup[];
    user: { name: string; email: string; role: string };
    onLogout: () => void;
}

export function Sidebar({ navGroups, user, onLogout }: SidebarProps) {
    const pathname = usePathname();

    // Drop adminOnly items for anyone who isn't a super_admin, then drop any group left with
    // no items at all (a group whose items were entirely adminOnly would otherwise render as
    // an empty, uselessly-clickable accordion header).
    const visibleGroups = navGroups
        .map((group) => ({ ...group, items: group.items.filter((item) => !item.adminOnly || user.role === 'super_admin') }))
        .filter((group) => group.items.length > 0);

    const getDefaultOpen = () => {
        for (const group of visibleGroups) {
            if (group.collapsible && group.items.some((item) => pathname.startsWith(item.href))) {
                return group.section;
            }
        }
        return null;
    };

    const [openGroup, setOpenGroup] = useState<string | null>(getDefaultOpen);

    const toggleGroup = (section: string) => {
        setOpenGroup((prev) => (prev === section ? null : section));
    };

    const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <aside className="w-[260px] min-h-screen bg-white border-r border-border text-foreground flex flex-col fixed left-0 top-0 z-40">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-border">
                <Logo size="md" />
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
                {visibleGroups.map((group, gi) => (
                    <div key={gi}>
                        {gi > 0 && group.section && <div className="border-t border-border my-3 mx-1" />}

                        {!group.collapsible &&
                            group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm mb-1 transition-colors',
                                            isActive
                                                ? 'bg-purple text-white font-semibold'
                                                : 'text-foreground-muted hover:text-purple hover:bg-[#F5F0FF]'
                                        )}
                                    >
                                        <Icon size={18} />
                                        {item.label}
                                    </Link>
                                );
                            })}

                        {group.collapsible && (
                            <>
                                {/* The section label IS the accordion trigger — no separate button row */}
                                {group.section && (
                                    <button
                                        onClick={() => toggleGroup(group.section)}
                                        className="w-full flex items-center justify-between px-4 py-2 mt-3 group"
                                    >
                                        <span className="text-foreground-muted text-[9px] font-bold uppercase tracking-widest">
                                            {group.section}
                                        </span>
                                        <ChevronRight
                                            size={14}
                                            className={cn('text-foreground-muted transition-transform duration-200', openGroup === group.section && 'rotate-90')}
                                        />
                                    </button>
                                )}

                                {openGroup === group.section && (
                                    <div className="mt-1 mb-2">
                                        {group.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = pathname === item.href;
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={cn(
                                                        'flex items-center gap-3 pl-8 pr-4 py-2 rounded-lg text-sm transition-colors',
                                                        isActive ? 'text-white font-medium bg-purple' : 'text-foreground-muted hover:text-purple hover:bg-[#F5F0FF]'
                                                    )}
                                                >
                                                    <Icon size={16} />
                                                    {item.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </nav>

            {/* User footer */}
            <div className="border-t border-border px-4 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{user.name}</div>
                    <div className="text-xs text-foreground-muted truncate">{user.role}</div>
                </div>
                <button onClick={onLogout} className="text-foreground-muted hover:text-red-500 transition-colors" aria-label="Sign out">
                    <LogOut size={16} />
                </button>
            </div>
        </aside>
    );
}
