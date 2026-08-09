'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, AlertTriangle, Monitor, Bell, Shield, Radio, Search,
    Building2, CheckSquare, Bug, Zap, FileText, Target, Users, UserCog, Settings,
    Activity, Brain, ChevronDown, ChevronUp, User, FileDown, Globe, Fingerprint,
    type LucideIcon,
} from 'lucide-react';
import { getPortalContext, type PortalContext } from '@/lib/portal-context';
import { portalSignOut } from '@/lib/portal-auth';
import { isAdminAuthenticated, adminSignOut } from '@/lib/admin-auth';

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
}

interface NavSection {
    section: string;
    items: NavItem[];
}

const ADMIN_SECTIONS: NavSection[] = [
    {
        section: 'Security Operations',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { label: 'Incidents', href: '/security-operations/incidents', icon: AlertTriangle },
            { label: 'Asset Inventory', href: '/assets', icon: Monitor },
            { label: 'MITRE ATT&CK', href: '/security-operations/mitre', icon: Target },
        ],
    },
    {
        section: "Network Intelligence",
        items: [
            {
                label: "Geo Intelligence",
                href: "/geo-intelligence",
                icon: Globe
            }
        ]
    },
    {
        section: 'Threat Intelligence',
        items: [
            { label: 'Threat Advisory', href: '/threat-intelligence/advisory', icon: Bell },
            { label: 'Threat Management', href: '/threat-intelligence/threats', icon: Shield },
            { label: 'CTI Feed', href: '/threat-intelligence/cti', icon: Radio },
            { label: 'URL Scanner', href: '/threat-intelligence/url-scan', icon: Search },
            { label: 'DNS Suite', href: '/threat-intelligence/dns', icon: Globe },
            { label: 'Domain Suite', href: '/threat-intelligence/domains', icon: Fingerprint },
            { label: 'Campaigns', href: '/threat-intelligence/campaigns', icon: Activity },
        ],
    },
    {
        section: 'Risk & Compliance',
        items: [
            { label: 'Vendor Assessment', href: '/assets/vendors', icon: Building2 },
            { label: 'CVEs', href: '/exposure/cves', icon: Bug },
            { label: 'Compliance', href: '/compliance', icon: CheckSquare },
        ],
    },
    {
        section: 'Operations',
        items: [
            { label: 'SOAR', href: '/protection/soar', icon: Zap },
            { label: 'Reports', href: '/reporting', icon: FileText },
            { label: 'Security Reports', href: '/reports', icon: FileDown },
            { label: 'NovrAI', href: '/novr-ai', icon: Brain },
            { label: 'Account Overview', href: '/account', icon: User },
        ],
    },
    {
        section: 'Administration',
        items: [
            { label: 'Customers', href: '/customers', icon: Users },
            { label: 'Users', href: '/admin/users', icon: UserCog },
            { label: 'Settings', href: '/admin/settings', icon: Settings },
        ],
    },
];

const PORTAL_SECTIONS: NavSection[] = [
    {
        section: 'Security Operations',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { label: 'Incidents', href: '/security-operations/incidents', icon: AlertTriangle },
            { label: 'Asset Inventory', href: '/assets', icon: Monitor },
            { label: 'Security Reports', href: '/reports', icon: FileDown },
            { label: 'Account', href: '/account', icon: User },
        ],
    },
    {
        section: 'Threat Intelligence',
        items: [
            { label: 'Threat Advisory', href: '/threat-intelligence/advisory', icon: Bell },
            { label: 'Threat Management', href: '/threat-intelligence/threats', icon: Shield },
            { label: 'CTI Feed', href: '/threat-intelligence/cti', icon: Radio },
            { label: 'URL Scanner', href: '/threat-intelligence/url-scan', icon: Search },
            { label: 'DNS Suite', href: '/threat-intelligence/dns', icon: Globe },
            { label: 'Domain Suite', href: '/threat-intelligence/domains', icon: Fingerprint },
        ],
    },
];

const DEFAULT_OPEN = new Set(['Security Operations', 'Threat Intelligence']);

const NOT_PORTAL: PortalContext = { isPortal: false, orgId: null, orgName: null, orgIndustry: null, wazuhGroup: null, portalRole: null };

export const Sidebar = () => {
    const pathname = usePathname();
    const [portal, setPortal] = useState<PortalContext>(NOT_PORTAL);
    const [isAdmin, setIsAdmin] = useState(false);
    const [openSections, setOpenSections] = useState<Set<string>>(DEFAULT_OPEN);

    useEffect(() => {
        setPortal(getPortalContext());
        setIsAdmin(isAdminAuthenticated());
    }, []);

    const sections = portal.isPortal ? PORTAL_SECTIONS : ADMIN_SECTIONS;
    const isActive = (href: string) => pathname === href;
    const signOut = portal.isPortal ? portalSignOut : adminSignOut;

    const toggleSection = (section: string) => {
        setOpenSections((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    return (
        <aside className="w-[280px] bg-card border-r border-border h-screen sticky top-0 flex flex-col z-30 select-none flex-shrink-0">

            {/* Logo */}
            <div className="p-4 border-b border-border flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/novrsoc.jpg"
                    alt="NovrSOC"
                    style={{
                        height: '32px',
                        width: 'auto',
                        maxWidth: '140px',
                        objectFit: 'contain',
                        display: 'block',
                    }}
                />
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-muted mt-1.5">
                    SOC Platform
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin space-y-0.5">
                {sections.map((navSection) => {
                    const isOpen = openSections.has(navSection.section);
                    return (
                        <div key={navSection.section}>
                            <button
                                onClick={() => toggleSection(navSection.section)}
                                className="w-full text-xs font-semibold uppercase text-foreground-muted flex items-center justify-between px-3 py-2 hover:bg-card-muted hover:text-foreground cursor-pointer rounded-md transition-colors"
                            >
                                <span>{navSection.section}</span>
                                {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                            {isOpen && (
                                <div className="space-y-0.5 mb-1">
                                    {navSection.items.map((item) => {
                                        const active = isActive(item.href);
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-semibold transition-colors duration-150 border-l-2 ${
                                                    active
                                                        ? 'bg-blue/10 text-blue border-blue'
                                                        : 'text-foreground-muted hover:text-foreground hover:bg-blue/10 border-transparent'
                                                }`}
                                            >
                                                <Icon size={15} strokeWidth={2} className="flex-shrink-0" />
                                                <span>{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-border flex-shrink-0 space-y-2">
                {portal.isPortal && (
                    <div className="px-3 py-2 bg-card-muted border border-border rounded-lg">
                        <span className="block text-[11px] font-black text-foreground truncate">{portal.orgName}</span>
                        <span className="inline-block mt-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-blue/10 text-blue border border-blue/30 rounded leading-none">
                            Client Portal
                        </span>
                    </div>
                )}
                {(portal.isPortal || isAdmin) && (
                    <button
                        onClick={signOut}
                        className="w-full text-[11px] font-bold text-foreground-muted hover:text-red hover:bg-red/10 border border-border rounded-lg px-3 py-2 transition-colors"
                    >
                        Sign Out
                    </button>
                )}
            </div>
        </aside>
    );
};
