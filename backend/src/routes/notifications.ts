import { Router } from 'express';
import { search } from '../lib/wazuh-indexer';
import { getCases, isTheHiveConfigured, deriveIncidentNumber } from '../services/thehive';

// Not gated with requireAuth — Header.tsx (which polls this) is shared by both the admin app
// and the client portal, and client-portal users carry a portal_token this backend's
// requireAuth can't verify (see index.ts's block comment on the same constraint for
// /api/incidents, /api/wazuh, etc.). Same open-by-necessity category as those routes.

const router = Router();

interface IndexerAlertHit {
    _id: string;
    _source?: {
        timestamp?: string;
        rule?: { level?: number; description?: string };
        agent?: { name?: string };
        data?: { srcip?: string };
    };
}
interface IndexerSearchResponse { hits?: { hits?: IndexerAlertHit[] } }

interface Notification {
    id: string;
    type: 'alert' | 'case';
    severity: 'medium' | 'high';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

// GET /api/notifications — medium-severity (level 7-9) Wazuh alerts from the last 24h, plus the
// most recently-touched TheHive cases. MEDIUM alerts land here and only here — no email, per
// the Security Operations redesign spec (HIGH/CRITICAL email via routes/threatManagement.ts's
// notifyCriticalAlerts instead).
router.get('/', async (_req, res) => {
    const notifications: Notification[] = [];

    try {
        const result = await search<IndexerSearchResponse>('wazuh-alerts-4.x-*', {
            size: 20,
            sort: [{ timestamp: { order: 'desc' } }],
            query: { bool: { must: [{ range: { 'rule.level': { gte: 7, lt: 10 } } }, { range: { timestamp: { gte: 'now-24h' } } }] } },
        });
        const hits = result?.hits?.hits ?? [];
        for (const h of hits) {
            const src = h._source ?? {};
            notifications.push({
                id: h._id,
                type: 'alert',
                severity: 'medium',
                title: src.rule?.description ?? 'Wazuh alert',
                message: `Agent: ${src.agent?.name ?? 'Unknown'} • ${src.data?.srcip ?? 'No IP'}`,
                time: src.timestamp ?? new Date().toISOString(),
                read: false,
            });
        }
    } catch (err) {
        console.error('[notifications] Wazuh alert fetch failed:', err instanceof Error ? err.message : err);
    }

    if (isTheHiveConfigured()) {
        try {
            const cases = await getCases(5);
            for (const c of cases) {
                notifications.push({
                    id: c._id,
                    type: 'case',
                    severity: c.severity >= 3 ? 'high' : 'medium',
                    title: c.title,
                    message: `Case ${deriveIncidentNumber(c)} — ${c.stage ?? c.status ?? 'New'}`,
                    time: c._createdAt ? new Date(c._createdAt).toISOString() : new Date().toISOString(),
                    read: false,
                });
            }
        } catch (err) {
            console.error('[notifications] TheHive case fetch failed:', err instanceof Error ? err.message : err);
        }
    }

    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    res.json({ notifications, unread: notifications.filter((n) => !n.read).length });
});

export default router;
