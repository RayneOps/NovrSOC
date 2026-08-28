'use client';

import {
    LayoutDashboard, FileBarChart, Globe, Users, Shield, UserCheck, Smartphone, Code,
    Crosshair, AlertTriangle, Link as LinkIcon, Building, Building2, Server, Network, Cpu,
    Mail, MessageSquare, ShieldAlert, Activity, Siren, ClipboardList, Briefcase, Zap,
    HardDrive, BarChart, CreditCard, Settings, Database, BookOpen, FileText, ScrollText,
    ClipboardCheck, Bot, WifiOff,
} from 'lucide-react';
import { Sidebar, type NavGroup } from './Sidebar';

// Reorganised per the platform-wide nav restructure. Every href below points at a route that
// actually exists (either pre-existing or newly built alongside this reorg) — several of the
// requested paths in the original spec didn't match this codebase's real routes (e.g. IOC
// Lookup is /admin/threat/cti not /admin/threat/ioc-lookup, URL Scanner is
// /admin/threat/urlscan not /admin/threat/url) and were kept at their real, working paths
// rather than moved, since renaming a route breaks bookmarks/links for no benefit.
const adminNav: NavGroup[] = [
    {
        section: 'Overview',
        collapsible: true,
        icon: LayoutDashboard,
        groupLabel: 'Overview',
        items: [
            { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
            { label: 'Executive Report', href: '/admin/executive', icon: FileBarChart },
        ],
    },
    {
        section: 'Security Operations',
        collapsible: true,
        icon: Activity,
        groupLabel: 'Security Operations',
        items: [
            { label: 'Incidents', href: '/admin/secops/incidents', icon: Siren },
            { label: 'Alerts', href: '/admin/secops/threats', icon: Activity },
            { label: 'Cases', href: '/admin/secops/cases', icon: Briefcase },
            { label: 'Threat Hunting', href: '/admin/secops/hunting', icon: Crosshair },
            { label: 'Playbooks', href: '/admin/secops/playbooks', icon: BookOpen },
            { label: 'SOAR Automation', href: '/admin/secops/soar', icon: Zap },
            { label: 'Shift Handover', href: '/admin/secops/handover', icon: ClipboardList },
            { label: 'Reports Center', href: '/admin/secops/reports', icon: FileText },
        ],
    },
    {
        section: 'Threat Intelligence',
        collapsible: true,
        icon: Crosshair,
        groupLabel: 'Threat Intelligence',
        items: [
            { label: 'IOC Lookup', href: '/admin/threat/cti', icon: Crosshair },
            { label: 'Threat Feeds', href: '/admin/threat/feeds', icon: Database },
            { label: 'Nigerian Threat Feed', href: '/admin/threat/nigeria', icon: Globe },
            { label: 'MITRE ATT&CK', href: '/admin/threat/mitre', icon: ShieldAlert },
            { label: 'Threat Advisory', href: '/admin/threat/advisory', icon: AlertTriangle },
            { label: 'URL Scanner', href: '/admin/threat/urlscan', icon: LinkIcon },
            { label: 'Vendor Assessments', href: '/admin/threat/vendor', icon: Building },
        ],
    },
    {
        section: 'Brand Protection',
        collapsible: true,
        icon: Shield,
        groupLabel: 'Brand Protection',
        items: [
            { label: 'Domain Suite', href: '/admin/brand/domain', icon: Globe },
            { label: 'Social Suite', href: '/admin/brand/social', icon: Users },
            { label: 'Brand Suite', href: '/admin/brand/brand', icon: Shield },
            { label: 'Executive Monitoring', href: '/admin/brand/executive', icon: UserCheck },
            { label: 'Mobile App Suite', href: '/admin/brand/mobile', icon: Smartphone },
            { label: 'Intelli CODE', href: '/admin/brand/copyid', icon: Code },
        ],
    },
    {
        section: 'Infrastructure & Assets',
        collapsible: true,
        icon: Server,
        groupLabel: 'Infrastructure & Assets',
        items: [
            { label: 'Digital Assets', href: '/admin/infra/assets', icon: Server },
            { label: 'Network Topology', href: '/admin/infra/topology', icon: Network },
            { label: 'Vulnerability Management', href: '/admin/infra/vulnerabilities', icon: ShieldAlert },
            { label: 'WebLogic Appliances', href: '/admin/infra/weblogic', icon: Cpu },
            { label: 'DNS Suite', href: '/admin/infra/dns', icon: Network },
            { label: 'Shadow IT', href: '/admin/infra/shadow', icon: WifiOff },
        ],
    },
    {
        section: 'Email Security',
        collapsible: true,
        icon: Mail,
        groupLabel: 'Email Security',
        items: [
            { label: 'DMARC SaaS', href: '/admin/email/dmarc', icon: Mail },
            { label: 'Messaging Suite', href: '/admin/email/messaging', icon: MessageSquare },
            { label: 'PHISHID', href: '/admin/email/phishid', icon: ShieldAlert },
            { label: 'Email Investigation', href: '/admin/email/investigate', icon: Crosshair },
        ],
    },
    {
        section: 'Compliance',
        collapsible: true,
        icon: ClipboardCheck,
        groupLabel: 'Compliance',
        items: [
            { label: 'Compliance Dashboard', href: '/admin/compliance', icon: ClipboardCheck },
            { label: 'NDPA', href: '/admin/compliance/ndpa', icon: FileText },
            { label: 'ISO 27001', href: '/admin/compliance/iso27001', icon: FileText },
            { label: 'CBN Framework', href: '/admin/compliance/cbn', icon: FileText },
            { label: 'PCI-DSS', href: '/admin/compliance/pcidss', icon: FileText },
            { label: 'NCC Framework', href: '/admin/compliance/ncc', icon: FileText },
        ],
    },
    {
        section: 'AI Analyst',
        collapsible: true,
        icon: Bot,
        groupLabel: 'AI Analyst',
        items: [
            { label: 'NovrAI Chat', href: '/admin/novrail', icon: Bot },
        ],
    },
    {
        section: 'Data Continuity',
        collapsible: true,
        icon: HardDrive,
        groupLabel: 'Data Continuity',
        items: [
            { label: 'Data Loss Recovery', href: '/admin/data/recovery', icon: HardDrive },
            { label: 'Recovery Credit', href: '/admin/data/sla', icon: BarChart },
            { label: 'Disaster Recovery Plan', href: '/admin/data/recovery-plan', icon: ClipboardList },
        ],
    },
    {
        section: 'Customers',
        collapsible: true,
        icon: Building2,
        groupLabel: 'Customers',
        items: [
            { label: 'All Customers', href: '/admin/customers', icon: Building2, adminOnly: true },
            { label: 'Client Portals', href: '/admin/platform/clients', icon: Building2, adminOnly: true },
        ],
    },
    {
        section: 'Settings',
        collapsible: true,
        icon: Settings,
        groupLabel: 'Settings',
        items: [
            { label: 'Team', href: '/admin/settings/team', icon: Users, adminOnly: true },
            { label: 'Organisations', href: '/admin/settings/organisations', icon: Building2, adminOnly: true },
            { label: 'Billing', href: '/admin/settings/billing', icon: CreditCard, adminOnly: true },
            { label: 'Audit Log', href: '/admin/platform/audit', icon: ScrollText, adminOnly: true },
            { label: 'Platform Health', href: '/admin/platform/health', icon: Activity, adminOnly: true },
        ],
    },
];

interface AdminSidebarProps {
    user: { name: string; email: string; role: string };
    onLogout: () => void;
}

export function AdminSidebar({ user, onLogout }: AdminSidebarProps) {
    return <Sidebar navGroups={adminNav} user={user} onLogout={onLogout} />;
}
