export const SOAR_KPIS = {
    playbooksToday: 47, ticketsAutoClosed: 12, autoContained: 3,
    mttaRespond: '00:00:42', successRate: '96.8%',
};

export const PLAYBOOKS = [
    { name: 'Block IP Address', trigger: 'Malicious IP detected', lastRun: '14 mins ago', runsThisWeek: 23, successRate: 100, active: true },
    { name: 'Disable Compromised User', trigger: 'Credential compromise detected', lastRun: '2 hrs ago', runsThisWeek: 4, successRate: 100, active: true },
    { name: 'Isolate Endpoint', trigger: 'Malware execution confirmed', lastRun: '22 mins ago', runsThisWeek: 7, successRate: 100, active: true },
    { name: 'Phishing Email Response', trigger: 'Phishing link clicked', lastRun: '1 hr ago', runsThisWeek: 11, successRate: 91, active: true },
    { name: 'Ransomware Containment', trigger: 'File encryption detected', lastRun: '3 hrs ago', runsThisWeek: 2, successRate: 100, active: true },
    { name: 'Brute Force Response', trigger: '10 failed logins in 60s', lastRun: '45 mins ago', runsThisWeek: 18, successRate: 94, active: true },
    { name: 'Create Ticket', trigger: 'New high/critical alert', lastRun: '8 mins ago', runsThisWeek: 42, successRate: 100, active: true },
    { name: 'Notify Customer', trigger: 'Critical incident opened', lastRun: '22 mins ago', runsThisWeek: 6, successRate: 100, active: true },
];

export const EXECUTION_LOG = [
    { playbook: 'Block IP Address', trigger: 'Malicious IP 185.220.101.47', asset: 'FIREWALL-01', outcome: 'Success', duration: '0.8s', timestamp: '14:22:01', override: false },
    { playbook: 'Isolate Endpoint', trigger: 'Ransomware detected', asset: 'WORKSTATION-042', outcome: 'Success', duration: '1.2s', timestamp: '14:11:49', override: false },
    { playbook: 'Disable Compromised User', trigger: 'Credential compromise', asset: 'user: a.johnson', outcome: 'Success', duration: '0.9s', timestamp: '13:45:22', override: false },
    { playbook: 'Create Ticket', trigger: 'Critical alert fired', asset: 'INC-2026-0041', outcome: 'Success', duration: '0.3s', timestamp: '14:12:02', override: false },
    { playbook: 'Phishing Email Response', trigger: 'Phishing link clicked', asset: 'user: b.adeyemi', outcome: 'Success', duration: '1.8s', timestamp: '13:30:11', override: false },
    { playbook: 'Brute Force Response', trigger: '10 failed logins', asset: 'PROD-SERVER-03', outcome: 'Success', duration: '0.5s', timestamp: '12:30:45', override: false },
    { playbook: 'Notify Customer', trigger: 'Critical incident opened', asset: 'Zenith Bank', outcome: 'Success', duration: '2.1s', timestamp: '14:12:05', override: false },
    { playbook: 'Block IP Address', trigger: 'Malicious IP 45.142.212.100', asset: 'FIREWALL-02', outcome: 'Success', duration: '0.7s', timestamp: '11:20:33', override: false },
    { playbook: 'Ransomware Containment', trigger: 'File encryption detected', asset: 'WORKSTATION-017', outcome: 'Success', duration: '1.5s', timestamp: '10:45:18', override: true },
    { playbook: 'Create Ticket', trigger: 'High alert fired', asset: 'INC-2026-0038', outcome: 'Success', duration: '0.3s', timestamp: '13:10:05', override: false },
    { playbook: 'Phishing Email Response', trigger: 'Malicious attachment', asset: 'user: c.obi', outcome: 'Success', duration: '1.9s', timestamp: '10:15:30', override: false },
    { playbook: 'Brute Force Response', trigger: '10 failed logins', asset: 'VPN-GATEWAY', outcome: 'Success', duration: '0.6s', timestamp: '07:21:02', override: false },
    { playbook: 'Block IP Address', trigger: 'Malicious IP 91.108.4.179', asset: 'FIREWALL-01', outcome: 'Success', duration: '0.8s', timestamp: '11:31:14', override: false },
    { playbook: 'Notify Customer', trigger: 'High incident', asset: 'MTN Nigeria', outcome: 'Success', duration: '2.0s', timestamp: '13:30:20', override: false },
    { playbook: 'Create Ticket', trigger: 'Medium alert fired', asset: 'INC-2026-0037', outcome: 'Success', duration: '0.3s', timestamp: '11:00:10', override: false },
];

export const ACTIVE_RESPONSES = [
    { name: 'Phishing Response', description: 'Processing email headers', pct: 67 },
    { name: 'IP Block', description: 'Pushing rule to firewall', pct: 90 },
];
