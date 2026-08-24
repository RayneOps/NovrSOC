import { Router } from 'express';

// SecOps shift handover log — in-memory demo store, same pattern as routes/incidentResponse.ts
// and routes/threatManagement.ts (this whole backend doesn't have per-user auth or a durable
// events table yet). NOT the Supabase `handover_logs` table an earlier draft of this feature
// assumed exists — it doesn't (see db/rls-policies.sql's comment: only 8 real tables exist,
// none of them this). Logs here persist for the life of this backend process and are visible
// to every analyst hitting it, which is a real step up from a client-only mock, but they do
// NOT survive a backend restart/redeploy. Swap this for a real table + query once one exists.

const router = Router();

interface HandoverLog {
    id: string;
    shift_start: string;
    shift_end: string;
    analyst_on: string;
    analyst_off: string;
    alerts_received: number;
    alerts_resolved: number;
    alerts_pending: number;
    critical_incidents: string[];
    ongoing_incidents: string[];
    watch_items: string;
    notes: string;
    submitted_at: string;
}

const handoverLogs: HandoverLog[] = [];

router.get('/', (_req, res) => {
    res.json({ logs: [...handoverLogs].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)) });
});

router.post('/', (req, res) => {
    const {
        shift_start, shift_end, analyst_on, analyst_off,
        alerts_received, alerts_resolved, alerts_pending,
        critical_incidents, ongoing_incidents, watch_items, notes,
    }: Partial<HandoverLog> = req.body ?? {};

    if (!analyst_on || !analyst_off || !shift_start || !shift_end) {
        res.status(400).json({ error: 'shift_start, shift_end, analyst_on, and analyst_off are required' });
        return;
    }

    const log: HandoverLog = {
        id: `HO-${Date.now()}`,
        shift_start, shift_end, analyst_on, analyst_off,
        alerts_received: alerts_received ?? 0,
        alerts_resolved: alerts_resolved ?? 0,
        alerts_pending: alerts_pending ?? 0,
        critical_incidents: critical_incidents ?? [],
        ongoing_incidents: ongoing_incidents ?? [],
        watch_items: watch_items ?? '',
        notes: notes ?? '',
        submitted_at: new Date().toISOString(),
    };
    handoverLogs.push(log);
    res.json({ success: true, log });
});

export default router;
