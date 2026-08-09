export const REPORT_TEMPLATES = [
    { name: 'Executive Summary Report', description: 'High-level security overview for leadership', lastGenerated: '01 Jun 2026', estimatedTime: '~30 sec', format: 'PDF' },
    { name: 'SOC Monthly Report', description: 'Full operational metrics and incident summary', lastGenerated: '01 Jun 2026', estimatedTime: '~2 min', format: 'PDF' },
    { name: 'Compliance Report', description: 'Framework scores, gaps, and remediation status', lastGenerated: '15 May 2026', estimatedTime: '~1 min', format: 'PDF' },
    { name: 'Incident Report', description: 'Detailed incident analysis and timeline', lastGenerated: '14 Jun 2026', estimatedTime: '~45 sec', format: 'PDF' },
    { name: 'Threat Intelligence Brief', description: 'IOC summary, active campaigns, threat actors', lastGenerated: '28 Jun 2026', estimatedTime: '~1 min', format: 'PDF' },
    { name: 'Vulnerability Assessment', description: 'SecuBreach exposure summary and CVE list', lastGenerated: '20 Jun 2026', estimatedTime: '~2 min', format: 'PDF/Excel' },
];

export const SCHEDULED_REPORTS = [
    { name: 'Monthly Executive Summary', frequency: 'Monthly', recipients: 'ceo@cybernovr.com', format: 'PDF', nextRun: '01 Jul 2026', active: true },
    { name: 'Weekly SOC Report', frequency: 'Weekly', recipients: 'soc@cybernovr.com', format: 'PDF', nextRun: '05 Jul 2026', active: true },
    { name: 'Daily Threat Brief', frequency: 'Daily', recipients: 'analysts@cybernovr.com', format: 'PDF', nextRun: 'Tomorrow 06:00', active: true },
    { name: 'Monthly Compliance Report', frequency: 'Monthly', recipients: 'compliance@cybernovr.com', format: 'PDF', nextRun: '01 Jul 2026', active: false },
];

export const REPORT_HISTORY = [
    { name: 'Executive Summary — June 2026', generated: '01 Jun 2026', by: 'System', size: '2.4 MB', format: 'PDF' },
    { name: 'SOC Monthly Report — June 2026', generated: '01 Jun 2026', by: 'System', size: '8.1 MB', format: 'PDF' },
    { name: 'Threat Intelligence Brief — Jun 28', generated: '28 Jun 2026', by: 'Amaka Obi', size: '1.8 MB', format: 'PDF' },
    { name: 'Incident Report — INC-2026-0041', generated: '28 Jun 2026', by: 'Chidi Nwosu', size: '0.9 MB', format: 'PDF' },
    { name: 'Compliance Report — May 2026', generated: '15 May 2026', by: 'System', size: '3.2 MB', format: 'PDF' },
    { name: 'Vulnerability Assessment — Jun 20', generated: '20 Jun 2026', by: 'Tunde Adeyemi', size: '5.6 MB', format: 'PDF' },
    { name: 'Executive Summary — May 2026', generated: '01 May 2026', by: 'System', size: '2.1 MB', format: 'PDF' },
    { name: 'SOC Monthly Report — May 2026', generated: '01 May 2026', by: 'System', size: '7.8 MB', format: 'PDF' },
    { name: 'Compliance Report — Apr 2026', generated: '20 Apr 2026', by: 'System', size: '3.1 MB', format: 'PDF' },
    { name: 'Threat Intelligence Brief — Jun 14', generated: '14 Jun 2026', by: 'Ngozi Eze', size: '1.5 MB', format: 'PDF' },
];
