import { Router } from 'express';

// SecOps Threat Management console — live security event stream from Wazuh/Zeek/Suricata.
// Demo data for now (real sensor ingestion is a later pass, same pattern as elsewhere in
// this backend). Not to be confused with routes/threat-intel.ts / routes/ctip.ts, which power
// the separate CTIP-backed threat-intel dashboards.

const router = Router();

type Severity = 'critical' | 'high' | 'medium' | 'low';
type AlertStatus = 'open' | 'investigating' | 'acknowledged' | 'closed';

interface ThreatAlert {
    id: string;
    rule_id: string;
    rule_level: number;
    rule_description: string;
    severity: Severity;
    status: AlertStatus;
    mitre_tactic: string;
    mitre_technique: string;
    source_ip: string | null;
    source_country: string | null;
    source_isp: string | null;
    destination_ip: string;
    destination_host: string;
    destination_port: number | null;
    protocol: string;
    agent_id: string;
    agent_name: string;
    alert_count: number;
    raw_log: string;
    detected_at: string;
    tags: string[];
    abuseipdb_confidence: number | null;
    vt_malicious: number | null;
    otx_pulses: number | null;
}

const MOCK_ALERTS: ThreatAlert[] = [
    {
        id: 'al_001',
        rule_id: 'WR-100234',
        rule_level: 14,
        rule_description: 'Tor Exit Node Communication Detected',
        severity: 'critical',
        status: 'open',
        mitre_tactic: 'Command and Control',
        mitre_technique: 'T1090 - Proxy',
        source_ip: '185.220.101.47',
        source_country: 'DE',
        source_isp: 'Stiftung Erneuerbare Freiheit (Tor)',
        destination_ip: '10.0.1.10',
        destination_host: 'ec2-app-server',
        destination_port: 443,
        protocol: 'TCP',
        agent_id: 'ec2-app-server',
        agent_name: 'EC2-1 App Server',
        alert_count: 1,
        raw_log: 'zeek:conn.log — connection from 185.220.101.47:58291 to 10.0.1.10:443 (3.2KB sent, 0.8KB received)',
        detected_at: '2026-08-12 14:23:11',
        tags: ['tor', 'c2', 'proxy'],
        abuseipdb_confidence: 94,
        vt_malicious: 16,
        otx_pulses: 8,
    },
    {
        id: 'al_002',
        rule_id: 'WR-100087',
        rule_level: 13,
        rule_description: 'Multiple Failed SSH Logins from Foreign IP — Possible Brute Force',
        severity: 'critical',
        status: 'investigating',
        mitre_tactic: 'Credential Access',
        mitre_technique: 'T1110 - Brute Force',
        source_ip: '45.155.205.233',
        source_country: 'CN',
        source_isp: 'Shenzhen Tencent Computer Systems',
        destination_ip: '10.0.1.20',
        destination_host: 'ec2-wazuh-server',
        destination_port: 22,
        protocol: 'TCP',
        agent_id: 'ec2-wazuh',
        agent_name: 'EC2-2 Wazuh Server',
        alert_count: 47,
        raw_log: "wazuh:auth — 47 failed SSH login attempts for root from 45.155.205.233 between 03:14:22 and 03:47:08",
        detected_at: '2026-08-12 03:47:08',
        tags: ['brute-force', 'ssh', 'china'],
        abuseipdb_confidence: 87,
        vt_malicious: 12,
        otx_pulses: 3,
    },
    {
        id: 'al_003',
        rule_id: 'WR-100412',
        rule_level: 13,
        rule_description: 'Known Ransomware C2 Server Communication',
        severity: 'critical',
        status: 'open',
        mitre_tactic: 'Command and Control',
        mitre_technique: 'T1071 - Application Layer Protocol',
        source_ip: '10.0.1.30',
        source_country: 'NG',
        source_isp: 'Internal — EC2 Sensor',
        destination_ip: '91.215.153.180',
        destination_host: 'ec2-sensor (outbound)',
        destination_port: 8080,
        protocol: 'HTTP',
        agent_id: 'ec2-sensor',
        agent_name: 'EC2-3 Sensor',
        alert_count: 1,
        raw_log: 'suricata:eve.json — ET MALWARE Ryuk Ransomware C2 Beacon detected. dst=91.215.153.180:8080',
        detected_at: '2026-08-12 09:15:44',
        tags: ['ransomware', 'ryuk', 'c2', 'suricata'],
        abuseipdb_confidence: 98,
        vt_malicious: 58,
        otx_pulses: 24,
    },
    {
        id: 'al_004',
        rule_id: 'WR-100056',
        rule_level: 10,
        rule_description: 'New File Created in Sensitive Directory',
        severity: 'high',
        status: 'open',
        mitre_tactic: 'Persistence',
        mitre_technique: 'T1543 - Create or Modify System Process',
        source_ip: null,
        source_country: null,
        source_isp: null,
        destination_ip: '10.0.1.10',
        destination_host: 'ec2-app-server',
        destination_port: null,
        protocol: 'N/A',
        agent_id: 'ec2-app-server',
        agent_name: 'EC2-1 App Server',
        alert_count: 1,
        raw_log: 'wazuh:syscheck — New file: /etc/cron.d/cleanup (md5: a3f5c2d8, sha256: b7e2d4f6...)',
        detected_at: '2026-08-12 06:44:22',
        tags: ['fim', 'persistence', 'cron'],
        abuseipdb_confidence: null,
        vt_malicious: null,
        otx_pulses: null,
    },
    {
        id: 'al_005',
        rule_id: 'WR-100198',
        rule_level: 8,
        rule_description: 'Outbound Connection to Newly Registered Domain',
        severity: 'medium',
        status: 'open',
        mitre_tactic: 'Exfiltration',
        mitre_technique: 'T1048 - Exfiltration Over Alternative Protocol',
        source_ip: '10.0.1.50',
        source_country: 'NG',
        source_isp: 'Internal — EC2 Auxiliary',
        destination_ip: '104.21.18.99',
        destination_host: 'novrsoc-free-tools.xyz',
        destination_port: 443,
        protocol: 'HTTPS',
        agent_id: 'ec2-auxiliary',
        agent_name: 'EC2-5 Auxiliary',
        alert_count: 3,
        raw_log: "zeek:dns.log — query: novrsoc-free-tools.xyz (registered 3 days ago, cert: Let's Encrypt)",
        detected_at: '2026-08-12 16:02:33',
        tags: ['nrd', 'suspicious-domain', 'exfil'],
        abuseipdb_confidence: 12,
        vt_malicious: 0,
        otx_pulses: 0,
    },
    {
        id: 'al_006',
        rule_id: 'WR-100301',
        rule_level: 6,
        rule_description: 'User Account Created Outside Business Hours',
        severity: 'low',
        status: 'acknowledged',
        mitre_tactic: 'Persistence',
        mitre_technique: 'T1136 - Create Account',
        source_ip: '10.0.1.10',
        source_country: 'NG',
        source_isp: 'Internal',
        destination_ip: '10.0.1.10',
        destination_host: 'ec2-app-server',
        destination_port: null,
        protocol: 'N/A',
        agent_id: 'ec2-app-server',
        agent_name: 'EC2-1 App Server',
        alert_count: 1,
        raw_log: 'wazuh:eventlog — New user account "deploy-svc" created by root at 02:31:14 (outside business hours)',
        detected_at: '2026-08-11 02:31:14',
        tags: ['account-creation', 'after-hours'],
        abuseipdb_confidence: null,
        vt_malicious: null,
        otx_pulses: null,
    },
];

const MOCK_STATS = {
    total_alerts_24h: 47,
    critical: 3,
    high: 8,
    medium: 12,
    low: 24,
    open: 18,
    investigating: 4,
    acknowledged: 25,
    active_agents: 5,
    mitre_tactics_seen: ['Command and Control', 'Credential Access', 'Persistence', 'Exfiltration'],
};

router.get('/alerts', (req, res) => {
    const { severity, status, limit = '50' } = req.query;
    let alerts = [...MOCK_ALERTS];
    if (severity && severity !== 'all') alerts = alerts.filter((a) => a.severity === severity);
    if (status && status !== 'all') alerts = alerts.filter((a) => a.status === status);
    alerts = alerts.slice(0, parseInt(String(limit), 10) || 50);
    res.json({ alerts, stats: MOCK_STATS });
});

router.get('/alerts/:id', (req, res) => {
    const alert = MOCK_ALERTS.find((a) => a.id === req.params.id);
    if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
    }
    res.json(alert);
});

router.patch('/alerts/:id', (req, res) => {
    const { status }: { status?: AlertStatus } = req.body ?? {};
    const alert = MOCK_ALERTS.find((a) => a.id === req.params.id);
    if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
    }
    if (status) alert.status = status;
    res.json({ success: true, alert });
});

router.post('/alerts/:id/create-incident', (req, res) => {
    const alert = MOCK_ALERTS.find((a) => a.id === req.params.id);
    if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
    }
    res.json({ success: true, incident_id: `INC-${Date.now()}`, message: `Incident created from alert ${alert.rule_id}` });
});

router.get('/stats', (_req, res) => {
    res.json(MOCK_STATS);
});

export default router;
