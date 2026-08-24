'use client';

import {
    LayoutDashboard, Globe, Users, Shield, UserCheck, Smartphone, Code,
    Crosshair, AlertTriangle, Link as LinkIcon, Monitor, Building, Building2, Server, Network, Cpu,
    Mail, MessageSquare, ShieldAlert, Activity, Siren, Bell, ClipboardList,
    HardDrive, BarChart, CreditCard, Settings,
} from 'lucide-react';
import { Sidebar, type NavGroup } from './Sidebar';

const adminNav: NavGroup[] = [
    {
        section: '',
        collapsible: false,
        items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }],
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
            { label: 'Executive Monitor', href: '/admin/brand/executive', icon: UserCheck },
            { label: 'Mobile App Suite', href: '/admin/brand/mobile', icon: Smartphone },
            { label: 'Intelli CODE copyID', href: '/admin/brand/copyid', icon: Code },
        ],
    },
    {
        section: 'Threat Intelligence',
        collapsible: true,
        icon: Crosshair,
        groupLabel: 'Threat Intelligence',
        items: [
            { label: 'CTI Platform', href: '/admin/threat/cti', icon: Crosshair },
            { label: 'Threat Advisory', href: '/admin/threat/advisory', icon: AlertTriangle },
            { label: 'URL Scan Suite', href: '/admin/threat/urlscan', icon: LinkIcon },
            { label: 'Website Scanning', href: '/admin/threat/webscan', icon: Monitor },
            { label: 'Vendor Assessments', href: '/admin/threat/vendor', icon: Building },
        ],
    },
    {
        section: 'Infrastructure',
        collapsible: true,
        icon: Server,
        groupLabel: 'Infrastructure',
        items: [
            { label: 'Digital Assets', href: '/admin/infra/assets', icon: Server },
            { label: 'DNS Suite', href: '/admin/infra/dns', icon: Network },
            { label: 'WebLogic Appliances', href: '/admin/infra/weblogic', icon: Cpu },
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
            { label: 'Intelli CODE PHISHID', href: '/admin/email/phishid', icon: ShieldAlert },
        ],
    },
    {
        section: 'SecOps & Response',
        collapsible: true,
        icon: Activity,
        groupLabel: 'SecOps & Response',
        items: [
            { label: 'Threat Management', href: '/admin/secops/threats', icon: Activity },
            { label: 'Incident Response', href: '/admin/secops/incidents', icon: Siren },
            { label: 'Alert Communication', href: '/admin/secops/alerts', icon: Bell },
            { label: 'Shift Handover', href: '/admin/secops/handover', icon: ClipboardList },
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
        ],
    },
    {
        section: 'Settings',
        collapsible: true,
        icon: Settings,
        groupLabel: 'Settings',
        items: [
            { label: 'Organisations', href: '/admin/settings/organisations', icon: Building2, adminOnly: true },
            { label: 'Team Members', href: '/admin/settings/team', icon: Users, adminOnly: true },
            { label: 'Billing', href: '/admin/settings/billing', icon: CreditCard, adminOnly: true },
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
