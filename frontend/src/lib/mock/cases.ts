export interface Case {
    id: string;
    title: string;
    priority: 'P1' | 'P2' | 'P3' | 'P4';
    status: 'Open' | 'Investigating' | 'Escalated' | 'Contained' | 'Resolved';
    analyst: string;
    linkedAlerts: number;
    created: string;
    updated: string;
    description: string;
    mitreTag: string;
}

export const CASES: Case[] = [
    {
        id: 'CAS-2026-0041', title: 'Ransomware Investigation — WS042',
        priority: 'P1', status: 'Investigating', analyst: 'Amaka Obi',
        linkedAlerts: 3, created: '28 Jun 14:12', updated: '28 Jun 14:55',
        description: 'Active ransomware infection detected on WORKSTATION-042 in Finance dept. Endpoint isolated. Evidence collection in progress.',
        mitreTag: 'T1486',
    },
    {
        id: 'CAS-2026-0040', title: 'BEC Attack — Finance Department',
        priority: 'P1', status: 'Escalated', analyst: 'Chidi Nwosu',
        linkedAlerts: 5, created: '27 Jun 13:47', updated: '28 Jun 09:30',
        description: 'Business Email Compromise detected targeting finance team. Fraudulent wire transfer request identified and blocked.',
        mitreTag: 'T1566.002',
    },
    {
        id: 'CAS-2026-0039', title: 'Brute Force Campaign — VPN Gateway',
        priority: 'P2', status: 'Investigating', analyst: 'Tunde Adeyemi',
        linkedAlerts: 8, created: '26 Jun 07:22', updated: '27 Jun 16:10',
        description: 'Sustained brute force campaign against VPN gateway from multiple source IPs. Geo-block applied. Monitoring for persistence.',
        mitreTag: 'T1110',
    },
    {
        id: 'CAS-2026-0038', title: 'Phishing Campaign — HR Department',
        priority: 'P2', status: 'Contained', analyst: 'Fatima Bello',
        linkedAlerts: 2, created: '25 Jun 10:00', updated: '26 Jun 15:45',
        description: 'Spear phishing emails targeting HR staff. Credentials potentially compromised for 1 account. Password reset completed.',
        mitreTag: 'T1566.001',
    },
    {
        id: 'CAS-2026-0037', title: 'Credential Stuffing — Customer Portal',
        priority: 'P3', status: 'Resolved', analyst: 'System',
        linkedAlerts: 12, created: '24 Jun 03:15', updated: '25 Jun 08:00',
        description: 'Automated credential stuffing attack against customer portal. Rate limiting and CAPTCHA enforced. No accounts compromised.',
        mitreTag: 'T1110.004',
    },
];

export const CASE_KPIS = {
    total: 5, open: 1, investigating: 2, escalated: 1, contained: 1, resolved: 1,
    avgResolutionTime: '14.2 hrs', slaCompliance: '96%',
};
