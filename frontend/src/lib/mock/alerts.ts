export interface Alert {
    id: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    name: string;
    source: string;
    asset: string;
    mitre: string;
    tactic: string;
    time: string;
    status: 'New' | 'Assigned' | 'Investigating' | 'Resolved' | 'Suppressed';
}

export const ALERTS: Alert[] = [
    { id: 'ALT-001', severity: 'Critical', name: 'Mimikatz execution detected', source: 'EDR-Agent', asset: 'WORKSTATION-042', mitre: 'T1003', tactic: 'Credential Access', time: '14:22:01', status: 'New' },
    { id: 'ALT-002', severity: 'Critical', name: 'Ransomware file encryption started', source: 'EDR-Agent', asset: 'WORKSTATION-017', mitre: 'T1486', tactic: 'Impact', time: '14:18:44', status: 'New' },
    { id: 'ALT-003', severity: 'High', name: 'PowerShell encoded command executed', source: 'Wazuh', asset: 'PROD-SERVER-03', mitre: 'T1059.001', tactic: 'Execution', time: '14:15:22', status: 'Assigned' },
    { id: 'ALT-004', severity: 'High', name: 'Abnormal admin login — off-hours', source: 'SIEM', asset: 'DOMAIN-CTRL-01', mitre: 'T1078', tactic: 'Initial Access', time: '13:50:10', status: 'Investigating' },
    { id: 'ALT-005', severity: 'High', name: 'Pass-the-hash lateral movement', source: 'EDR-Agent', asset: 'WORKSTATION-011', mitre: 'T1550.002', tactic: 'Lateral Movement', time: '13:40:00', status: 'New' },
    { id: 'ALT-006', severity: 'Medium', name: 'DNS query to known C2 domain', source: 'DNS-Monitor', asset: 'WORKSTATION-031', mitre: 'T1071.004', tactic: 'C2', time: '13:30:00', status: 'New' },
    { id: 'ALT-007', severity: 'High', name: 'LSASS credential dump attempt', source: 'EDR-Agent', asset: 'WORKSTATION-042', mitre: 'T1003.001', tactic: 'Credential Access', time: '14:11:03', status: 'Investigating' },
    { id: 'ALT-008', severity: 'Critical', name: 'BEC email — suspicious wire request', source: 'Email-Gateway', asset: 'MAIL-SERVER-01', mitre: 'T1566.002', tactic: 'Initial Access', time: '13:45:00', status: 'New' },
    { id: 'ALT-009', severity: 'Medium', name: 'Internal port scan detected', source: 'Wazuh', asset: 'WORKSTATION-008', mitre: 'T1046', tactic: 'Discovery', time: '08:45:11', status: 'New' },
    { id: 'ALT-010', severity: 'High', name: 'Brute force on VPN gateway', source: 'VPN-Gateway', asset: 'VPN-GATEWAY', mitre: 'T1110', tactic: 'Credential Access', time: '07:21:00', status: 'New' },
    { id: 'ALT-011', severity: 'Medium', name: 'Suspicious outbound connection', source: 'Network-Monitor', asset: 'PROD-SERVER-03', mitre: 'T1041', tactic: 'Exfiltration', time: '11:02:44', status: 'New' },
    { id: 'ALT-012', severity: 'High', name: 'Credential stuffing — multiple accounts', source: 'Auth-Monitor', asset: 'USER-PC-022', mitre: 'T1110.004', tactic: 'Credential Access', time: '10:18:30', status: 'New' },
    { id: 'ALT-013', severity: 'Critical', name: 'Ransomware ransom note dropped', source: 'EDR-Agent', asset: 'WORKSTATION-017', mitre: 'T1491', tactic: 'Impact', time: '14:19:01', status: 'New' },
    { id: 'ALT-014', severity: 'Medium', name: 'DGA DNS query pattern detected', source: 'DNS-Monitor', asset: 'WORKSTATION-019', mitre: 'T1568', tactic: 'C2', time: '06:50:22', status: 'New' },
    { id: 'ALT-015', severity: 'Low', name: 'Backup job failure — retention policy', source: 'Backup-Agent', asset: 'BACKUP-SERVER-01', mitre: 'N/A', tactic: 'N/A', time: '03:00:00', status: 'Resolved' },
    { id: 'ALT-016', severity: 'High', name: 'Service account unusual access', source: 'SIEM', asset: 'DOMAIN-CTRL-01', mitre: 'T1078.003', tactic: 'Persistence', time: '12:44:10', status: 'Assigned' },
    { id: 'ALT-017', severity: 'Medium', name: 'Mass file deletion in shared drive', source: 'DLP-Monitor', asset: 'FILE-SERVER-01', mitre: 'T1485', tactic: 'Impact', time: '09:15:00', status: 'Investigating' },
    { id: 'ALT-018', severity: 'High', name: 'Phishing link clicked — credential page', source: 'Email-Gateway', asset: 'USER-PC-018', mitre: 'T1566.001', tactic: 'Initial Access', time: '15:30:00', status: 'Assigned' },
    { id: 'ALT-019', severity: 'Low', name: 'New external port scan on firewall', source: 'Exposure-Monitor', asset: 'FIREWALL-01', mitre: 'T1595', tactic: 'Reconnaissance', time: '16:00:00', status: 'New' },
    { id: 'ALT-020', severity: 'Medium', name: 'Failed MFA attempts — multiple users', source: 'Auth-Monitor', asset: 'AUTH-SERVER', mitre: 'T1110.003', tactic: 'Credential Access', time: '08:00:00', status: 'New' },
];

export const ALERT_KPIS = {
    total: 20, newToday: 14, critical: 4, high: 8, medium: 6, low: 2,
    autoSuppressed: 8, avgTtd: '4.2 min',
};
