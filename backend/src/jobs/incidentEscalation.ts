// Escalates HIGH/CRITICAL TheHive cases that haven't been resolved within their SLA window.
// Mirrors jobs/autoClose.ts's shape (run-then-interval, unref(), every error swallowed and
// logged) — see that file's header comment for why this is the established pattern here.
import { getCases, isTheHiveConfigured, isTheHiveStatusTerminal, deriveIncidentNumber } from '../services/thehive';
import { sendEscalationEmail } from '../services/email';

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes
const HIGH_MINUTES = Number(process.env.ESCALATION_HIGH_MINUTES) || 120;
const CRITICAL_MINUTES = Number(process.env.ESCALATION_CRITICAL_MINUTES) || 30;
const CISO_EMAIL = process.env.CISO_EMAIL || 'rayne@cybernovr.com';

// Re-sent every tick until the case actually changes state — in-memory de-dup only (same
// trade-off as threatManagement.ts's emailedAlertIds: resets on redeploy, acceptable since a
// stray duplicate email beats silently going quiet after a restart). Keyed by case id + status,
// so an escalation already sent while "InProgress" fires again if it somehow reopens.
const escalatedKeys = new Set<string>();

async function runEscalationCheck(): Promise<void> {
    const cases = await getCases(200);

    for (const c of cases) {
        if (c.severity < 3) continue; // HIGH (3) and CRITICAL (4) only
        if (isTheHiveStatusTerminal(c.status)) continue; // already resolved
        if (!c.assignee) continue; // "Assigned to someone" is a precondition per the spec

        const thresholdMinutes = c.severity === 4 ? CRITICAL_MINUTES : HIGH_MINUTES;
        const openedAt = c._createdAt ?? 0;
        const ageMinutes = (Date.now() - openedAt) / 60000;
        if (!openedAt || ageMinutes < thresholdMinutes) continue;

        const key = `${c._id}:${c.status}`;
        if (escalatedKeys.has(key)) continue;

        const recipients = Array.from(new Set([CISO_EMAIL, c.assignee].filter((e) => e.includes('@'))));
        const severityLabel = c.severity === 4 ? 'critical' : 'high';

        try {
            await sendEscalationEmail({
                to: recipients,
                incident_number: deriveIncidentNumber(c),
                title: c.title,
                severity: severityLabel,
                assignee: c.assignee,
                opened_at: new Date(openedAt).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }) + ' WAT',
            });
            escalatedKeys.add(key);
            console.log(`[Escalation] Sent for case ${c._id}: ${c.title}`);
        } catch (err) {
            console.error(`[Escalation] Failed to send for case ${c._id}:`, err instanceof Error ? err.message : err);
        }
    }
}

export function startEscalationJob(): void {
    if (!isTheHiveConfigured()) {
        console.log('[Escalation] TheHive not configured — job not started');
        return;
    }

    console.log('[Escalation] Job started — checking every 15 minutes');

    const tick = () => {
        runEscalationCheck().catch((err) => {
            console.error('[Escalation] Error:', err instanceof Error ? err.message : err);
        });
    };

    tick();
    setInterval(tick, CHECK_INTERVAL_MS).unref();
}
