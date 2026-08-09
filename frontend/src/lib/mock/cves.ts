export interface CVE {
    id: string; cvss: number; asset: string; description: string;
    exploitAvail: boolean; patchAvail: boolean; daysExposed: number;
    priority: 'P1' | 'P2' | 'P3' | 'P4';
}

export const CVES: CVE[] = [
    { id: 'CVE-2024-21887', cvss: 9.8, asset: 'FIREWALL-01', description: 'Ivanti Connect Secure Command Injection', exploitAvail: true, patchAvail: true, daysExposed: 14, priority: 'P1' },
    { id: 'CVE-2024-3400', cvss: 10.0, asset: 'VPN-GATEWAY', description: 'PAN-OS Command Injection — GlobalProtect', exploitAvail: true, patchAvail: true, daysExposed: 8, priority: 'P1' },
    { id: 'CVE-2023-46805', cvss: 8.2, asset: 'MAIL-SERVER-01', description: 'Ivanti Auth Bypass via API Endpoint', exploitAvail: true, patchAvail: true, daysExposed: 22, priority: 'P1' },
    { id: 'CVE-2024-1709', cvss: 10.0, asset: 'PROD-SERVER-03', description: 'ConnectWise ScreenConnect Auth Bypass', exploitAvail: true, patchAvail: true, daysExposed: 6, priority: 'P1' },
    { id: 'CVE-2024-21762', cvss: 9.6, asset: 'FIREWALL-02', description: 'Fortinet FortiOS Out-of-Bound Write', exploitAvail: true, patchAvail: true, daysExposed: 11, priority: 'P1' },
    { id: 'CVE-2023-4966', cvss: 9.4, asset: 'LOAD-BALANCER-01', description: 'Citrix Bleed — NetScaler ADC Session Token Leak', exploitAvail: true, patchAvail: true, daysExposed: 30, priority: 'P1' },
    { id: 'CVE-2024-6387', cvss: 8.1, asset: 'PROD-SERVER-03', description: 'OpenSSH regreSSHion — Race Condition RCE', exploitAvail: true, patchAvail: true, daysExposed: 4, priority: 'P2' },
    { id: 'CVE-2024-20399', cvss: 6.7, asset: 'SWITCH-CORE-01', description: 'Cisco NX-OS Command Injection', exploitAvail: false, patchAvail: true, daysExposed: 18, priority: 'P2' },
    { id: 'CVE-2024-29824', cvss: 9.8, asset: 'DB-SERVER-01', description: 'Ivanti EPM SQL Injection RCE', exploitAvail: true, patchAvail: true, daysExposed: 9, priority: 'P2' },
    { id: 'CVE-2024-5217', cvss: 9.2, asset: 'WORKSTATION-042', description: 'ServiceNow Jelly Template Injection', exploitAvail: false, patchAvail: true, daysExposed: 7, priority: 'P2' },
    { id: 'CVE-2024-38063', cvss: 9.8, asset: 'DOMAIN-CTRL-01', description: 'Windows TCP/IP IPv6 RCE', exploitAvail: false, patchAvail: true, daysExposed: 5, priority: 'P2' },
    { id: 'CVE-2024-30078', cvss: 8.8, asset: 'WORKSTATION-017', description: 'Windows Wi-Fi Driver RCE', exploitAvail: false, patchAvail: true, daysExposed: 15, priority: 'P2' },
];

export const VULN_ASSET_EXPOSURE = [
    { asset: 'PROD-SERVER-03', count: 24 },
    { asset: 'WORKSTATION-042', count: 18 },
    { asset: 'MAIL-SERVER-01', count: 15 },
    { asset: 'FIREWALL-01', count: 12 },
    { asset: 'DOMAIN-CTRL-01', count: 9 },
    { asset: 'VPN-GATEWAY', count: 7 },
    { asset: 'DB-SERVER-01', count: 6 },
    { asset: 'LOAD-BALANCER-01', count: 5 },
];

export const REMEDIATION_BOARD = {
    todo: [
        { id: 'CVE-2024-21887', asset: 'FIREWALL-01', analyst: 'Amaka Obi', due: '30 Jun', severity: 'Critical' },
        { id: 'CVE-2024-3400', asset: 'VPN-GATEWAY', analyst: 'Chidi Nwosu', due: '30 Jun', severity: 'Critical' },
        { id: 'CVE-2023-46805', asset: 'MAIL-SERVER-01', analyst: 'Tunde Adeyemi', due: '01 Jul', severity: 'Critical' },
        { id: 'CVE-2024-1709', asset: 'PROD-SERVER-03', analyst: 'Unassigned', due: '02 Jul', severity: 'Critical' },
    ],
    inProgress: [
        { id: 'CVE-2024-21762', asset: 'FIREWALL-02', analyst: 'Ngozi Eze', due: '29 Jun', severity: 'Critical' },
        { id: 'CVE-2023-4966', asset: 'LOAD-BALANCER-01', analyst: 'Emeka Okonkwo', due: '29 Jun', severity: 'Critical' },
        { id: 'CVE-2024-6387', asset: 'PROD-SERVER-03', analyst: 'Fatima Hassan', due: '30 Jun', severity: 'High' },
        { id: 'CVE-2024-38063', asset: 'DOMAIN-CTRL-01', analyst: 'Amaka Obi', due: '30 Jun', severity: 'Critical' },
    ],
    patched: [
        { id: 'CVE-2023-48788', asset: 'FIREWALL-01', analyst: 'Chidi Nwosu', due: '20 Jun', severity: 'Critical' },
        { id: 'CVE-2024-23897', asset: 'JENKINS-01', analyst: 'Tunde Adeyemi', due: '18 Jun', severity: 'High' },
        { id: 'CVE-2024-4577', asset: 'WEB-SERVER-02', analyst: 'Ngozi Eze', due: '15 Jun', severity: 'Critical' },
        { id: 'CVE-2024-24919', asset: 'FIREWALL-03', analyst: 'Amaka Obi', due: '22 Jun', severity: 'High' },
    ],
    acceptedRisk: [
        { id: 'CVE-2022-40684', asset: 'LEGACY-SWITCH-04', analyst: 'IT-Admin', due: 'N/A', severity: 'Critical' },
        { id: 'CVE-2021-34527', asset: 'LEGACY-PRINT-01', analyst: 'IT-Admin', due: 'N/A', severity: 'High' },
    ],
};
