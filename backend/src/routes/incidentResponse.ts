import { Router } from 'express';
import { logAudit } from '../lib/audit';

// SecOps Incident Response console — demo data (same pattern as routes/threatManagement.ts).
// Not to be confused with the live Wazuh-backed incidents surfaced under /api/wazuh/incidents.
//
// TODO: Wire to TheHive API when VPS 6 SOAR stack is deployed.
// TheHive URL: http://10.0.0.4:9000
// Auth: Basic (THEHIVE_USER + THEHIVE_PASSWORD env vars, not yet set) — see services/thehive.ts
// Migration: replace in-memory store with TheHive case CRUD
// Reference: NovrSOC_WazuhMigration_ContaboSQL.md for deployment guide

const router = Router();

type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
type IncidentStatus = 'new' | 'investigating' | 'contained' | 'resolved' | 'escalated';
type ActionStatus = 'completed' | 'pending' | 'failed';

interface TimelineEntry {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    detail: string;
}

interface ContainmentAction {
    id: string;
    label: string;
    status: ActionStatus;
    completed_at: string | null;
}

type NoteType = 'Update' | 'Evidence' | 'Decision' | 'Escalation';

interface AnalystNote {
    id: string;
    author: string;
    type: NoteType;
    text: string;
    timestamp: string;
}

interface Incident {
    id: string;
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    mitre_tactic: string;
    mitre_technique: string;
    affected_assets: string[];
    assigned_analyst: string;
    opened_at: string;
    updated_at: string;
    summary: string;
    source_alert_id: string | null;
    timeline: TimelineEntry[];
    containment_actions: ContainmentAction[];
    notes: AnalystNote[];
}

const MOCK_INCIDENTS: Incident[] = [
    {
        id: 'INC-2026-0341',
        title: 'SSH Brute Force from China — Possible Credential Compromise',
        severity: 'critical',
        status: 'investigating',
        mitre_tactic: 'Credential Access',
        mitre_technique: 'T1110 - Brute Force',
        affected_assets: ['EC2-2 Wazuh Server', '10.0.1.20'],
        assigned_analyst: 'Ibrahim Musa',
        opened_at: '2026-08-12 03:52:00',
        updated_at: '2026-08-12 09:10:00',
        summary: '47 failed SSH login attempts for root originating from 45.155.205.233 (Shenzhen Tencent Computer Systems, CN) were detected between 03:14 and 03:47. Analyst has confirmed no successful authentication occurred but is investigating lateral movement risk given the target hosts the primary Wazuh manager.',
        source_alert_id: 'al_002',
        timeline: [
            {
                id: 'tl_1',
                timestamp: '2026-08-12 03:47:08',
                actor: 'Wazuh',
                action: 'Alert triggered',
                detail: 'Rule WR-100087 fired at level 13 — 47 failed SSH logins for root from 45.155.205.233.',
            },
            {
                id: 'tl_2',
                timestamp: '2026-08-12 03:52:00',
                actor: 'System',
                action: 'Incident created',
                detail: 'Auto-escalated from alert al_002 due to severity and repeated attempts.',
            },
            {
                id: 'tl_3',
                timestamp: '2026-08-12 07:15:00',
                actor: 'Ibrahim Musa',
                action: 'Investigation started',
                detail: 'Reviewed auth logs, confirmed no successful root login. Source IP cross-checked against AbuseIPDB (87% confidence malicious).',
            },
            {
                id: 'tl_4',
                timestamp: '2026-08-12 08:40:00',
                actor: 'Ibrahim Musa',
                action: 'Firewall rule applied',
                detail: 'Blocked 45.155.205.233 at perimeter firewall (rule FW-SSH-BLOCK-441).',
            },
            {
                id: 'tl_5',
                timestamp: '2026-08-12 09:10:00',
                actor: 'Ibrahim Musa',
                action: 'Note added',
                detail: 'Recommending SSH key-only auth enforcement on EC2-2 to prevent recurrence. Continuing to monitor for follow-up attempts from adjacent IP ranges.',
            },
        ],
        containment_actions: [
            { id: 'ca_1', label: 'Block source IP at perimeter firewall', status: 'completed', completed_at: '2026-08-12 08:40:00' },
            { id: 'ca_2', label: 'Confirm no successful authentication occurred', status: 'completed', completed_at: '2026-08-12 07:15:00' },
            { id: 'ca_3', label: 'Enforce SSH key-only authentication', status: 'pending', completed_at: null },
            { id: 'ca_4', label: 'Rotate root/service account credentials', status: 'pending', completed_at: null },
            { id: 'ca_5', label: 'Review CloudTrail/Wazuh for lateral movement', status: 'pending', completed_at: null },
        ],
        notes: [
            {
                id: 'note_1', author: 'Ibrahim Musa', type: 'Evidence',
                text: 'AbuseIPDB confidence 87% on 45.155.205.233 — cross-referenced against last 90 days of perimeter logs, no prior contact from this IP.',
                timestamp: '2026-08-12 07:20:00',
            },
            {
                id: 'note_2', author: 'Ibrahim Musa', type: 'Decision',
                text: 'Blocking at perimeter firewall rather than waiting for full lateral-movement review, given this host runs the primary Wazuh manager.',
                timestamp: '2026-08-12 08:35:00',
            },
        ],
    },
    {
        id: 'INC-2026-0342',
        title: 'Ryuk Ransomware C2 Beacon Detected on Outbound Sensor',
        severity: 'critical',
        status: 'new',
        mitre_tactic: 'Command and Control',
        mitre_technique: 'T1071 - Application Layer Protocol',
        affected_assets: ['EC2-3 Sensor', '10.0.1.30'],
        assigned_analyst: 'Unassigned',
        opened_at: '2026-08-12 09:20:00',
        updated_at: '2026-08-12 09:20:00',
        summary: 'Suricata flagged an outbound HTTP beacon matching known Ryuk ransomware C2 infrastructure (91.215.153.180:8080). VirusTotal shows 58 vendors flagging this IP as malicious. Immediate triage required to rule out active ransomware staging.',
        source_alert_id: 'al_003',
        timeline: [
            {
                id: 'tl_1',
                timestamp: '2026-08-12 09:15:44',
                actor: 'Suricata',
                action: 'Alert triggered',
                detail: 'ET MALWARE Ryuk Ransomware C2 Beacon signature matched on outbound connection to 91.215.153.180:8080.',
            },
            {
                id: 'tl_2',
                timestamp: '2026-08-12 09:20:00',
                actor: 'System',
                action: 'Incident created',
                detail: 'Auto-escalated from alert al_003 — critical severity, known ransomware family.',
            },
        ],
        containment_actions: [
            { id: 'ca_1', label: 'Isolate EC2-3 Sensor from network', status: 'pending', completed_at: null },
            { id: 'ca_2', label: 'Block destination IP 91.215.153.180', status: 'pending', completed_at: null },
            { id: 'ca_3', label: 'Scan host for ransomware payload / encryption activity', status: 'pending', completed_at: null },
            { id: 'ca_4', label: 'Verify backup integrity for affected host', status: 'pending', completed_at: null },
        ],
        notes: [],
    },
    {
        id: 'INC-2026-0338',
        title: 'Suspicious Outbound Traffic to Newly Registered Domain',
        severity: 'medium',
        status: 'resolved',
        mitre_tactic: 'Exfiltration',
        mitre_technique: 'T1048 - Exfiltration Over Alternative Protocol',
        affected_assets: ['EC2-5 Auxiliary', '10.0.1.50'],
        assigned_analyst: 'Chidinma Okafor',
        opened_at: '2026-08-10 16:10:00',
        updated_at: '2026-08-11 10:05:00',
        summary: 'Repeated DNS queries and HTTPS connections to novrsoc-free-tools.xyz, a domain registered 3 days prior. Investigation determined the traffic originated from a browser extension installed by a developer for testing purposes — no data exfiltration confirmed.',
        source_alert_id: 'al_005',
        timeline: [
            {
                id: 'tl_1',
                timestamp: '2026-08-10 16:02:33',
                actor: 'Zeek',
                action: 'Alert triggered',
                detail: 'DNS query logged for novrsoc-free-tools.xyz, domain age 3 days.',
            },
            {
                id: 'tl_2',
                timestamp: '2026-08-10 16:10:00',
                actor: 'System',
                action: 'Incident created',
                detail: 'Escalated from alert al_005 for manual review.',
            },
            {
                id: 'tl_3',
                timestamp: '2026-08-11 08:30:00',
                actor: 'Chidinma Okafor',
                action: 'Investigation started',
                detail: 'Traced traffic to a browser extension on the developer workstation behind 10.0.1.50.',
            },
            {
                id: 'tl_4',
                timestamp: '2026-08-11 09:45:00',
                actor: 'Chidinma Okafor',
                action: 'Root cause identified',
                detail: 'Confirmed extension "DevTools Helper Pro" was making telemetry calls to the domain. No sensitive data present in payloads (reviewed via packet capture).',
            },
            {
                id: 'tl_5',
                timestamp: '2026-08-11 10:05:00',
                actor: 'Chidinma Okafor',
                action: 'Incident resolved',
                detail: 'Extension removed from workstation. Domain added to internal watchlist. No further action required.',
            },
        ],
        containment_actions: [
            { id: 'ca_1', label: 'Identify source process/application', status: 'completed', completed_at: '2026-08-11 09:45:00' },
            { id: 'ca_2', label: 'Confirm no sensitive data in outbound payloads', status: 'completed', completed_at: '2026-08-11 09:45:00' },
            { id: 'ca_3', label: 'Remove offending application from host', status: 'completed', completed_at: '2026-08-11 10:05:00' },
            { id: 'ca_4', label: 'Add domain to watchlist', status: 'completed', completed_at: '2026-08-11 10:05:00' },
        ],
        notes: [
            {
                id: 'note_1', author: 'Chidinma Okafor', type: 'Decision',
                text: 'Closing as resolved — root cause is a benign browser extension, not exfiltration. No customer notification needed.',
                timestamp: '2026-08-11 10:06:00',
            },
        ],
    },
];

interface CreateIncidentBody {
    title?: string;
    description?: string;
    severity?: IncidentSeverity;
    affected_host?: string;
    source?: string;
    playbook_id?: string;
    containment?: Array<{ action: string; phase?: string; description?: string; est_mins?: number; status?: ActionStatus }>;
}

// POST / — creates a new incident, pre-filling its containment checklist from a playbook's
// steps when called from the Playbooks page's "Start Playbook" flow (source: 'playbook').
// Pushes into the same in-memory MOCK_INCIDENTS array everything else here reads/writes —
// this is a demo store, not persistence; a restart loses it, same as every mock-data route in
// this codebase.
router.post('/', (req, res) => {
    const body: CreateIncidentBody = req.body ?? {};
    if (!body.title) {
        res.status(400).json({ error: 'title is required' });
        return;
    }

    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const seq = String(MOCK_INCIDENTS.length + 1).padStart(4, '0');
    const id = `INC-${new Date().getFullYear()}-${seq}`;

    const incident: Incident = {
        id,
        title: body.title,
        severity: body.severity && ['critical', 'high', 'medium', 'low'].includes(body.severity) ? body.severity : 'medium',
        status: 'new',
        mitre_tactic: '',
        mitre_technique: '',
        affected_assets: body.affected_host ? [body.affected_host] : [],
        assigned_analyst: 'Unassigned',
        opened_at: nowStr,
        updated_at: nowStr,
        summary: body.description ?? '',
        source_alert_id: null,
        timeline: [
            {
                id: 'tl_1',
                timestamp: nowStr,
                actor: 'System',
                action: 'Incident created',
                detail: body.source === 'playbook' && body.playbook_id
                    ? `Created from playbook ${body.playbook_id}.`
                    : 'Manually created.',
            },
        ],
        containment_actions: (body.containment ?? []).map((step, i) => ({
            id: `ca_${i + 1}`,
            // ContainmentAction has no phase/description/est_mins fields — folded into label
            // rather than extending the interface just for this one caller.
            label: step.phase ? `${step.action} (${step.phase})` : step.action,
            status: step.status ?? 'pending',
            completed_at: null,
        })),
        notes: [],
    };

    MOCK_INCIDENTS.push(incident);
    logAudit({
        // No auth context on this route yet (see index.ts's requireAuth comment) — this
        // becomes req.user.email once that's wired in.
        user: 'unknown',
        action: 'CREATE_INCIDENT',
        resource: `Incident: ${incident.id}`,
        ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
        result: 'success',
    });
    res.json({ success: true, id: incident.id, incident_number: incident.id, incident });
});

router.get('/', (req, res) => {
    const { status, severity } = req.query;
    let incidents = [...MOCK_INCIDENTS];
    if (status && status !== 'all') incidents = incidents.filter((i) => i.status === status);
    if (severity && severity !== 'all') incidents = incidents.filter((i) => i.severity === severity);

    const summary = {
        total: MOCK_INCIDENTS.length,
        critical: MOCK_INCIDENTS.filter((i) => i.severity === 'critical').length,
        investigating: MOCK_INCIDENTS.filter((i) => i.status === 'investigating').length,
        resolved: MOCK_INCIDENTS.filter((i) => i.status === 'resolved').length,
    };

    res.json({ incidents, summary });
});

router.get('/:id', (req, res) => {
    const incident = MOCK_INCIDENTS.find((i) => i.id === req.params.id);
    if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
    }
    res.json(incident);
});

router.patch('/:id', (req, res) => {
    const { status }: { status?: IncidentStatus } = req.body ?? {};
    const incident = MOCK_INCIDENTS.find((i) => i.id === req.params.id);
    if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
    }
    if (status) {
        incident.status = status;
        incident.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    res.json({ success: true, incident });
});

router.post('/:id/notes', (req, res) => {
    const { author, type, text }: { author?: string; type?: NoteType; text?: string } = req.body ?? {};
    const incident = MOCK_INCIDENTS.find((i) => i.id === req.params.id);
    if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
    }
    if (!author || !type || !text) {
        res.status(400).json({ error: 'author, type, and text are required' });
        return;
    }
    const note: AnalystNote = {
        id: `note_${incident.notes.length + 1}`,
        author,
        type,
        text,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    incident.notes.push(note);
    res.json({ success: true, note, incident });
});

router.post('/:id/timeline', (req, res) => {
    const { actor, action, detail }: { actor?: string; action?: string; detail?: string } = req.body ?? {};
    const incident = MOCK_INCIDENTS.find((i) => i.id === req.params.id);
    if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
    }
    if (!actor || !action) {
        res.status(400).json({ error: 'actor and action are required' });
        return;
    }
    const entry: TimelineEntry = {
        id: `tl_${incident.timeline.length + 1}`,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        actor,
        action,
        detail: detail ?? '',
    };
    incident.timeline.push(entry);
    incident.updated_at = entry.timestamp;
    res.json({ success: true, entry, incident });
});

router.patch('/:id/containment/:actionId', (req, res) => {
    const { status }: { status?: ActionStatus } = req.body ?? {};
    const incident = MOCK_INCIDENTS.find((i) => i.id === req.params.id);
    if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
    }
    const action = incident.containment_actions.find((a) => a.id === req.params.actionId);
    if (!action) {
        res.status(404).json({ error: 'Containment action not found' });
        return;
    }
    if (status) {
        action.status = status;
        action.completed_at = status === 'completed' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    }
    res.json({ success: true, action });
});

export default router;
