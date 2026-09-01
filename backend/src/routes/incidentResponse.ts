import { Router, Request, Response } from 'express';
import { search } from '../lib/wazuh-indexer';
import { getCases, createCase, formatCaseForNovrSOC, isTheHiveConfigured } from '../services/thehive';

const router = Router();

// Fire-and-forget Shuffle SOAR notification on incident creation. Never blocks or fails the
// creation request — Shuffle being unreachable/unconfigured must not stop an incident from
// being recorded. No-ops silently when SHUFFLE_WEBHOOK_URL isn't set (SOAR automation is
// optional infra, not a hard dependency).
async function notifyShuffleOfIncident(incident: { id: string; title: string; severity: string }): Promise<void> {
    const webhookUrl = process.env.SHUFFLE_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                novrsoc_incident_id: incident.id,
                title: incident.title,
                severity: incident.severity,
                source: 'novrsoc',
                created_at: new Date().toISOString(),
            }),
            signal: AbortSignal.timeout(3000),
        });
    } catch (err) {
        console.error('[Shuffle] Incident notification failed (non-fatal):', err instanceof Error ? err.message : err);
    }
}

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
    status: 'completed' | 'pending' | 'failed';
    completed_at: string | null;
}

interface AnalystNote {
    id: string;
    author: string;
    type: 'Update' | 'Evidence' | 'Decision' | 'Escalation';
    text: string;
    timestamp: string;
}

export interface Incident {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'new' | 'investigating' | 'contained' | 'resolved' | 'escalated';
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
    source?: 'wazuh' | 'thehive' | 'internal';
    rule_id?: string;
    sla_remaining?: string;
}

// In-memory note and state store for Wazuh-derived incidents
const incidentStateOverrides: Record<string, { status: any; notes: AnalystNote[]; containment: ContainmentAction[] }> = {};

// Helper to extract MITRE info or fallback gracefully
function getMitreInfo(source: any): { tactic: string; technique: string } {
    const mitre = source?.rule?.mitre;
    if (mitre) {
        const tactic = Array.isArray(mitre.tactic) ? mitre.tactic[0] : mitre.tactic || 'Execution';
        const technique = Array.isArray(mitre.id) ? mitre.id[0] : mitre.id || 'T1059';
        return { tactic, technique };
    }
    const desc = (source?.rule?.description || '').toLowerCase();
    if (desc.includes('ssh') || desc.includes('password') || desc.includes('login')) {
        return { tactic: 'Credential Access', technique: 'T1110 (Brute Force)' };
    }
    if (desc.includes('c2') || desc.includes('beacon') || desc.includes('connection')) {
        return { tactic: 'Command and Control', technique: 'T1071 (Application Layer Protocol)' };
    }
    if (desc.includes('malware') || desc.includes('ransomware') || desc.includes('trojan')) {
        return { tactic: 'Execution', technique: 'T1204 (User Execution)' };
    }
    return { tactic: 'Initial Access', technique: 'T1190 (Exploit Public-Facing Application)' };
}

// GET /api/incidents
router.get('/', async (_req: Request, res: Response) => {
    // Prefer TheHive when it's configured — real case management (persists across restarts,
    // shared across analysts) beats the Wazuh-derived + in-memory-overrides fallback below.
    // Any TheHive failure (unreachable VPS, bad creds, unexpected response shape) falls through
    // to that existing behaviour rather than 500ing the whole incident queue — TheHive being
    // down must not take the SecOps incident view down with it.
    if (isTheHiveConfigured()) {
        try {
            const cases = await getCases(50);
            const incidents = cases.map(formatCaseForNovrSOC);
            res.json({
                incidents,
                summary: {
                    total: incidents.length,
                    critical: incidents.filter((i) => i.severity === 'critical').length,
                    investigating: incidents.filter((i) => i.status === 'investigating' || i.status === 'in progress' || i.status === 'open').length,
                    resolved: incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
                },
                source: 'thehive',
            });
            return;
        } catch (err) {
            console.warn('[TheHive] getCases failed, falling back to Wazuh-derived incidents:', err instanceof Error ? err.message : err);
        }
    }

    try {
        let wazuhHits: any[] = [];
        try {
            const indexerResult = await search<any>('wazuh-alerts-4.x-*', {
                size: 20,
                sort: [{ timestamp: { order: 'desc' } }],
                query: {
                    bool: {
                        should: [
                            { range: { 'rule.level': { gte: 7 } } },
                            { terms: { 'rule.groups': ['authentication_failed', 'syscheck', 'rootcheck', 'vulnerability'] } }
                        ],
                        minimum_should_match: 1
                    }
                },
                _source: [
                    'id', 'timestamp', 'rule.description', 'rule.level', 'rule.id',
                    'rule.mitre', 'rule.groups', 'agent.name', 'agent.ip', 'agent.id',
                    'data.srcip', 'data.dstip', 'full_log'
                ],
            });
            wazuhHits = indexerResult?.hits?.hits ?? [];
        } catch (wazuhErr) {
            console.warn('[Wazuh Indexer] Incident query fallback triggered:', wazuhErr);
        }

        const incidents: Incident[] = wazuhHits.map((hit: any, index: number) => {
            const src = hit._source || {};
            const docId = hit._id || `wazuh-${index}`;
            const level = Number(src?.rule?.level ?? 7);
            
            let severity: Incident['severity'] = 'low';
            if (level >= 12) severity = 'critical';
            else if (level >= 10) severity = 'high';
            else if (level >= 7) severity = 'medium';

            const agentName = src?.agent?.name || 'DESKTOP-T082T7I';
            const agentIp = src?.agent?.ip ? ` (${src.agent.ip})` : '';
            const affectedAsset = `${agentName}${agentIp}`;
            const mitre = getMitreInfo(src);
            const override = incidentStateOverrides[docId];

            return {
                id: `INC-${new Date(src.timestamp || Date.now()).getFullYear()}-${(1000 + index).toString()}`,
                title: src?.rule?.description || 'Security Incident Flagged by Wazuh SIEM',
                severity,
                status: override?.status || (index === 0 ? 'investigating' : 'new'),
                mitre_tactic: mitre.tactic,
                mitre_technique: mitre.technique,
                affected_assets: [affectedAsset],
                assigned_analyst: index % 2 === 0 ? 'RayneOps' : 'Unassigned',
                opened_at: src.timestamp ? new Date(src.timestamp).toLocaleString() : new Date().toLocaleString(),
                updated_at: src.timestamp ? new Date(src.timestamp).toLocaleString() : new Date().toLocaleString(),
                summary: src.full_log || `Alert triggered by rule ${src?.rule?.id ?? 'N/A'}. Source IP: ${src?.data?.srcip || 'internal'}. Severity Level: ${level}/15.`,
                source_alert_id: docId,
                rule_id: src?.rule?.id,
                sla_remaining: severity === 'critical' ? '00:45:00' : severity === 'high' ? '02:00:00' : '04:00:00',
                timeline: [
                    {
                        id: 't-1',
                        timestamp: src.timestamp ? new Date(src.timestamp).toLocaleTimeString() : '12:00:00',
                        actor: 'Wazuh SIEM Engine',
                        action: 'Alert Ingested & Escalated to Incident',
                        detail: `Rule ID: ${src?.rule?.id || 'N/A'} (Level ${level}) triggered on agent ${agentName}.`
                    }
                ],
                containment_actions: override?.containment || [
                    { id: 'c-1', label: `Isolate Endpoint (${agentName})`, status: 'pending', completed_at: null },
                    { id: 'c-2', label: 'Revoke compromised active sessions', status: 'pending', completed_at: null },
                    { id: 'c-3', label: 'Block Inbound Source IP on Edge Firewall', status: 'pending', completed_at: null }
                ],
                notes: override?.notes || [],
                source: 'wazuh'
            };
        });

        // Computed metrics summary
        const summary = {
            total: incidents.length,
            critical: incidents.filter((i) => i.severity === 'critical').length,
            investigating: incidents.filter((i) => i.status === 'investigating').length,
            resolved: incidents.filter((i) => i.status === 'resolved').length,
        };

        res.json({ incidents, summary });
    } catch (err: any) {
        console.error('Incidents route failure:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch incident queue' });
    }
});

// POST /api/incidents — create a new incident. Uses TheHive when configured (a real, persisted
// case); otherwise there is no durable store to create into today, so this reports that plainly
// rather than pretending to create something that vanishes on the next restart.
router.post('/', async (req: Request, res: Response) => {
    const { title, description, severity, tags } = req.body ?? {};
    if (!title) {
        res.status(400).json({ error: 'title is required' });
        return;
    }

    if (isTheHiveConfigured()) {
        const newCase = await createCase({ title, description, severity, tags });
        if (!newCase) {
            res.status(502).json({ error: 'TheHive case creation failed — see server logs' });
            return;
        }
        const incident = formatCaseForNovrSOC(newCase);
        notifyShuffleOfIncident(incident); // fire-and-forget, never blocks the response
        res.status(201).json(incident);
        return;
    }

    res.status(501).json({
        error: 'No incident store configured for creation — TheHive is not configured (THEHIVE_URL/THEHIVE_USER/THEHIVE_PASSWORD), and the Wazuh-derived queue above is read-only (incidents there are generated from alerts, not created directly).',
    });
});

// PATCH /api/incidents/:id (Update status)
router.patch('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!incidentStateOverrides[id]) {
        incidentStateOverrides[id] = { status, notes: [], containment: [] };
    } else {
        incidentStateOverrides[id].status = status;
    }
    res.json({ success: true, id, status });
});

// POST /api/incidents/:id/notes
router.post('/:id/notes', (req: Request, res: Response) => {
    const { id } = req.params;
    const { author, type, text } = req.body;
    const note: AnalystNote = {
        id: `note-${Date.now()}`,
        author: author || 'Security Analyst',
        type: type || 'Update',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (!incidentStateOverrides[id]) {
        incidentStateOverrides[id] = { status: 'investigating', notes: [note], containment: [] };
    } else {
        incidentStateOverrides[id].notes.push(note);
    }
    res.json({ success: true, note });
});

export default router;