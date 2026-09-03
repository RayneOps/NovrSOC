import { Router, Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { search } from '../lib/wazuh-indexer';
import {
    getCases, createCase, getCase, updateCase, getCaseTasks, createTask, getCaseComments, addComment,
    formatCaseForNovrSOC, isTheHiveConfigured, mapNovrSOCStatusToTheHive,
} from '../services/thehive';
import { sendSlackAlert, sendSlackMessage } from '../services/slack';

// A TheHive case id always looks like "~1234567" (confirmed live) — Wazuh-derived incident ids
// look like "INC-2026-1000" (built below). Used to route a given :id to the right backend
// without needing a separate "which source is this" flag anywhere else.
const isTheHiveId = (id: string): boolean => id.startsWith('~');

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

// Fire-and-forget Slack notification on incident creation. sendSlackAlert() already no-ops
// (with its own console.warn) when SLACK_WEBHOOK_URL isn't set, so this only needs to guard
// against the call itself throwing/rejecting — never blocks or fails the creation request.
async function notifySlackOfIncident(incident: { id: string; title: string; severity: string; summary: string }): Promise<void> {
    try {
        await sendSlackAlert({
            title: incident.title,
            severity: incident.severity,
            description: incident.summary || incident.title,
            affected_host: 'See case in NovrSOC',
            incident_id: incident.id,
            detected_at: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }) + ' WAT',
        });
    } catch (err) {
        console.error('[Slack] Incident notification failed (non-fatal):', err instanceof Error ? err.message : err);
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
    // TheHive-backed incidents only — free-form analyst tasks (TheHive's own "Tasks" tab).
    // Wazuh-derived incidents use containment_actions instead (a fixed checklist), so this is
    // left undefined for those rather than populated with an empty array either way.
    tasks?: { _id: string; title: string; description: string; status: string }[];
}

// In-memory note and state store for Wazuh-derived incidents
const incidentStateOverrides: Record<string, { status: any; notes: AnalystNote[]; containment: ContainmentAction[] }> = {};

// Adapts a TheHive case (already run through formatCaseForNovrSOC) onto the same Incident shape
// the Wazuh-derived path below builds, so the frontend's IncidentResponse component can render
// either source without knowing which one it's looking at — formatCaseForNovrSOC's own output
// is missing several fields the frontend's Incident type requires (mitre_tactic,
// affected_assets, timeline, containment_actions, notes), and rendering that mismatch directly
// crashes the UI (e.g. `undefined.join()` on affected_assets). TheHive doesn't have Wazuh's
// MITRE/affected-host/timeline concepts at the case level, so those get honest generic defaults
// rather than fabricated data.
function toWorkbenchIncident(
    c: ReturnType<typeof formatCaseForNovrSOC>,
    extra?: { tasks?: Incident['tasks']; notes?: AnalystNote[] },
): Incident {
    return {
        id: c.id,
        title: c.title,
        severity: c.severity,
        // formatCaseForNovrSOC's 'open'/'investigating'/'resolved' collapses onto the frontend's
        // 5-state union — 'open' reads as 'new' there (TheHive has no separate "acknowledged but
        // not yet started" state, and this UI's own status buttons never target 'open').
        status: c.status === 'open' ? 'new' : c.status,
        mitre_tactic: c.tags.length > 0 ? c.tags.join(', ') : 'N/A',
        mitre_technique: c.thehive_status,
        affected_assets: [],
        assigned_analyst: c.assignee || 'Unassigned',
        opened_at: c.opened_at,
        updated_at: c.updated_at,
        summary: c.summary,
        source_alert_id: c.id,
        timeline: [
            { id: 't-1', timestamp: c.opened_at, actor: 'TheHive', action: 'Case Created', detail: `Case ${c.id} opened in TheHive.` },
        ],
        containment_actions: [],
        notes: extra?.notes ?? [],
        source: 'thehive',
        tasks: extra?.tasks ?? [],
    };
}

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
            const incidents = cases.map((c) => toWorkbenchIncident(formatCaseForNovrSOC(c)));
            res.json({
                incidents,
                summary: {
                    total: incidents.length,
                    critical: incidents.filter((i) => i.severity === 'critical').length,
                    investigating: incidents.filter((i) => i.status === 'investigating').length,
                    resolved: incidents.filter((i) => i.status === 'resolved').length,
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
        notifySlackOfIncident(incident); // fire-and-forget, never blocks the response
        res.status(201).json(incident);
        return;
    }

    res.status(501).json({
        error: 'No incident store configured for creation — TheHive is not configured (THEHIVE_URL/THEHIVE_USER/THEHIVE_PASSWORD), and the Wazuh-derived queue above is read-only (incidents there are generated from alerts, not created directly).',
    });
});

// GET /api/incidents/:id — full detail for the incident workbench (case info + tasks + notes).
// TheHive-backed only: for a Wazuh-derived id (TheHive not configured, or this specific id
// isn't a TheHive case), there's no per-id cache to look up here — GET / re-queries Wazuh fresh
// every time and never stores results by id — so this reports that plainly instead of pretending
// to have a detail view that doesn't exist for that source.
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isTheHiveConfigured() || !isTheHiveId(id)) {
        res.status(404).json({ error: 'Detail view is only available for TheHive-backed incidents right now.' });
        return;
    }

    const [caseData, tasks, comments] = await Promise.all([
        getCase(id),
        getCaseTasks(id),
        getCaseComments(id),
    ]);
    if (!caseData) {
        res.status(404).json({ error: 'Case not found' });
        return;
    }

    res.json(toWorkbenchIncident(formatCaseForNovrSOC(caseData), {
        tasks: tasks.map((t) => ({ _id: t._id, title: t.title, description: t.description ?? '', status: t.status })),
        // TheHive comments aren't tagged with NovrSOC's Update/Evidence/Decision/Escalation
        // taxonomy — 'Update' is the closest neutral default (matches what a note added via the
        // NovrSOC UI without changing the type picker would carry).
        notes: comments.map((c) => ({
            id: c._id,
            author: c.createdBy ?? 'Unknown',
            type: 'Update' as const,
            text: c.message,
            timestamp: c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
        })),
    }));
});

// PATCH /api/incidents/:id (Update status) — real TheHive update for TheHive-backed incidents;
// in-memory override for Wazuh-derived ones, same as before TheHive auth was fixed.
router.patch('/:id', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (isTheHiveConfigured() && isTheHiveId(id)) {
        const theHiveStatus = mapNovrSOCStatusToTheHive(status);
        const updated = await updateCase(id, { status: theHiveStatus, assignee: req.user?.email });
        if (!updated) {
            res.status(502).json({ error: 'TheHive case update failed — see server logs' });
            return;
        }
        // Fire-and-forget, only on an actual resolve — never blocks the response, matches the
        // fire-and-forget notify pattern used on incident creation above.
        if (status?.toLowerCase?.() === 'resolved') {
            sendSlackMessage(`✅ Incident resolved: ${updated.title}`).catch((err) => {
                console.error('[Slack] Resolve notification failed (non-fatal):', err instanceof Error ? err.message : err);
            });
        }
        res.json({ success: true, id, status, thehive_status: theHiveStatus });
        return;
    }

    if (!incidentStateOverrides[id]) {
        incidentStateOverrides[id] = { status, notes: [], containment: [] };
    } else {
        incidentStateOverrides[id].status = status;
    }
    res.json({ success: true, id, status });
});

// POST /api/incidents/:id/notes — a real TheHive comment for TheHive-backed incidents (TheHive
// has a dedicated comment resource; an earlier draft stuffed notes into fake tasks instead —
// see thehive.ts's addComment for why that was wrong). In-memory override otherwise.
router.post('/:id/notes', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { author, type, text, content } = req.body;
    const noteText: string = content ?? text ?? '';
    if (!noteText.trim()) {
        res.status(400).json({ error: 'content required' });
        return;
    }

    if (isTheHiveConfigured() && isTheHiveId(id)) {
        const comment = await addComment(id, noteText);
        if (!comment) {
            res.status(502).json({ error: 'Failed to add note in TheHive — see server logs' });
            return;
        }
        res.json({
            success: true,
            note: {
                id: comment._id,
                author: comment.createdBy ?? req.user?.email ?? 'Security Analyst',
                type: type || 'Note',
                text: comment.message,
                timestamp: comment.createdAt ? new Date(comment.createdAt).toLocaleString() : new Date().toLocaleString(),
            },
        });
        return;
    }

    const note: AnalystNote = {
        id: `note-${Date.now()}`,
        author: author || 'Security Analyst',
        type: type || 'Update',
        text: noteText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (!incidentStateOverrides[id]) {
        incidentStateOverrides[id] = { status: 'investigating', notes: [note], containment: [] };
    } else {
        incidentStateOverrides[id].notes.push(note);
    }
    res.json({ success: true, note });
});

// POST /api/incidents/:id/tasks — TheHive-backed only. There's no non-TheHive concept of a
// case task in this codebase (the Wazuh-derived path has containment_actions instead, a fixed
// checklist, not free-form analyst-added tasks), so this is honest about the requirement rather
// than half-building a parallel in-memory task system for a source that doesn't have the concept.
router.post('/:id/tasks', async (req: Request, res: Response) => {
    if (!isTheHiveConfigured()) {
        res.status(503).json({ error: 'TheHive not configured' });
        return;
    }
    const { id } = req.params;
    const { title, description } = req.body;
    if (!title) {
        res.status(400).json({ error: 'title required' });
        return;
    }

    const task = await createTask(id, { title, description });
    if (!task) {
        res.status(502).json({ error: 'Failed to add task in TheHive — see server logs' });
        return;
    }
    res.json({ success: true, task: { _id: task._id, title: task.title, description: task.description ?? '', status: task.status } });
});

export default router;